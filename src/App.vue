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
            <n-button type="primary" size="small" @click="openCreate(new Date().toISOString().slice(0, 10))">
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

      <!-- ========== 艺人筛选栏 ========== -->
      <section class="filter-bar">
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
              opacity: activeFilter && activeFilter !== artist.id ? 0.4 : 1,
              borderColor: artist.color,
              color: activeFilter === artist.id ? '#fff' : artist.color,
              backgroundColor: activeFilter === artist.id ? artist.color : 'transparent',
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
      </section>

      <!-- ========== 日历视图 ========== -->
      <main class="calendar-area">
        <CalendarView
          :events="filteredEvents"
          :loading="loading"
          @date-click="openCreate"
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
import { ref, computed, onMounted } from 'vue'
import {
  NConfigProvider, NButton, NSpace, NTag, NDivider, NText, NUpload,
  createDiscreteApi,
} from 'naive-ui'
import { zhCN } from 'naive-ui'
import CalendarView from './components/CalendarView.vue'
import EventModal from './components/EventModal.vue'
import { useCalendar } from './composables/useCalendar.js'

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

// ── 筛选后的事件 ──
const filteredEvents = computed(() => {
  if (!activeFilter.value) return events.value
  return events.value.filter((e) => e.artist_id === activeFilter.value)
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

.calendar-area {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
</style>
