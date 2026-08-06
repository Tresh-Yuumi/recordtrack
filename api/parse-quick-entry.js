import { requireAdmin } from './_lib/auth.js'

const EVENT_TYPES = ['商务站台', '演唱会', '见面会', '商务直播', '剧宣', '社媒', '非公开']
const EVENT_CATEGORIES = ['线下', '线上']
const TIME_MODES = ['pending', 'allDay', 'specified']
const MAX_INPUT_LENGTH = 8000
const MAX_EVENTS = 20
const REQUEST_TIMEOUT_MS = 8000

function cleanString(value, maxLength = 200) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text ? text.slice(0, maxLength) : null
}

function cleanDate(value) {
  const text = cleanString(value, 10)
  return text && /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null
}

function cleanTime(value) {
  const text = cleanString(value, 8)
  const match = text?.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59 || Number(match[3] || 0) > 59) return null
  return `${match[1].padStart(2, '0')}:${match[2]}:${match[3] || '00'}`
}

function normalizeEvent(raw) {
  const timeMode = TIME_MODES.includes(raw?.time_mode) ? raw.time_mode : 'pending'
  const startDate = cleanDate(raw?.start_date)
  return {
    source_text: cleanString(raw?.source_text, 1000) || '',
    artist_names: Array.isArray(raw?.artist_names)
      ? raw.artist_names.map((name) => cleanString(name, 80)).filter(Boolean).slice(0, 10)
      : [],
    title: cleanString(raw?.title, 200) || '',
    type: EVENT_TYPES.includes(raw?.type) ? raw.type : '',
    category: EVENT_CATEGORIES.includes(raw?.category) ? raw.category : '',
    start_date: startDate,
    end_date: cleanDate(raw?.end_date) || startDate,
    time_mode: timeMode,
    start_time: timeMode === 'specified' ? cleanTime(raw?.start_time) : null,
    end_time: timeMode === 'specified' ? cleanTime(raw?.end_time) : null,
    location: cleanString(raw?.location, 200) || '',
    notes: cleanString(raw?.notes, 500) || '',
    uncertain_fields: Array.isArray(raw?.uncertain_fields)
      ? raw.uncertain_fields.map((field) => cleanString(field, 40)).filter(Boolean).slice(0, 10)
      : [],
  }
}

function parseContent(content) {
  const text = String(content || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  if (!text) throw new Error('DeepSeek返回了空内容')
  const parsed = JSON.parse(text)
  if (!Array.isArray(parsed.events)) throw new Error('DeepSeek返回格式无效')
  return parsed.events.slice(0, MAX_EVENTS).map(normalizeEvent)
}

function buildPrompt({ text, defaultYear, artists }) {
  return `你是行程录入解析器。请将用户文字拆分为一条或多条行程，只输出JSON，不要解释。

当前默认年份：${defaultYear}
允许的艺人名称：${artists.length ? artists.join('、') : '无'}
允许的类型：${EVENT_TYPES.join('、')}
允许的分类：${EVENT_CATEGORIES.join('、')}

规则：
1. 根据日期、活动主体和语义判断一条或多条行程，不要机械地按换行拆分。
2. artist_names只能使用允许的艺人名称；不确定时返回空数组。
3. 日期格式为YYYY-MM-DD；没有年份时使用默认年份；不确定时返回null。
4. time_mode只能是pending、allDay、specified。无时间信息用pending；只有开始时间时，结束时间默认增加1小时。
5. 标题保留品牌或活动名称，移除已提取的日期、时间、艺人和地点；不要编造原文不存在的信息。
6. 地点提取城市、国家、场馆或“某某站”等地点信息；品牌名和平台名不是地点。
7. 无法确定的字段使用null或空字符串，并把字段名放入uncertain_fields。
8. 每条结果的source_text保留它对应的原始文字。

JSON格式：
{"events":[{"source_text":"原文","artist_names":[],"title":"","type":"","category":"","start_date":null,"end_date":null,"time_mode":"pending","start_time":null,"end_time":null,"location":"","notes":"","uncertain_fields":[]}]}

用户文字：
${text}`
}

async function requestDeepSeek(payload) {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY尚未配置')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
        thinking: { type: 'disabled' },
        temperature: 0.1,
        max_tokens: 1800,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: '你必须返回合法的JSON对象。' },
          { role: 'user', content: buildPrompt(payload) },
        ],
      }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error?.message || `DeepSeek请求失败（${response.status}）`)
    return parseContent(result.choices?.[0]?.message?.content)
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('DeepSeek识别超时')
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!requireAdmin(req, res)) return

  const text = String(req.body?.text || '').trim()
  const defaultYear = Number(req.body?.defaultYear)
  const artists = Array.isArray(req.body?.artists)
    ? req.body.artists.map((artist) => cleanString(artist, 80)).filter(Boolean).slice(0, 100)
    : []
  if (!text) return res.status(400).json({ error: '请输入行程文字' })
  if (text.length > MAX_INPUT_LENGTH) return res.status(400).json({ error: `输入内容不能超过${MAX_INPUT_LENGTH}字` })
  if (!Number.isInteger(defaultYear) || defaultYear < 2020 || defaultYear > 2100) {
    return res.status(400).json({ error: '默认年份无效' })
  }

  try {
    const events = await requestDeepSeek({ text, defaultYear, artists })
    if (!events.length) throw new Error('未识别到行程')
    return res.status(200).json({ events })
  } catch (error) {
    return res.status(502).json({ error: error.message || 'AI识别失败' })
  }
}
