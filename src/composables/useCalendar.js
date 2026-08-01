import { ref } from 'vue'
import { supabase, MY_USER_ID } from '../lib/supabase.js'
import { adminRequest } from '../lib/adminApi.js'

/* ================================================================
 *  useCalendar — 封装所有数据库操作、图片上传、JSON 导入导出
 * ================================================================ */

export function useCalendar() {
  const loading = ref(false)

  // ────────────────── 艺人 ──────────────────

  async function fetchArtists() {
    loading.value = true
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .eq('user_id', MY_USER_ID)
      .order('name')
    loading.value = false
    if (error) throw error
    return data
  }

  async function addArtist(artist) {
    const { data, error } = await supabase
      .from('artists')
      .insert({ ...artist, user_id: MY_USER_ID })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function updateArtist(id, updates) {
    const { data, error } = await supabase
      .from('artists')
      .update(updates)
      .eq('id', id)
      .eq('user_id', MY_USER_ID)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function deleteArtist(id) {
    const { error } = await supabase
      .from('artists')
      .delete()
      .eq('id', id)
      .eq('user_id', MY_USER_ID)
    if (error) throw error
  }

  // ────────────────── 行程 ──────────────────

  async function fetchEvents() {
    loading.value = true
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', MY_USER_ID)
      .order('start_date', { ascending: true })
      .order('start_time', { ascending: true, nullsFirst: true })
    loading.value = false
    if (error) throw error
    return data
  }

  async function fetchEventsByArtist(artistId) {
    loading.value = true
    let query = supabase
      .from('events')
      .select('*')
      .eq('user_id', MY_USER_ID)
      .order('start_date', { ascending: true })
      .order('start_time', { ascending: true, nullsFirst: true })
    if (artistId) {
      // 使用 contains 查询 UUID[] 数组
      query = query.contains('artist_ids', [artistId])
    }
    const { data, error } = await query
    loading.value = false
    if (error) throw error
    return data
  }

  async function addEvent(event) {
    return adminRequest('createEvent', event)
  }

  async function updateEvent(id, updates) {
    return adminRequest('updateEvent', { id, updates })
  }

  async function deleteEvent(id) {
    return adminRequest('deleteEvent', { id })
  }

  // ────────────────── 图片上传 ──────────────────

  async function uploadImage(file) {
    const fileExt = file.name.split('.').pop()
    const signed = await adminRequest('createImageUpload', { extension: fileExt })
    const { error } = await supabase.storage
      .from('event-images')
      .uploadToSignedUrl(signed.path, signed.token, file)
    if (error) throw error
    return signed.publicUrl
  }

  async function removeImage(url) {
    const pathMatch = url.match(/event-images\/(.+)$/)
    if (!pathMatch) return
    await adminRequest('deleteImage', { path: pathMatch[1] })
  }

  // ────────────────── JSON 导出 / 导入 ──────────────────

  async function exportData() {
    loading.value = true
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', MY_USER_ID)
    const { data: artists } = await supabase
      .from('artists')
      .select('*')
      .eq('user_id', MY_USER_ID)
    loading.value = false

    const exportObj = { events, artists, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `record-track-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function importData(jsonFile) {
    loading.value = true
    const text = await jsonFile.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      loading.value = false
      throw new Error('JSON 格式无效')
    }

    // 验证必要字段
    if (!data.events || !data.artists) {
      loading.value = false
      throw new Error('备份文件缺少 events 或 artists 数据')
    }

    try {
      return await adminRequest('importData', { backup: data })
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    // 艺人
    fetchArtists, addArtist, updateArtist, deleteArtist,
    // 行程
    fetchEvents, fetchEventsByArtist, addEvent, updateEvent, deleteEvent,
    // 图片
    uploadImage, removeImage,
    // 导入导出
    exportData, importData,
  }
}
