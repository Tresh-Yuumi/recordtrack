<template>
  <n-config-provider :locale="zhCN" :theme-overrides="themeOverrides">
    <div v-if="accessMode === 'landing'" class="entry-page">
      <section class="entry-card">
        <div class="entry-icon">📅</div>
        <h1>RecordTrack</h1>
        <p>请选择访问方式</p>
        <n-button size="large" block @click="enterViewer">
          <span class="entry-button-text"><b>👀 查看行程</b><small>无需密码，仅浏览行程</small></span>
        </n-button>
        <n-button type="primary" size="large" block @click="showLogin = true">
          <span class="entry-button-text"><b>🔐 管理行程</b><small>输入密码，可新增、编辑和删除</small></span>
        </n-button>
      </section>
    </div>

    <div v-else class="app-wrapper">
      <header class="app-header">
        <h1 class="app-title">📅 RecordTrack</h1>
        <div class="header-actions">
          <n-tag size="small" :type="isAdmin ? 'success' : 'default'">
            {{ isAdmin ? '管理模式' : '查看模式' }}
          </n-tag>
          <template v-if="isAdmin">
            <n-button class="desktop-only" type="primary" size="small" @click="openCreate(todayLocal())" @mouseenter="preloadEventModal">
              ➕ <span class="button-label">新增行程</span>
            </n-button>
            <n-button class="desktop-only" size="small" @click="quickEntryVisible = true">⚡ 快速录入</n-button>
            <n-button class="desktop-only" size="small" @click="handleLogout">退出管理</n-button>
            <n-button class="mobile-only" size="small" @click="handleLogout">退出</n-button>
          </template>
          <n-button v-else type="primary" size="small" @click="showLogin = true">🔐 管理</n-button>
        </div>
      </header>


      <section class="filter-bar">
        <div class="filter-row">
          <div class="artist-filters" aria-label="筛选艺人">
            <n-tag :type="!activeFilter ? 'primary' : 'default'" size="small" class="filter-tag" @click="activeFilter = null">全部</n-tag>
            <n-tag
              v-for="artist in artists" :key="artist.id" size="small" class="filter-tag"
              :type="activeFilter === artist.id ? 'primary' : 'default'"
              :bordered="activeFilter !== artist.id"
              :style="{ opacity: activeFilter && activeFilter !== artist.id ? 0.45 : 1 }"
              @click="toggleFilter(artist.id)"
            >{{ artist.emoji || '' }} {{ artist.name }}</n-tag>
          </div>
          <n-space :size="6" class="view-switch">
            <n-button :type="viewMode === 'calendar' ? 'primary' : 'default'" size="tiny" @click="viewMode = 'calendar'">📅 日历</n-button>
            <n-button :type="viewMode === 'list' ? 'primary' : 'default'" size="tiny" @click="viewMode = 'list'">📋 列表</n-button>
          </n-space>
        </div>
      </section>

      <main class="content-area" @mouseenter="preloadEventModal">
        <CalendarView
          v-if="viewMode === 'calendar'" :events="filteredEvents" :artists="artists" :loading="loading"
          @date-click="handleDateClick" @event-click="openDetail"
        />
        <EventListView v-else :events="filteredEvents" :artists="artists" @event-click="openDetail" />
      </main>

      <section v-if="isAdmin" class="data-management">
        <n-text class="data-management-title" depth="3">数据管理</n-text>
        <n-space :size="8">
          <n-button size="small" @click="handleExport" :loading="loading">📥 导出备份</n-button>
          <n-upload :show-file-list="false" accept=".json" :custom-request="handleImport">
            <n-button size="small" :loading="loading">📤 导入备份</n-button>
          </n-upload>
        </n-space>
      </section>

      <div v-if="isAdmin && !modalVisible && !quickEntryVisible" class="mobile-fab-group">
        <button class="mobile-fab mobile-fab-quick" aria-label="快速录入" @click="quickEntryVisible = true">⚡</button>
        <button class="mobile-fab mobile-fab-add" aria-label="新增行程" @click="openCreate(todayLocal())">＋</button>
      </div>

      <EventModal
        :show="modalVisible" :mode="modalMode" :artists="artists" :edit-data="selectedEvent" :can-edit="isAdmin"
        @update:show="modalVisible = $event" @mode-change="modalMode = $event"
        @submit="handleSubmit" @delete="handleDelete" @upload="handleImageUpload"
      />

      <QuickEntryModal
        :show="quickEntryVisible" :artists="artists" :events="events"
        @update:show="quickEntryVisible = $event" @submit="handleQuickEntrySubmit"
      />

    </div>

    <n-modal v-model:show="showLogin" preset="card" title="进入管理模式" class="login-modal" :mask-closable="false">
      <n-input
        v-model:value="adminPassword" type="password" show-password-on="mousedown"
        placeholder="请输入管理密码" :disabled="loginLoading" @keyup.enter="handleLogin"
      />
      <template #footer>
        <n-space justify="end">
          <n-button @click="showLogin = false">取消</n-button>
          <n-button type="primary" :loading="loginLoading" @click="handleLogin">进入管理模式</n-button>
        </n-space>
      </template>
    </n-modal>
  </n-config-provider>
