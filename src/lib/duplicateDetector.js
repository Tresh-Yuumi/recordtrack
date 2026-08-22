import { BRAND_ALIASES } from '../config/quickEntryRules.js'

function normalizeTitle(value) {
  let result = String(value || '').toLowerCase().normalize('NFKC')
  for (const [canonical, aliases] of Object.entries(BRAND_ALIASES)) {
    for (const alias of aliases) result = result.replaceAll(alias.toLowerCase(), canonical)
  }
  return result.replace(/[\s'’"“”·,，.。!！?？:：()（）\-_]/g, '').replace(/活动/g, '')
}

function bigrams(value) {
  if (value.length < 2) return new Set([value])
  return new Set(Array.from({ length: value.length - 1 }, (_, index) => value.slice(index, index + 2)))
}

function similarity(left, right) {
  if (!left || !right) return 0
  if (left === right) return 1
  const a = bigrams(left)
  const b = bigrams(right)
  const intersection = [...a].filter((item) => b.has(item)).length
  return (2 * intersection) / (a.size + b.size)
}

function artistIds(event) {
  return event.artist_ids?.length ? event.artist_ids : (event.artist_id ? [event.artist_id] : [])
}

export function findDuplicateCandidate(candidate, existingEvents) {
  let best = null
  for (const existing of existingEvents) {
    const sameDate = Boolean(candidate.start_date && candidate.start_date === existing.start_date)
    if (!sameDate) continue

    let score = 0
    const titleScore = similarity(normalizeTitle(candidate.title), normalizeTitle(existing.title))
    const candidateArtists = artistIds(candidate)
    const existingArtists = artistIds(existing)
    const overlap = candidateArtists.filter((id) => existingArtists.includes(id)).length
    const sameStartTime = Boolean(
      candidate.start_time
      && existing.start_time
      && candidate.start_time === existing.start_time
    )

    // 同日同艺人并不代表重复：只有标题相近，或同艺人且开始时间相同才进入重复评分。
    if (titleScore < 0.55 && !(overlap && sameStartTime)) continue

    score += 40
    if (titleScore === 1) score += 35
    else if (titleScore >= 0.55) score += 25
    if (candidateArtists.length && candidateArtists.length === existingArtists.length && overlap === candidateArtists.length) score += 20
    else if (overlap) score += 10
    if (candidate.location && candidate.location === existing.location) score += 5
    if (sameStartTime) score += 5
    if (!best || score > best.score) best = { event: existing, score, titleSimilarity: titleScore }
  }
  if (!best || best.score < 60) return null
  return { ...best, level: best.score >= 80 ? 'high' : 'possible' }
}
