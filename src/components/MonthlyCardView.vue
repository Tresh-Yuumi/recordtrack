<template>
  <section class="monthly-card-view" aria-label="月度行程卡片">
    <div class="monthly-toolbar">
      <div class="toolbar-heading"><strong>月度行程卡片</strong><span>选择月份查看对应行程</span></div>
      <div class="monthly-actions">
        <label class="month-control">
          <span>月份</span>
          <input v-model="selectedMonth" type="month" :min="monthBounds.min" :max="monthBounds.max" />
        </label>
        <button type="button" class="download-poster-button" :disabled="downloading" @click="downloadPoster">
          {{ downloading ? '生成中…' : '下载海报' }}
        </button>
      </div>
    </div>

    <article ref="posterRef" class="schedule-poster">
      <header class="poster-header">
        <div class="poster-kicker">RECORDTRACK · MONTHLY EDITION</div>
        <div class="poster-heading-row">
          <h2>MONTHLY<br />SCHEDULE</h2>
          <div class="poster-month"><span>{{ selectedYear }}</span><strong>{{ selectedMonthName }}</strong></div>
        </div>
        <div v-if="monthArtists.length" class="poster-artists" aria-label="本月艺人">
          <span v-for="artist in monthArtists" :key="artist.id"><b aria-hidden="true">{{ artist.emoji }}</b>{{ artist.name }}</span>
        </div>
      </header>

      <div v-if="monthEvents.length" class="poster-events">
        <div
          v-for="(event, index) in monthEvents"
          :key="event.id"
          class="poster-event"
        >
          <label v-if="isAdmin" class="event-image event-image-upload" :class="{ 'is-uploading': uploadingEventId === event.id }">
            <input
              type="file"
              accept="image/*"
              :aria-label="`${event.card_image_url ? '更换' : '上传'}“${event.title}”的月度卡片图片`"
              :disabled="uploadingEventId === event.id"
              @change="handleImageChange($event, event)"
            />
            <img :src="event.card_image_url || defaultCardImageUrl" alt="" loading="lazy" />
          </label>
          <span v-else class="event-image" aria-hidden="true">
            <img :src="event.card_image_url || defaultCardImageUrl" alt="" loading="lazy" />
          </span>
          <button type="button" class="event-details" @click="emit('eventClick', { extendedProps: event })">
            <span class="event-date" :class="{ 'is-cross-month': isCrossMonth(event) }" :data-tone="index % 4">
              <strong>{{ formatDate(event) }}</strong><small>{{ formatWeekday(event.start_date) }}</small>
            </span>
            <span class="event-copy">
              <span class="event-title-line"><strong>{{ event.title }}</strong><b class="event-time">{{ formatTime(event) }}</b></span>
              <span class="event-meta">
                <span>{{ event.location || '地点待定' }}</span>
                <span class="event-artist-hearts" aria-label="参与艺人">
                  <i v-for="artist in getEventArtists(event)" :key="artist.id" :title="artist.name">{{ artist.emoji }}</i>
                </span>
              </span>
            </span>
          </button>
        </div>
      </div>

      <div v-else class="poster-empty"><strong>本月暂无行程</strong><span>切换月份，或在管理模式下新增行程</span></div>
      <footer class="poster-footer"><span>RECORDTRACK</span><span>{{ monthEvents.length }} EVENTS · UPDATED {{ updatedLabel }} · TIMEZONE UTC+8</span></footer>
    </article>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { eventOverlapsMonth } from '../lib/dateRange.js'

const props = defineProps({
  events: { type: Array, default: () => [] },
  artists: { type: Array, default: () => [] },
  isAdmin: { type: Boolean, default: false },
  uploadingEventId: { type: [String, Number], default: null },
})
const emit = defineEmits(['eventClick', 'imageUpload', 'downloadError'])
const defaultCardImageUrl = '/monthly-card-default.jpg'
const posterRef = ref(null)
const downloading = ref(false)

const todayMonth = new Date().toISOString().slice(0, 7)
const availableMonths = computed(() => [...new Set(
  props.events.map((event) => event.start_date?.slice(0, 7)).filter(Boolean),
)].sort())
const selectedMonth = ref(todayMonth)
const monthBounds = computed(() => ({
  min: [availableMonths.value[0], `${new Date().getFullYear() - 2}-01`].filter(Boolean).sort()[0],
  max: [availableMonths.value.at(-1), `${new Date().getFullYear() + 2}-12`].filter(Boolean).sort().at(-1),
}))
const monthEvents = computed(() => props.events
  .filter((event) => eventOverlapsMonth(event, selectedMonth.value))
  .sort((a, b) => `${a.start_date}${a.start_time || ''}`.localeCompare(`${b.start_date}${b.start_time || ''}`)))
