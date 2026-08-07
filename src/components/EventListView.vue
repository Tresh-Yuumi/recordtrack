<template>
  <div class="list-view">
    <div v-if="grouped.length === 0" class="empty-hint">
      <n-text depth="3">暂无行程</n-text>
    </div>

    <template v-for="group in grouped" :key="group.label">
      <!-- 月份分隔条 -->
      <div class="month-divider">
        <span>{{ group.label }}</span>
      </div>

      <!-- 每条行程卡片 -->
      <div
        v-for="event in group.events"
        :key="event.id"
        class="event-card"
        @click="emit('eventClick', { extendedProps: event })"
      >
        <div class="card-date">
          <span class="date-day">{{ formatDay(event.start_date) }}</span>
          <span class="date-week">{{ formatWeekday(event.start_date) }}</span>
        </div>
        <div class="card-artists">
          <span
            v-for="a in getEventArtists(event)"
            :key="a.id"
            class="artist-icon"
            :title="a.name"
          >{{ a.emoji }}</span>
        </div>
        <div class="card-title">{{ event.title }}</div>
        <div class="card-time">{{ formatTime(event) }}</div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { NText } from 'naive-ui'

const props = defineProps({
  events: { type: Array, default: () => [] },
  artists: { type: Array, default: () => [] },
})
const emit = defineEmits(['eventClick'])

const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// 按月份分组
const grouped = computed(() => {
  const map = new Map()
  for (const e of props.events) {
    const month = e.start_date?.slice(0, 7) || '--'
    if (!map.has(month)) {
      const [y, m] = month.split('-')
      map.set(month, { label: `${y}年${parseInt(m)}月`, events: [] })
    }
    map.get(month).events.push(e)
  }
  return [...map.values()]
})

function getEventArtists(dbEvent) {
  const ids = dbEvent.artist_ids?.length
    ? dbEvent.artist_ids
    : dbEvent.artist_id ? [dbEvent.artist_id] : []
  return ids.map((id) => props.artists.find((a) => a.id === id)).filter(Boolean)
}

function formatDay(dateStr) {
  if (!dateStr) return '--'
  return dateStr.slice(8).replace(/^0/, '')
}

function formatWeekday(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00')
  return weekDays[d.getDay()]
}

function formatTime(event) {
  if (event.is_all_day) return '全天'
  const s = (event.start_time || '').slice(0, 5).replace(/:00$/, '')
  const e = (event.end_time || '').slice(0, 5).replace(/:00$/, '')
  if (!s && !e) return '--'
  if (!e || s === e) return s
  return `${s}-${e}`
}
</script>

<style scoped>
.list-view {
  padding: 8px 0;
}

.empty-hint {
  text-align: center;
  padding: 40px 0;
}

.month-divider {
  padding: 16px 4px 8px;
  font-size: 13px;
  font-weight: 600;
  color: #737373;
  border-bottom: 1px solid #e5e5e5;
  margin-bottom: 4px;
}
.month-divider:first-child {
  padding-top: 4px;
}

.event-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #eeeeee;
}
.event-card:hover {
  background: #f5f5f5;
}
.event-card:last-child {
  border-bottom: none;
}

.card-date {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 48px;
  line-height: 1.2;
}
.date-day {
  font-size: 18px;
  font-weight: 700;
  color: #262626;
}
.date-week {
  font-size: 11px;
  color: #737373;
}

.card-artists {
  display: flex;
  gap: 2px;
  font-size: 15px;
  min-width: 36px;
}
.artist-icon {
  cursor: default;
}

.card-title {
  flex: 1;
  font-size: 14px;
  color: #262626;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-time {
  font-size: 12px;
  color: #737373;
  white-space: nowrap;
  min-width: 60px;
  text-align: right;
}
</style>