</template>

<script setup>
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import { NConfigProvider, NButton, NSpace, NTag, NUpload, NModal, NInput, createDiscreteApi, zhCN } from 'naive-ui'
import EventListView from './components/EventListView.vue'
import { useCalendar } from './composables/useCalendar.js'
import { getAdminSession, loginAdmin, logoutAdmin } from './lib/adminApi.js'

const props = defineProps({ initialMode: { type: String, default: 'viewer' } })
const CalendarView = defineAsyncComponent(() => import('./components/CalendarView.vue'))
const EventModal = defineAsyncComponent(() => import('./components/EventModal.vue'))
const preloadEventModal = () => import('./components/EventModal.vue')
const QuickEntryModal = defineAsyncComponent(() => import('./components/QuickEntryModal.vue'))
const { message, dialog } = createDiscreteApi(['message', 'dialog'])
const { loading, fetchArtists, addEvent, updateEvent, deleteEvent, fetchEvents, uploadImage, exportData, importData } = useCalendar()

const artists = ref([])
const events = ref([])
const activeFilter = ref(null)
const modalVisible = ref(false)
const modalMode = ref('create')
const selectedEvent = ref(null)
const accessMode = ref(props.initialMode === 'admin' ? 'landing' : 'viewer')
const quickEntryVisible = ref(false)
const showLogin = ref(props.initialMode === 'admin')
const adminPassword = ref('')
const loginLoading = ref(false)
const viewMode = ref(window.matchMedia('(max-width: 767px)').matches ? 'list' : 'calendar')
const isAdmin = computed(() => accessMode.value === 'admin')
const ADMIN_SESSION_CACHE_KEY = 'record-track-admin-session'
const ADMIN_SESSION_CACHE_TTL = 5 * 60 * 1000

function readAdminSessionCache() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(ADMIN_SESSION_CACHE_KEY) || 'null')
    if (!cached || Date.now() - cached.checkedAt > ADMIN_SESSION_CACHE_TTL) return null
    return Boolean(cached.isAdmin)
  } catch {
    return null
  }
}

function writeAdminSessionCache(isAdmin) {
  try {
    sessionStorage.setItem(ADMIN_SESSION_CACHE_KEY, JSON.stringify({
      isAdmin: Boolean(isAdmin),
      checkedAt: Date.now(),
    }))
  } catch {
    // 浏览器禁用会话存储时不影响正常使用。
  }
}

async function restoreAdminSession() {
  const cached = readAdminSessionCache()
  if (cached !== null) {
    if (cached) {
      accessMode.value = 'admin'
      showLogin.value = false
    }
    return
  }
  const admin = await getAdminSession({ timeoutMs: 2500 })
  writeAdminSessionCache(admin)
  if (admin) {
    accessMode.value = 'admin'
    showLogin.value = false
  }
}


