<template>
  <div class="calendar-container">
    <FullCalendar ref="calendarRef" :options="calendarOptions" />
  </div>
</template>

<script setup>
import { ref, shallowRef, computed, watch, onMounted } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { getFullCalendarEndDate } from '../lib/dateRange.js'

const props = defineProps({
  events: { type: Array, default: () => [] },
  artists: { type: Array, default: () => [] },
})
const emit = defineEmits(['dateClick', 'eventClick'])

const calendarRef = ref(null)

// 根据 artist_ids 查找艺人信息（兼容旧 artist_id）
function getEventArtists(dbEvent) {
  const ids = dbEvent.artist_ids?.length
    ? dbEvent.artist_ids
    : (dbEvent.artist_id ? [dbEvent.artist_id] : [])
  return ids.map((id) => props.artists.find((a) => a.id === id)).filter(Boolean)
}

function formatEventForCalendar(dbEvent) {
  const eventArtists = getEventArtists(dbEvent)
  // 日历中仅显示艺人图标（爱心），不显示名字
  const artistIcons = eventArtists.map((a) => a.emoji || '').join('')

  const startStr = dbEvent.is_all_day
    ? dbEvent.start_date
    : `${dbEvent.start_date}T${dbEvent.start_time || '00:00'}`
  const calendarEndDate = getFullCalendarEndDate(dbEvent)
  const endStr = dbEvent.is_all_day
    ? calendarEndDate
    : `${calendarEndDate}T${dbEvent.end_time || '23:59'}`

  return {
    id: dbEvent.id,
    title: dbEvent.title,
    start: startStr,
    end: endStr,
    allDay: dbEvent.is_all_day,
    backgroundColor: '#737373',
    borderColor: '#525252',
    textColor: '#fff',
    extendedProps: { ...dbEvent, artistIcons },
  }
}

function renderEventContent(arg) {
  const content = document.createElement('div')
  content.className = 'calendar-event-content'

  const icons = document.createElement('span')
  icons.className = 'calendar-event-icons'
  icons.textContent = arg.event.extendedProps.artistIcons || ''

  const title = document.createElement('span')
  title.className = 'calendar-event-title'
  title.textContent = arg.event.title

  if (icons.textContent) content.append(icons)
  content.append(title)
  return { domNodes: [content] }
}

const fcEvents = computed(() => props.events.map(formatEventForCalendar))

// 使用 shallowRef 避免 Vue 深度代理干扰 FullCalendar 内部回调
const calendarOptions = shallowRef({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay',
  },
  buttonText: {
    today: '今天',
    month: '月',
    week: '周',
    day: '日',
  },
  locale: 'zh-cn',
  timeZone: 'local',
  events: [],
  editable: false,
  selectable: true,
  navLinks: false,
  height: 'auto',
  eventDisplay: 'block',
  displayEventTime: false,
  eventContent: renderEventContent,
  dateClick: (arg) => {
    emit('dateClick', arg.dateStr)
  },
  eventClick: (arg) => {
    emit('eventClick', arg.event)
  },
})

// 首次挂载和后续数据变化时，都通过 FullCalendar 原生 API 同步事件。
function syncEvents(newEvents) {
  const api = calendarRef.value?.getApi()
  if (!api) return
  api.removeAllEvents()
  newEvents.forEach((event) => api.addEvent(event))
}

onMounted(() => syncEvents(fcEvents.value))

watch(fcEvents, syncEvents, { flush: 'post' })
</script>

<style scoped>
.calendar-container {
  height: 100%;
  padding: 0;
}

:deep(.fc) {
  font-size: 14px;
  --fc-button-bg-color: #262626;
  --fc-button-border-color: #262626;
  --fc-button-hover-bg-color: #404040;
  --fc-button-hover-border-color: #404040;
  --fc-button-active-bg-color: #525252;
  --fc-button-active-border-color: #525252;
  --fc-today-bg-color: rgba(115, 115, 115, .10);
  --fc-border-color: #d4d4d4;
}
:deep(.fc .fc-toolbar-title) {
  font-size: 1.2em;
}
:deep(.fc .fc-button) {
  font-size: 0.85em;
}
:deep(.fc .fc-event) {
  border-width: .5px;
  padding: 1px 3px;
}
:deep(.fc .calendar-event-content) {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  max-height: 2.4em;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  font-size: 11px;
  line-height: 1.2;
}
:deep(.fc .calendar-event-icons) {
  margin-right: 2px;
  font-size: 8px;
  white-space: nowrap;
}
:deep(.fc .calendar-event-title) {
  font-family: 'Arial Narrow', 'Roboto Condensed', 'Helvetica Neue Condensed', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-stretch: condensed;
  font-weight: 500;
  letter-spacing: -.2px;
}

@media (max-width: 600px) {
  :deep(.fc) { font-size: 12px; }
  :deep(.fc .fc-header-toolbar) { flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
  :deep(.fc .fc-toolbar-chunk:nth-child(2)) { order: -1; width: 100%; text-align: center; }
  :deep(.fc .fc-toolbar-title) { font-size: 1.08rem; }
  :deep(.fc .fc-button) { padding: .35em .5em; }
  :deep(.fc .fc-daygrid-day-number) { padding: 3px; }
  :deep(.fc .fc-event) { margin-top: 1px; padding: 1px 2px; }
  :deep(.fc .calendar-event-content) { max-height: 2.3em; font-size: 9.5px; line-height: 1.15; }
  :deep(.fc .calendar-event-icons) { margin-right: 1px; font-size: 7.5px; }
  :deep(.fc .calendar-event-title) { letter-spacing: -.25px; }
}
@media (max-width: 360px) {
  :deep(.fc .fc-button) { font-size: .75em; }
  :deep(.fc .calendar-event-content) { font-size: 9px; }
  :deep(.fc .calendar-event-icons) { font-size: 7px; }
}
</style>
