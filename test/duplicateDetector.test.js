import test from 'node:test'
import assert from 'node:assert/strict'
import { findDuplicateCandidate } from '../src/lib/duplicateDetector.js'

const existing = {
  id: 'existing',
  start_date: '2026-08-22',
  start_time: '14:00:00',
  artist_ids: ['artist-a'],
  title: '品牌直播活动',
  location: '曼谷',
}

test('同日同艺人但标题和时间不同，不判为重复', () => {
  const candidate = {
    start_date: '2026-08-22',
    start_time: '19:00:00',
    artist_ids: ['artist-a'],
    title: '粉丝见面会',
    location: '清迈',
  }
  assert.equal(findDuplicateCandidate(candidate, [existing]), null)
})

test('同日标题相近时提示重复', () => {
  const candidate = { ...existing, id: 'candidate', title: '品牌直播' }
  const result = findDuplicateCandidate(candidate, [existing])
  assert.ok(result)
  assert.equal(result.event.id, 'existing')
})

test('同日同艺人同开始时间时提示重复，即使标题不同', () => {
  const candidate = { ...existing, id: 'candidate', title: '完全不同的行程', location: '清迈' }
  const result = findDuplicateCandidate(candidate, [existing])
  assert.ok(result)
})

test('标题相同但日期不同，不判为重复', () => {
  const candidate = { ...existing, id: 'candidate', start_date: '2026-08-23' }
  assert.equal(findDuplicateCandidate(candidate, [existing]), null)
})
