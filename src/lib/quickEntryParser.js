import {
  ARTIST_ALIASES, TYPE_RULES, ONLINE_KEYWORDS, OFFLINE_KEYWORDS, LOCATION_NAMES,
} from '../config/quickEntryRules.js'

function normalizeText(value) {
  return String(value || '')
    .replace(/[（【]/g, '(').replace(/[）】]/g, ')')
    .replace(/[：]/g, ':').replace(/[—–－]/g, '-')
    .replace(/\s+/g, ' ').trim()
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function parseDate(text, defaultYear) {
  const patterns = [
    /(?<year>20\d{2})\s*年\s*(?<month>\d{1,2})\s*月\s*(?<day>\d{1,2})\s*日?/,
    /(?<year>20\d{2})[-/.](?<month>\d{1,2})[-/.](?<day>\d{1,2})/,
    /(?<month>\d{1,2})\s*月\s*(?<day>\d{1,2})\s*日?/,
    /(?<!\d)(?<month>\d{1,2})[-/.](?<day>\d{1,2})(?!\d|:)/,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (!match) continue
    const year = Number(match.groups.year || defaultYear)
    const month = Number(match.groups.month)
    const day = Number(match.groups.day)
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
      return { value: '', raw: match[0], invalid: true }
    }
    return { value: `${year}-${pad(month)}-${pad(day)}`, raw: match[0], invalid: false }
  }
  return { value: '', raw: '', invalid: false }
}

function chineseHourTo24(hour, period) {
  let value = Number(hour)
  if ((period === '下午' || period === '晚上') && value < 12) value += 12
  if (period === '凌晨' && value === 12) value = 0
  return value
}

function parseTimeToken(token) {
  const colon = token.match(/(?<hour>\d{1,2}):(?<minute>\d{2})/)
  if (colon) return `${pad(colon.groups.hour)}:${colon.groups.minute}:00`
  const chinese = token.match(/(?<period>上午|下午|晚上|凌晨)?\s*(?<hour>\d{1,2})\s*点\s*(?<minute>半|\d{1,2}\s*分?)?/)
  if (!chinese) return null
  const hour = chineseHourTo24(chinese.groups.hour, chinese.groups.period)
  const minute = chinese.groups.minute === '半' ? 30 : Number((chinese.groups.minute || '0').replace('分', ''))
  if (hour > 23 || minute > 59) return null
  return `${pad(hour)}:${pad(minute)}:00`
}

function addHour(time) {
  const [hour, minute] = time.split(':').map(Number)
  return `${pad((hour + 1) % 24)}:${pad(minute)}:00`
}

function parseTimes(text) {
  if (/全天/.test(text)) return { mode: 'allDay', start: null, end: null, raw: '全天' }
  if (/时间?待定|待定/.test(text)) return { mode: 'pending', start: null, end: null, raw: '' }
  const tokenPattern = /(?:上午|下午|晚上|凌晨)?\s*\d{1,2}(?::\d{2}|\s*点(?:\s*(?:半|\d{1,2}\s*分?))?)/g
  const matches = [...text.matchAll(tokenPattern)].map((match) => ({ raw: match[0], value: parseTimeToken(match[0]) })).filter((item) => item.value)
  if (!matches.length) return { mode: 'pending', start: null, end: null, raw: '' }
  return {
    mode: 'specified', start: matches[0].value,
    end: matches[1]?.value || addHour(matches[0].value),
    raw: matches.map((item) => item.raw).join(' '),
  }
}

function findArtists(text, artists) {
  const lower = text.toLowerCase()
  return artists.filter((artist) => {
    const aliases = new Set([artist.name, ...(ARTIST_ALIASES[artist.name] || [])])
    return [...aliases].some((alias) => lower.includes(alias.toLowerCase()))
  }).map((artist) => artist.id)
}

function findTypeAndCategory(text) {
  const lower = text.toLowerCase()
  const matched = TYPE_RULES.find((rule) => rule.keywords.some((keyword) => lower.includes(keyword.toLowerCase())))
  let category = matched?.category || ''
  if (ONLINE_KEYWORDS.some((keyword) => lower.includes(keyword.toLowerCase()))) category = '线上'
  else if (OFFLINE_KEYWORDS.some((keyword) => lower.includes(keyword.toLowerCase()))) category = '线下'
  return { type: matched?.type || '', category }
}

function findLocation(text) {
  return LOCATION_NAMES.find((name) => text.includes(name)) || ''
}

function extractTitle(text, dateRaw, timeRaw, artists) {
  let title = text
  if (dateRaw) title = title.replace(dateRaw, ' ')
  if (timeRaw) {
    for (const token of timeRaw.split(' ')) title = title.replace(token, ' ')
  }
  title = title.replace(/全天|时间?待定/g, ' ')
  title = title.replace(/\(([^)]*)\)/g, (full, inner) => {
    const lower = inner.toLowerCase()
    const containsArtist = artists.some((artist) => {
      const aliases = [artist.name, ...(ARTIST_ALIASES[artist.name] || [])]
      return aliases.some((alias) => lower.includes(alias.toLowerCase()))
    })
    return containsArtist ? ' ' : full
  })
  for (const artist of artists) {
    const aliases = [artist.name, ...(ARTIST_ALIASES[artist.name] || [])].sort((a, b) => b.length - a.length)
    for (const alias of aliases) title = title.replace(new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), ' ')
  }
  return title.replace(/^[\s&,+\-—]+|[\s&,+\-—]+$/g, '').replace(/\s+/g, ' ').trim()
}

export function getMissingFields(event) {
  const missing = []
  if (!event.start_date) missing.push('日期')
  if (!event.artist_ids?.length) missing.push('艺人')
  if (!event.title) missing.push('标题')
  if (!event.type) missing.push('类型')
  if (!event.category) missing.push('分类')
  return missing
}

export function parseQuickEntry(text, { artists = [], defaultYear = new Date().getFullYear() } = {}) {
  return String(text || '').split(/\r?\n/).map(normalizeText).filter(Boolean).map((line, index) => {
    const date = parseDate(line, defaultYear)
    const time = parseTimes(line)
    const artistIds = findArtists(line, artists)
    const classification = findTypeAndCategory(line)
    const event = {
      key: `${Date.now()}-${index}`,
      original: line,
      artist_ids: artistIds,
      artist_id: artistIds[0] || null,
      title: extractTitle(line, date.raw, time.raw, artists),
      type: classification.type,
      category: classification.category,
      is_all_day: time.mode === 'allDay',
      time_mode: time.mode,
      start_date: date.value,
      end_date: date.value,
      start_time: time.start,
      end_time: time.end,
      location: findLocation(line),
      notes: '', image_urls: [],
      invalid_date: date.invalid,
      allow_duplicate: false,
    }
    event.missing = getMissingFields(event)
    return event
  })
}