const selectedYear = computed(() => selectedMonth.value?.slice(0, 4) || '----')
const selectedMonthName = computed(() => {
  const month = Number(selectedMonth.value?.slice(5, 7))
  return month ? new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(2026, month - 1, 1)).toUpperCase() : 'MONTH'
})
const monthArtists = computed(() => {
  const ids = new Set(monthEvents.value.flatMap((event) => getArtistIds(event)))
  return props.artists.filter((artist) => ids.has(artist.id))
})
const updatedLabel = computed(() => new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' }).format(new Date()))
const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function getArtistIds(event) {
  return event.artist_ids?.length ? event.artist_ids : (event.artist_id ? [event.artist_id] : [])
}
function getEventArtists(event) {
  const ids = getArtistIds(event)
  return ids.map((id) => props.artists.find((artist) => artist.id === id)).filter(Boolean)
}
function formatDate(event) {
  const startDate = event.start_date || ''
  const endDate = event.end_date || startDate
  const start = String(Number(startDate.slice(8, 10)) || '--').padStart(2, '0')
  if (startDate === endDate) return start
  const end = String(Number(endDate.slice(8, 10)) || '--').padStart(2, '0')
  if (startDate.slice(0, 7) === endDate.slice(0, 7)) return `${start}-${end}`
  return `${startDate.slice(5).replace('-', '/')}-\n${endDate.slice(5).replace('-', '/')}`
}
function isCrossMonth(event) {
  return Boolean(event.end_date && event.start_date?.slice(0, 7) !== event.end_date.slice(0, 7))
}
function formatWeekday(date) {
  return date ? weekDays[new Date(`${date}T00:00:00`).getDay()] : ''
}
function formatTime(event) {
  if (event.is_all_day) return '全天'
  return event.start_time?.slice(0, 5) || '待定'
}
function handleImageChange(domEvent, event) {
  const file = domEvent.target.files?.[0]
  domEvent.target.value = ''
  if (file) emit('imageUpload', { event, file })
}
async function downloadPoster() {
  if (!posterRef.value || downloading.value) return
  downloading.value = true
  let exportFrame = null
  try {
    await document.fonts?.ready

    exportFrame = document.createElement('div')
    exportFrame.setAttribute('aria-hidden', 'true')
    Object.assign(exportFrame.style, {
      position: 'fixed',
      top: '0',
      left: '-10000px',
      width: '864px',
      padding: '2px',
      boxSizing: 'border-box',
      background: '#111111',
      pointerEvents: 'none',
    })
    const exportPoster = posterRef.value.cloneNode(true)
    Object.assign(exportPoster.style, {
      width: '860px',
      maxWidth: 'none',
      margin: '0',
    })
    exportFrame.appendChild(exportPoster)
    document.body.appendChild(exportFrame)

    const posterImages = [...exportPoster.querySelectorAll('img')]
    posterImages.forEach((img) => { img.loading = 'eager' })
    await Promise.all(posterImages.map((img) => {
      if (img.complete) return Promise.resolve()
      return new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true })
        img.addEventListener('error', resolve, { once: true })
      })
    }))
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    const rect = exportFrame.getBoundingClientRect()
    const posterWidth = Math.ceil(Math.max(exportFrame.scrollWidth, rect.width))
    const posterHeight = Math.ceil(Math.max(exportFrame.scrollHeight, rect.height))
    const maxCanvasDimension = 14000
    const pixelRatio = Math.min(2, maxCanvasDimension / Math.max(posterWidth, posterHeight))
    const { toBlob } = await import('html-to-image')
    const blob = await toBlob(exportFrame, {
      backgroundColor: '#111111',
      cacheBust: true,
      width: posterWidth,
      height: posterHeight,
      pixelRatio,
      style: {
        width: `${posterWidth}px`,
        height: `${posterHeight}px`,
        maxHeight: 'none',
        position: 'static',
      },
    })
    if (!blob) throw new Error('海报生成失败')
    const downloadUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `recordtrack-${selectedMonth.value || 'monthly'}.png`
    link.href = downloadUrl
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
  } catch {
    emit('downloadError')
  } finally {
    exportFrame?.remove()
    downloading.value = false
  }
}
</script>

