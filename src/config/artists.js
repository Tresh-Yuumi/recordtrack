/**
 * 默认三位艺人的 ID、颜色、图标常量
 * 颜色：Perth 黑底白字、Santa 白底黑字、Domiia 红底白字
 * 日历中仅显示爱心图标
 */
export const DEFAULT_ARTISTS = [
  { id: '11111111-aaaa-1111-aaaa-111111111111', name: 'Perth',  emoji: '🖤', color: '#000000' },
  { id: '22222222-bbbb-2222-bbbb-222222222222', name: 'Santa',  emoji: '🤍', color: '#FFFFFF' },
  { id: '33333333-cccc-3333-cccc-333333333333', name: 'Domiia', emoji: '❤️', color: '#FF0000' },
]

/**
 * 根据背景色亮度返回合适的文字色
 * 亮背景 → 黑字，暗背景 → 白字
 */
export function getTextColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.7 ? '#333' : '#fff'
}

/**
 * 返回标签在未选中态可用的颜色
 * 纯白等过亮的颜色在白色背景上不可见，降级为中灰
 */
export function getTagColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.85 ? '#B0B0B0' : hex
}
