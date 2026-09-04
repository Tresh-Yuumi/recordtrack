<template>
  <div class="list-view">
    <div class="month-toolbar" aria-label="列表月份切换">
      <button type="button" @click="changeMonth(-1)">‹ 上月</button>
      <strong aria-live="polite" aria-atomic="true">{{ monthLabel }}</strong>
      <button type="button" @click="changeMonth(1)">下月 ›</button>
      <button type="button" @click="selectedMonth = getCurrentMonth()">回到本月</button>
    </div>
    <div v-if="monthEvents.length === 0" class="empty-hint">
      <n-text depth="3">本月暂无符合条件的行程</n-text>
    </div>

    <template v-else>
      <!-- 每条行程卡片 -->
      <div
        v-for="event in monthEvents"
        :key="event.id"
        class="event-card"
        @click="emit('eventClick', { extendedProps: event })"
      >
        <div class="card-date">
          <span class="date-day" :class="{ 'date-range-wide': isCrossMonth(event) }">{{ formatDateRange(event) }}</span>
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
import { computed, ref } from 'vue'
import { NText } from 'naive-ui'
import { eventOverlapsMonth } from '../lib/dateRange.js'

const props = defineProps({
  events: { type: Array, default: () => [] },
  artists: { type: Array, default: () => [] },
})
const emit = defineEmits(['eventClick'])

const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
const selectedMonth = ref(getCurrentMonth())
const monthLabel = computed(() => {
  const [year, month] = selectedMonth.value.split('-')
  return `${year}年${Number(month)}月`
})
const monthEvents = computed(() => props.events
  .filter((event) => eventOverlapsMonth(event, selectedMonth.value))
  .sort((a, b) => `${a.start_date}${a.start_time || ''}`.localeCompare(`${b.start_date}${b.start_time || ''}`)))

function changeMonth(offset) {
  const [year, month] = selectedMonth.value.split('-').map(Number)
  const date = new Date(year, month - 1 + offset, 1)
  selectedMonth.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getEventArtists(dbEvent) {
  const ids = dbEvent.artist_ids?.length
    ? dbEvent.artist_ids
    : dbEvent.artist_id ? [dbEvent.artist_id] : []
  return ids.map((id) => props.artists.find((a) => a.id === id)).filter(Boolean)
}

function formatDateRange(event) {
  const start = event.start_date
  const end = event.end_date || start
  if (!start) return '--'
  const startDay = String(Number(start.slice(8, 10)))
  if (start === end) return startDay
  const endDay = String(Number(end.slice(8, 10)))
  if (start.slice(0, 7) === end.slice(0, 7)) return `${startDay}–${endDay}`
  const startShort = `${Number(start.slice(5, 7))}/${startDay}`
  const endShort = `${Number(end.slice(5, 7))}/${endDay}`
  return start.slice(0, 4) === end.slice(0, 4) ? `${startShort}–${endShort}` : `${start.slice(0, 4)}/${startShort}–${end.slice(0, 4)}/${endShort}`
}

function isCrossMonth(event) {
  return Boolean(event.end_date && event.start_date?.slice(0, 7) !== event.end_date.slice(0, 7))
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

.month-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e5e5;
  margin-bottom: 4px;
}
.month-toolbar strong { font-size: 14px; color: #262626; white-space: nowrap; }
.month-toolbar button {
  min-height: 44px;
  padding: 0 10px;
  border: 1px solid #d4d4d4;
  border-radius: 6px;
  background: #fff;
  color: #262626;
  font: inherit;
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
}
.month-toolbar button:hover { background: #f5f5f5; }
.month-toolbar button:active { background: #e5e5e5; }
.month-toolbar button:focus-visible { outline: 2px solid #262626; outline-offset: 2px; }

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
  min-width: 64px;
  line-height: 1.2;
}
.date-day {
  font-size: 18px;
  font-weight: 700;
  color: #262626;
}
.date-day.date-range-wide { font-size: 12px; letter-spacing: -.03em; }
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
