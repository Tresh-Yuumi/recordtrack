import { ARTIST_ALIASES } from '../config/quickEntryRules.js'
import { parseQuickEntry } from './quickEntryParser.js'

function normalizeName(value) {
  return String(value || '').toLowerCase().replace(/[\s._-]+/g, '')
}

function resolveArtistIds(names, artists, sourceText, defaultYear) {
  const requested = new Set((names || []).map(normalizeName))
  const matched = artists.filter((artist) => {
    const aliases = [artist.name, ...(ARTIST_ALIASES[artist.name] || [])]
    return aliases.some((alias) => requested.has(normalizeName(alias)))
  }).map((artist) => artist.id)
  if (matched.length) return matched
  return parseQuickEntry(sourceText, { artists, defaultYear })[0]?.artist_ids || []
}

export async function parseQuickEntryWithAI(text, { artists = [], defaultYear = new Date().getFullYear() } = {}) {
  const response = await fetch('/api/parse-quick-entry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({
      text,
      defaultYear,
      artists: artists.map((artist) => artist.name),
    }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'AI识别失败')
  if (!Array.isArray(result.events)) throw new Error('AI识别结果格式无效')

  return result.events.map((event, index) => {
    const sourceText = event.source_text || text
    const artistIds = resolveArtistIds(event.artist_names, artists, sourceText, defaultYear)
    return {
      key: `ai-${Date.now()}-${index}`,
      original: sourceText,
      artist_ids: artistIds,
      artist_id: artistIds[0] || null,
      title: event.title || '',
      type: event.type || '',
      category: event.category || '',
      is_all_day: event.time_mode === 'allDay',
      time_mode: event.time_mode || 'pending',
      start_date: event.start_date || '',
      end_date: event.end_date || event.start_date || '',
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location || '',
      notes: event.notes || '',
      image_urls: [],
      invalid_date: false,
      allow_duplicate: false,
      uncertain_fields: event.uncertain_fields || [],
    }
  })
}