<style scoped>
.monthly-card-view { width: 100%; }
.monthly-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; max-width: 860px; margin: 0 auto 14px; }
.toolbar-heading { display: flex; flex-direction: column; gap: 2px; }
.monthly-toolbar strong { font-size: 15px; }
.toolbar-heading span { color: #737373; font-size: 12px; }
.monthly-actions { display: flex; align-items: flex-end; gap: 8px; }
.month-control { display: flex; align-items: center; gap: 8px; color: #525252; font-size: 12px; }
.month-control input { min-height: 36px; padding: 5px 10px; border: 1px solid #d4d4d4; border-radius: 7px; background: #fff; color: #262626; font: inherit; }
.month-control input:focus-visible { outline: 2px solid #262626; outline-offset: 2px; }
.download-poster-button { min-height: 36px; padding: 6px 12px; border: 1px solid #262626; border-radius: 7px; background: #262626; color: #fff; cursor: pointer; font: 600 12px/1 sans-serif; white-space: nowrap; }
.download-poster-button:hover:not(:disabled) { background: #404040; }
.download-poster-button:focus-visible { outline: 2px solid #262626; outline-offset: 2px; }
.download-poster-button:disabled { cursor: wait; opacity: .58; }
.schedule-poster {
  --poster-white: #f7f7f4;
  --poster-muted: #a3a3a3;
  width: min(100%, 860px);
  margin: 0 auto;
  overflow: hidden;
  border-radius: 4px;
  background: radial-gradient(circle at 15% 12%, rgba(255,255,255,.08) 0 1px, transparent 1.5px) 0 0 / 14px 14px,
    radial-gradient(circle at 86% 92%, rgba(255,255,255,.06) 0 1px, transparent 1.5px) 0 0 / 18px 18px, #111;
  color: var(--poster-white);
  box-shadow: 0 18px 50px rgba(0,0,0,.2);
}
.poster-header { padding: clamp(24px, 6vw, 56px) clamp(18px, 7vw, 64px) 24px; }
.poster-kicker { margin-bottom: 8px; color: #bdbdbd; font-size: clamp(10px, 1.6vw, 13px); font-weight: 700; letter-spacing: .16em; }
.poster-heading-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; }
.poster-heading-row h2 { margin: 0; font-family: 'Arial Narrow', Impact, 'Helvetica Neue Condensed', sans-serif; font-size: clamp(48px, 10vw, 92px); font-stretch: condensed; font-weight: 900; letter-spacing: -.055em; line-height: .78; }
.poster-month { display: flex; flex-direction: column; align-items: flex-end; padding-bottom: 3px; }
.poster-month span { font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace; font-size: 13px; }
.poster-month strong { font-size: clamp(13px, 2.4vw, 20px); letter-spacing: .05em; }
.poster-artists { display: flex; flex-wrap: wrap; gap: 7px 18px; margin-top: 24px; padding-top: 14px; border-top: 1px solid #404040; }
.poster-artists span { display: inline-flex; align-items: center; gap: 5px; color: #d4d4d4; font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.poster-artists b { font-size: 10px; }
.poster-events { padding: 4px clamp(14px, 5vw, 48px) 24px; }
.poster-event { display: grid; grid-template-columns: clamp(72px, 13vw, 112px) minmax(0, 1fr); align-items: stretch; width: 100%; min-height: 124px; border-bottom: 1px solid #737373; }
.poster-event:first-child { border-top: 1px solid #737373; }
.event-details { display: grid; grid-template-columns: clamp(72px, 13vw, 112px) minmax(0, 1fr); min-width: 0; min-height: 124px; padding: 0; border: 0; background: transparent; color: inherit; cursor: pointer; font: inherit; text-align: left; }
.event-details:hover .event-copy, .event-details:focus-visible .event-copy { background: rgba(255,255,255,.055); }
.event-details:focus-visible { outline: 2px solid #fff; outline-offset: -2px; }
.event-image { position: relative; display: block; align-self: center; width: calc(100% - 14px); height: 88px; min-width: 0; margin-right: 14px; overflow: hidden; border: 1px solid #3f3f3f; background: linear-gradient(145deg, #191919, #252525); }
.event-image img { width: 100%; height: 100%; object-fit: cover; }
.event-image-upload { cursor: pointer; }
.event-image-upload input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.event-image-upload:hover, .event-image-upload:focus-within { border-color: #f5f5f5; }
.event-image-upload:focus-within { outline: 2px solid #fff; outline-offset: 2px; }
.event-image-upload.is-uploading { cursor: wait; opacity: .72; }
.event-image-upload.is-uploading::after { position: absolute; inset: 50% auto auto 50%; width: 18px; height: 18px; margin: -10px 0 0 -10px; border: 2px solid rgba(255,255,255,.45); border-top-color: #fff; border-radius: 50%; content: ''; animation: upload-spin .7s linear infinite; }
.event-date { display: flex; flex-direction: column; align-items: center; align-self: center; justify-content: center; min-height: 92px; margin: 14px; background: #f5f5f5; color: #111; }
.event-date[data-tone="1"] { background: #d4d4d4; }
.event-date[data-tone="2"] { background: #a3a3a3; }
.event-date[data-tone="3"] { background: #e5e5e5; }
.event-date strong { font-family: Impact, 'Arial Narrow', sans-serif; font-size: clamp(31px, 6vw, 52px); font-weight: 900; letter-spacing: -.035em; line-height: .92; }
.event-date.is-cross-month strong { font-size: clamp(15px, 2.8vw, 24px); line-height: .95; text-align: center; white-space: pre-line; }
.event-date small { margin-top: 5px; font-size: 10px; font-weight: 700; }
.event-copy { display: flex; flex-direction: column; justify-content: center; min-width: 0; padding: 18px 0 18px 18px; transition: background-color .18s ease; }
.event-title-line { display: flex; align-items: flex-start; gap: 14px; }
.event-title-line > strong { display: -webkit-box; flex: 1; min-width: 0; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 3; font-size: clamp(14px, 2.5vw, 20px); font-weight: 800; letter-spacing: .015em; line-height: 1.22; text-transform: uppercase; overflow-wrap: anywhere; }
.event-time { flex: 0 0 auto; min-width: 64px; padding: 6px 8px; background: var(--poster-white); color: #111; font-family: 'Arial Narrow', sans-serif; font-size: clamp(12px, 2vw, 16px); font-weight: 900; text-align: center; }
.event-meta { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; color: var(--poster-muted); font-size: 12px; }
.event-meta > span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.event-artist-hearts { display: inline-flex; flex: 0 0 auto; gap: 2px; }
.event-artist-hearts i { font-size: 11px; font-style: normal; }
.poster-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 80px 20px; border-block: 1px solid #404040; }
.poster-empty span { color: var(--poster-muted); font-size: 12px; }
.poster-footer { display: flex; justify-content: space-between; gap: 16px; padding: 14px clamp(18px, 5vw, 48px); background: #050505; color: #a3a3a3; font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace; font-size: 10px; letter-spacing: .06em; }
@media (max-width: 600px) {
  .monthly-toolbar { align-items: flex-end; }
  .toolbar-heading span { display: none; }
  .monthly-actions { gap: 6px; }
  .month-control { flex-direction: column; align-items: flex-start; gap: 3px; }
  .download-poster-button { padding-inline: 9px; }
  .schedule-poster { border-radius: 2px; }
  .poster-header { padding-bottom: 18px; }
  .poster-heading-row { flex-direction: column; align-items: stretch; gap: 10px; }
  .poster-heading-row h2 { font-size: clamp(39px, 13vw, 58px); }
  .poster-month { align-items: flex-end; padding-bottom: 0; }
  .poster-month strong { font-size: 12px; }
  .poster-artists { margin-top: 18px; }
  .poster-event { grid-template-columns: 52px minmax(0, 1fr); min-height: 100px; }
  .event-details { grid-template-columns: 62px minmax(0, 1fr); min-height: 100px; }
  .event-image { width: calc(100% - 7px); height: 72px; margin-right: 7px; }
  .event-date { min-height: 80px; margin: 10px 7px; }
  .event-date strong { font-size: 27px; }
  .event-date.is-cross-month strong { font-size: 12px; }
  .event-copy { padding: 12px 0 12px 7px; }
  .event-title-line { gap: 6px; }
  .event-title-line > strong { font-size: 12px; }
  .event-time { min-width: 48px; padding: 5px 4px; font-size: 10px; }
  .event-meta { gap: 6px; margin-top: 7px; font-size: 10px; }
  .poster-footer { gap: 8px; font-size: 8px; letter-spacing: .025em; white-space: nowrap; }
}
@media (max-width: 380px) {
  .poster-event { grid-template-columns: 46px minmax(0, 1fr); }
  .event-details { grid-template-columns: 54px minmax(0, 1fr); }
  .event-image { height: 64px; }
  .event-date strong { font-size: 23px; }
  .event-date small { font-size: 8px; }
  .event-meta > span:first-child { max-width: 120px; }
}
@keyframes upload-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .event-copy { transition: none; }
  .event-image-upload.is-uploading::after { animation: none; border-color: #fff; }
}
</style>