const filteredEvents = computed(() => {
  if (!activeFilter.value) return events.value
  return events.value.filter((event) => {
    const ids = event.artist_ids?.length ? event.artist_ids : (event.artist_id ? [event.artist_id] : [])
    return ids.includes(activeFilter.value)
  })
})

onMounted(async () => {
  if (new URLSearchParams(location.search).get('mode') === 'view') accessMode.value = 'viewer'
  await Promise.allSettled([
    loadData(),
    props.initialMode === 'admin' ? restoreAdminSession() : Promise.resolve(),
  ])
})

async function loadData() {
  try {
    const [artistData, eventData] = await Promise.all([fetchArtists(), fetchEvents()])
    artists.value = artistData
    events.value = eventData
  } catch (error) {
    message.error('加载数据失败：' + error.message)
  }
}

function enterViewer() { accessMode.value = 'viewer' }
function todayLocal() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}
function toggleFilter(id) { activeFilter.value = activeFilter.value === id ? null : id }
function handleDateClick(date) { if (isAdmin.value) openCreate(date) }

function openCreate(date) {
  if (!isAdmin.value) return
  selectedEvent.value = { start_date: date, end_date: date, is_all_day: false, artist_ids: [], image_urls: [] }
  modalMode.value = 'create'
  modalVisible.value = true
}

function openDetail(event) {
  selectedEvent.value = event.extendedProps || event
  modalMode.value = 'detail'
  modalVisible.value = true
}

async function handleLogin() {
  if (!adminPassword.value) return message.warning('请输入管理密码')
  loginLoading.value = true
  try {
    await loginAdmin(adminPassword.value)
    writeAdminSessionCache(true)
    accessMode.value = 'admin'
    showLogin.value = false
    adminPassword.value = ''
    message.success('已进入管理模式')
  } catch (error) {
    message.error(error.message)
  } finally { loginLoading.value = false }
}

async function handleLogout() {
  writeAdminSessionCache(false)
  await logoutAdmin()
  accessMode.value = 'viewer'
  modalVisible.value = false
  message.success('已退出管理模式')
}

async function handleSubmit(payload) {
  if (!isAdmin.value) return
  try {
    if (modalMode.value === 'create') {
      await addEvent(payload)
      message.success('行程已创建')
    } else {
      await updateEvent(selectedEvent.value.id, payload)
      message.success('行程已更新')
    }
    modalVisible.value = false
    events.value = await fetchEvents()
  } catch (error) {
    if (error.status === 401) accessMode.value = 'viewer'
    message.error('操作失败：' + error.message)
  }
}


async function handleQuickEntrySubmit(payloads, done) {
  if (!isAdmin.value) return done(false)
  let created = 0
  try {
    for (const payload of payloads) {
      await addEvent(payload)
      created += 1
    }
    events.value = await fetchEvents()
    message.success(`成功创建 ${created} 条行程`)
    done(true)
  } catch (error) {
    events.value = await fetchEvents()
    if (error.status === 401) accessMode.value = 'viewer'
    message.error(`已创建 ${created} 条，后续保存失败：${error.message}`)
    done(false)
  }
}
function handleDelete(eventId) {
  if (!isAdmin.value) return
  dialog.warning({
    title: '确认删除行程', content: `确定删除“${selectedEvent.value?.title || '该行程'}”吗？此操作无法撤销。`,
    positiveText: '删除', negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deleteEvent(eventId)
        modalVisible.value = false
        events.value = await fetchEvents()
        message.success('行程已删除')
      } catch (error) { message.error('删除失败：' + error.message) }
    },
  })
}

async function handleImageUpload(file, callback) {
  try { callback(await uploadImage(file)); message.success('图片上传成功') }
  catch (error) { message.error('图片上传失败：' + error.message) }
}
async function handleExport() {
  try { await exportData(); message.success('备份导出成功') }
  catch (error) { message.error('导出失败：' + error.message) }
}
async function handleImport({ file }) {
  try {
    const result = await importData(file.file)
    message.success(`导入成功！${result.artistCount} 位艺人，${result.eventCount} 条行程`)
    await loadData()
  } catch (error) { message.error('导入失败：' + error.message) }
}

