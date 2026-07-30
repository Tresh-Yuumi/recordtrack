<template>
  <n-config-provider :locale="zhCN" :theme-overrides="themeOverrides">
    <div class="app-wrapper">
      <!-- ========== 顶部栏 ========== -->
      <header class="app-header">
        <div class="header-left">
          <h1 class="app-title">📅 RecordTrack</h1>
        </div>
        <div class="header-right">
          <n-space>
            <n-button type="primary" size="small" @click="openCreate(new Date().toISOString().slice(0, 10))" @mouseenter="preloadEventModal">
              <template #icon>➕</template> 新增行程
            </n-button>
            <n-button size="small" @click="handleExport" :loading="loading">
              <template #icon>📥</template> 导出备份
            </n-button>
            <n-upload
              :show-file-list="false"
              accept=".json"
              :custom-request="handleImport"
            >
              <n-button size="small" :loading="loading">
                <template #icon>📤</template> 导入备份
              </n-button>
            </n-upload>
          </n-space>
        </div>
      </header>

      <!-- ========== 筛选栏：艺人 + 视图切换 ========== -->
      <section class="filter-bar">
        <div class="filter-row">
          <n-space align="center">
            <n-text depth="3" style="font-size: 13px">筛选艺人：</n-text>
            <n-tag
              v-for="artist in artists"
              :key="artist.id"
              :type="activeFilter === artist.id ? 'primary' : 'default'"
              :bordered="activeFilter !== artist.id"
              size="small"
              :style="{
                cursor: 'pointer',
                opacity: activeFilter && activeFilter !== artist.id ? 0.3 : 1,
                borderColor: activeFilter === artist.id ? '#000' : '#ccc',
                color: activeFilter === artist.id ? '#fff' : '#333',
                backgroundColor: activeFilter === artist.id ? '#000' : '#fff',
              }"
              @click="toggleFilter(artist.id)"
            >
              {{ artist.emoji || '' }} {{ artist.name }}
            </n-tag>
            <n-divider vertical />
            <n-tag
              :type="!activeFilter ? 'primary' : 'default'"
              size="small"
              style="cursor: pointer"
              @click="activeFilter = null"
            >
              全部
            </n-tag>
          </n-space>
          <n-space>
            <n-button
              :type="viewMode === 'calendar' ? 'primary' : 'default'"
              size="tiny"
              @click="viewMode = 'calendar'"
            >📅 日历</n-button>
            <n-button
              :type="viewMode === 'list' ? 'primary' : 'default'"
              size="tiny"
              @click="viewMode = 'list'"
            >📋 列表</n-button>
          </n-space>
        </div>
      </section>

      <!-- ========== 视图区域 ========== -->
      <main class="content-area" @mouseenter="preloadEventModal">
        <CalendarView
          v-if="viewMode === 'calendar'"
          :events="filteredEvents"
          :artists="artists"
          :loading="loading"
          @date-click="openCreate"
          @event-click="openDetail"
        />
        <EventListView
          v-else
          :events="filteredEvents"
          :artists="artists"
          @event-click="openDetail"
        />
      </main>

      <!-- ========== 事件弹窗 ========== -->
      <EventModal
        :show="modalVisible"
        :mode="modalMode"
        :artists="artists"
        :edit-data="selectedEvent"
        @update:show="modalVisible = $event"
        @mode-change="modalMode = $event"
        @submit="handleSubmit"
        @delete="handleDelete"
        @upload="handleImageUpload"
      />
    </div>
  </n-config-provider>
</template>

<script setup>
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import {
  NConfigProvider, NButton, NSpace, NTag, NDivider, NText, NUpload,
  createDiscreteApi,
} from 'naive-ui'
import { zhCN } from 'naive-ui'
import CalendarView from './components/CalendarView.vue'
import EventListView from './components/EventListView.vue'
import { useCalendar } from './composables/useCalendar.js'

// EventModal 懒加载：只在首次打开弹窗时下载
const EventModal = defineAsyncComponent(() => import('./components/EventModal.vue'))

// hover 按钮时预加载，确保首次点击已就绪
function preloadEventModal() {
  import('./components/EventModal.vue')
}

const { message } = createDiscreteApi(['message'])

const {
  loading,
  fetchArtists, addEvent, updateEvent, deleteEvent,
  fetchEvents, uploadImage, exportData, importData,
} = useCalendar()

// ── 数据 ──
const artists = ref([])
const events = ref([])
const activeFilter = ref(null)

// ── 弹窗状态 ──
const modalVisible = ref(false)
const modalMode = ref('create')
const selectedEvent = ref(null)
const viewMode = ref('calendar')  // 'calendar' | 'list'

// ── 筛选后的事件 ──
const filteredEvents = computed(() => {
  if (!activeFilter.value) return events.value
  return events.value.filter((e) => {
    // 兼容新旧格式：artist_ids 数组 或 旧 artist_id 单值
    const ids = e.artist_ids?.length ? e.artist_ids : (e.artist_id ? [e.artist_id] : [])
    return ids.includes(activeFilter.value)
  })
})

// ── 初始化 ──
onMounted(async () => {
  try {
    const [artistData, eventData] = await Promise.all([
      fetchArtists(),
      fetchEvents(),
    ])
    artists.value = artistData
    events.value = eventData
  } catch (e) {
    message.error('加载数据失败：' + e.message)
  }
})

// ── 筛选 ──
function toggleFilter(artistId) {
  activeFilter.value = activeFilter.value === artistId ? null : artistId
}

// ── 弹窗操作 ──
function openCreate(dateStr) {
  selectedEvent.value = {
    start_date: dateStr,
    end_date: dateStr,
    is_all_day: false,
    artist_ids: [],
    image_urls: [],
  }
  modalMode.value = 'create'
  modalVisible.value = true
}

function openDetail(calEvent) {
  selectedEvent.value = calEvent.extendedProps
  modalMode.value = 'detail'
  modalVisible.value = true
}

// ── 提交 ──
async function handleSubmit(payload) {
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
  } catch (e) {
    message.error('操作失败：' + e.message)
  }
}

// ── 删除 ──
async function handleDelete(eventId) {
  try {
    await deleteEvent(eventId)
    message.success('行程已删除')
    modalVisible.value = false
    events.value = await fetchEvents()
  } catch (e) {
    message.error('删除失败：' + e.message)
  }
}

// ── 图片上传 ──
async function handleImageUpload(file, callback) {
  try {
    const url = await uploadImage(file)
    callback(url)
    message.success('图片上传成功')
  } catch (e) {
    message.error('图片上传失败：' + e.message)
  }
}

// ── 导入/导出 ──
async function handleExport() {
  try {
    await exportData()
    message.success('备份导出成功')
  } catch (e) {
    message.error('导出失败：' + e.message)
  }
}

async function handleImport({ file }) {
  try {
    const result = await importData(file.file)
    message.success(`导入成功！${result.artistCount} 位艺人，${result.eventCount} 条行程`)
    const [artistData, eventData] = await Promise.all([
      fetchArtists(),
      fetchEvents(),
    ])
    artists.value = artistData
    events.value = eventData
  } catch (e) {
    message.error('导入失败：' + e.message)
  }
}

// ── 主题 ──
const themeOverrides = {
  common: {
    primaryColor: '#FF6B6B',
    primaryColorHover: '#FF8787',
  },
}
</script>

<style>
body {
  margin: 0;
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', sans-serif;
  background: #f5f6fa;
  color: #333;
}

.app-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 20px;
  min-height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.app-title {
  margin: 0;
  font-size: 1.5em;
  font-weight: 700;
}

.filter-bar {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.content-area {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

.filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
