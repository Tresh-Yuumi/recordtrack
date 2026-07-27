<template>
  <div class="calendar-container">
    <FullCalendar ref="calendarRef" :options="calendarOptions" />
  </div>
</template>

<script setup>
import { ref, shallowRef, computed, watch } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'

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
  const endStr = dbEvent.is_all_day
    ? dbEvent.end_date
    : `${dbEvent.end_date}T${dbEvent.end_time || '23:59'}`

  return {
    id: dbEvent.id,
    title: `${artistIcons}${dbEvent.title}`,
    start: startStr,
    end: endStr,
    allDay: dbEvent.is_all_day,
    backgroundColor: '#000',
    borderColor: '#000',
    textColor: '#fff',
    extendedProps: { ...dbEvent },
  }
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
  dateClick: (arg) => {
    emit('dateClick', arg.dateStr)
  },
  eventClick: (arg) => {
    emit('eventClick', arg.event)
  },
})

// 通过 FullCalendar 原生 API 更新事件，不替换整个 options
watch(fcEvents, (newEvents) => {
  const api = calendarRef.value?.getApi()
  if (api) {
    api.removeAllEvents()
    newEvents.forEach((e) => api.addEvent(e))
  }
})
</script>

<style scoped>
.calendar-container {
  height: 100%;
  padding: 0;
}

:deep(.fc) {
  font-size: 14px;
}
:deep(.fc .fc-toolbar-title) {
  font-size: 1.2em;
}
:deep(.fc .fc-button) {
  font-size: 0.85em;
}
</style>