const themeOverrides = { common: { primaryColor: '#FF6B6B', primaryColorHover: '#FF8787' } }
</script>

<style>
* { box-sizing: border-box; }
body { margin: 0; font-family: 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', sans-serif; background: #f5f6fa; color: #333; }
.entry-page { min-height: 100dvh; display: grid; place-items: center; padding: 24px; background: linear-gradient(145deg, #fff7f7, #f5f6fa); }
.entry-card { width: min(100%, 380px); padding: clamp(28px, 8vw, 48px); background: #fff; border-radius: 20px; box-shadow: 0 12px 40px rgba(0,0,0,.08); text-align: center; }
.entry-icon { font-size: 42px; }.entry-card h1 { margin: 8px 0 4px; }.entry-card p { color: #999; margin: 0 0 28px; }
.entry-card .n-button { height: auto; min-height: 62px; margin-top: 12px; }
.entry-button-text { display: flex; flex-direction: column; gap: 3px; }.entry-button-text small { font-weight: 400; opacity: .72; }
.app-wrapper { max-width: 1200px; margin: 0 auto; padding: 16px clamp(10px, 3vw, 20px); min-height: 100vh; }
.app-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.app-title { margin: 0; font-size: clamp(18px, 4vw, 24px); white-space: nowrap; }.header-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
.filter-bar, .content-area { background: #fff; border-radius: 10px; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
.filter-bar { margin-bottom: 16px; padding: 12px 16px; }.content-area { padding: clamp(8px, 2vw, 16px); }
.filter-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.artist-filters { display: flex; align-items: center; gap: 8px; min-width: 0; overflow-x: auto; scrollbar-width: none; padding: 2px; }.artist-filters::-webkit-scrollbar { display: none; }
.filter-tag { flex: 0 0 auto; cursor: pointer; min-height: 30px; align-items: center; }.view-switch { flex: 0 0 auto; }
.mobile-only, .mobile-fab-group { display: none; }.login-modal { width: min(90vw, 420px); }
.data-management { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; padding: 12px 16px; background: #fff; border-radius: 10px; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
.data-management-title { flex: 0 0 auto; font-size: 13px; }
@media (max-width: 767px) {
  .app-wrapper { padding-top: max(10px, env(safe-area-inset-top)); padding-bottom: calc(84px + env(safe-area-inset-bottom)); }
  .app-header { position: sticky; top: 0; z-index: 20; background: rgba(245,246,250,.94); backdrop-filter: blur(10px); padding: 6px 0 8px; }
  .button-label, .desktop-only { display: none !important; }.header-actions { gap: 6px; }
  .mobile-only { display: inline-flex; }
  .filter-bar { padding: 10px; margin-bottom: 10px; }.filter-row { flex-direction: column; align-items: stretch; gap: 9px; }
  .artist-filters { margin-inline: -2px; }.view-switch { align-self: center; }
  .content-area { border-radius: 8px; }
  .data-management { align-items: flex-start; flex-direction: column; padding: 10px 12px; }
  .mobile-fab-group { display: flex; align-items: center; gap: 10px; position: fixed; right: max(18px, env(safe-area-inset-right)); bottom: calc(18px + env(safe-area-inset-bottom)); z-index: 30; }
  .mobile-fab { display: grid; place-items: center; border: 0; border-radius: 50%; cursor: pointer; }
  .mobile-fab-quick { width: 48px; height: 48px; background: #fff; color: #ff6b6b; font-size: 21px; box-shadow: 0 6px 20px rgba(0,0,0,.16); }
  .mobile-fab-add { width: 56px; height: 56px; background: #ff6b6b; color: #fff; font-size: 30px; box-shadow: 0 8px 24px rgba(255,107,107,.4); }
}
@media (max-width: 360px) { .app-title { font-size: 17px; }.header-actions { gap: 4px; }.header-actions .n-tag { display: none; } }
@media (max-height: 500px) and (orientation: landscape) { .app-header { position: static; }.app-wrapper { padding-bottom: 60px; } }
</style>
