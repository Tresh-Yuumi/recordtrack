import test from 'node:test'
import assert from 'node:assert/strict'
import { eventOverlapsMonth, getFullCalendarEndDate, isValidDateRange } from '../src/lib/dateRange.js'

test('全天多日行程传给 FullCalendar 时结束日期增加一天', () => {
  assert.equal(getFullCalendarEndDate({ is_all_day: true, start_date: '2026-09-03', end_date: '2026-09-05' }), '2026-09-06')
})

test('指定时间多日行程保留实际结束日期', () => {
  assert.equal(getFullCalendarEndDate({ is_all_day: false, start_date: '2026-09-03', end_date: '2026-09-05' }), '2026-09-05')
})

test('跨月行程出现在覆盖的两个月份', () => {
  const event = { start_date: '2026-09-30', end_date: '2026-10-02' }
  assert.equal(eventOverlapsMonth(event, '2026-09'), true)
  assert.equal(eventOverlapsMonth(event, '2026-10'), true)
  assert.equal(eventOverlapsMonth(event, '2026-11'), false)
})

test('二月月底的月份覆盖计算正确', () => {
  assert.equal(eventOverlapsMonth({ start_date: '2026-02-28', end_date: '2026-03-01' }, '2026-02'), true)
  assert.equal(eventOverlapsMonth({ start_date: '2026-03-01', end_date: '2026-03-01' }, '2026-02'), false)
})

test('结束日期不能早于开始日期', () => {
  assert.equal(isValidDateRange('2026-09-05', '2026-09-03'), false)
  assert.equal(isValidDateRange('2026-09-03', '2026-09-05'), true)
})
