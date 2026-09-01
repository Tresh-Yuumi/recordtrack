import crypto from 'node:crypto'
import { requireAdmin } from './_lib/auth.js'
import { APP_USER_ID, ensureServerConfig, supabaseAdmin } from './_lib/supabase-admin.js'

const EVENT_FIELDS = [
  'artist_ids', 'artist_id', 'title', 'type', 'category', 'is_all_day',
  'start_date', 'end_date', 'start_time', 'end_time', 'location', 'notes', 'hashtags', 'image_urls', 'card_image_url',
]

function normalizeHashtags(value) {
  if (!Array.isArray(value)) return []
  return [...new Set(value
    .map((tag) => String(tag).trim().replace(/^#+/, '').replace(/[^\p{L}\p{M}\p{N}_]/gu, ''))
    .filter(Boolean))].slice(0, 10)
}

function normalizeEventPayload(source = {}) {
  const result = pick(source, EVENT_FIELDS)
  if (source.hashtags !== undefined) result.hashtags = normalizeHashtags(source.hashtags)
  return result
}

function pick(source, fields) {
  return Object.fromEntries(fields.filter((field) => source[field] !== undefined).map((field) => [field, source[field]]))
}

async function execute(action, payload = {}) {
  ensureServerConfig()

  if (action === 'createEvent') {
    const { data, error } = await supabaseAdmin.from('events')
      .insert({ ...normalizeEventPayload(payload), user_id: APP_USER_ID }).select('*').single()
    if (error) throw error
    return data
  }

  if (action === 'updateEvent') {
    const { data, error } = await supabaseAdmin.from('events')
      .update(normalizeEventPayload(payload.updates || {}))
      .eq('id', payload.id).eq('user_id', APP_USER_ID).select('*').single()
    if (error) throw error
    return data
  }

  if (action === 'deleteEvent') {
    const { error } = await supabaseAdmin.from('events').delete()
      .eq('id', payload.id).eq('user_id', APP_USER_ID)
    if (error) throw error
    return { ok: true }
  }

  if (action === 'createImageUpload') {
    const extension = String(payload.extension || 'jpg').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'jpg'
    const filePath = `public/${Date.now()}_${crypto.randomUUID()}.${extension}`
    const { data, error } = await supabaseAdmin.storage.from('event-images').createSignedUploadUrl(filePath)
    if (error) throw error
    const { data: publicData } = supabaseAdmin.storage.from('event-images').getPublicUrl(filePath)
    return { path: filePath, token: data.token, publicUrl: publicData.publicUrl }
  }

  if (action === 'deleteImage') {
    const path = String(payload.path || '')
    if (!path.startsWith('public/')) throw new Error('图片路径无效')
    const { error } = await supabaseAdmin.storage.from('event-images').remove([path])
    if (error) throw error
    return { ok: true }
  }

  if (action === 'importData') {
    const backup = payload.backup
    if (!Array.isArray(backup?.artists) || !Array.isArray(backup?.events)) throw new Error('备份文件格式无效')
    const artists = backup.artists.map((artist) => ({ ...artist, user_id: APP_USER_ID }))
    const events = backup.events.map((event) => ({
      ...event,
      hashtags: normalizeHashtags(event.hashtags),
      user_id: APP_USER_ID,
    }))
    const { error: artistError } = await supabaseAdmin.from('artists').upsert(artists, { onConflict: 'id' })
    if (artistError) throw artistError
    const { error: eventError } = await supabaseAdmin.from('events').upsert(events, { onConflict: 'id' })
    if (eventError) throw eventError
    return { artistCount: artists.length, eventCount: events.length }
  }

  throw new Error('未知管理操作')
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!requireAdmin(req, res)) return

  try {
    const data = await execute(req.body?.action, req.body?.payload)
    return res.status(200).json({ data })
  } catch (error) {
    return res.status(400).json({ error: error.message || '操作失败' })
  }
}
