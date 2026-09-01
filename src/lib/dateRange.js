export function getInclusiveEndDate(event) {
  return event?.end_date || event?.start_date || ''
}

export function addDays(dateString, days) {
  if (!dateString) return ''
  const date = new Date(`${dateString}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return ''
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function getFullCalendarEndDate(event) {
  const inclusiveEnd = getInclusiveEndDate(event)
  return event?.is_all_day ? addDays(inclusiveEnd, 1) : inclusiveEnd
}

export function eventOverlapsMonth(event, month) {
  if (!event?.start_date || !/^\d{4}-\d{2}$/.test(month || '')) return false
  const monthStart = `${month}-01`
  const [year, monthNumber] = month.split('-').map(Number)
  const monthEnd = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10)
  return event.start_date <= monthEnd && getInclusiveEndDate(event) >= monthStart
}

export function isValidDateRange(startDate, endDate) {
  return Boolean(startDate && (!endDate || endDate >= startDate))
}
