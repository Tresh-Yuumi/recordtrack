<template>
  <n-modal
    :show="show" preset="card" title="⚡ 快速录入行程" class="quick-entry-modal"
    :mask-closable="false" @update:show="emit('update:show', $event)"
  >
    <template v-if="!items.length">
      <n-alert type="info" :bordered="false" style="margin-bottom: 14px">
        可粘贴任意格式的行程文字。AI会自动判断行程数量并提取信息，保存前不会写入数据库。
      </n-alert>
      <n-form label-placement="top">
        <n-form-item label="默认年份">
          <n-input-number v-model:value="defaultYear" :min="2020" :max="2100" style="width: 140px" />
        </n-form-item>
        <n-form-item label="行程文字">
          <n-input
            v-model:value="sourceText" type="textarea" :rows="9"
            placeholder="例如：&#10;8月4日 — L'Oreal Paris直播（Perth Domiia）&#10;8月8日 — GMMTV FAN FEST 澳门站"
          />
        </n-form-item>
      </n-form>
      <n-space justify="end">
        <n-button @click="emit('update:show', false)">取消</n-button>
        <n-button :disabled="!sourceText.trim() || parsing" @click="handleRuleParse">规则识别</n-button>
        <n-button type="primary" :loading="parsing" :disabled="!sourceText.trim()" @click="handleParse">AI识别</n-button>
      </n-space>
    </template>

    <template v-else>
      <div class="parse-summary">
        <n-tag type="success">识别 {{ items.length }} 条</n-tag>
        <n-tag v-if="missingCount" type="error">{{ missingCount }} 条需要补充</n-tag>
        <n-tag type="info">{{ parseMethod === 'ai' ? 'AI识别' : '规则识别' }}</n-tag>
        <n-tag v-if="duplicateCount" type="warning">{{ duplicateCount }} 条可能重复</n-tag>
      </div>

      <n-alert v-if="parseNotice" type="warning" :bordered="false" style="margin-bottom: 12px">
        {{ parseNotice }}
      </n-alert>
      <div class="result-list">
        <section v-for="(item, index) in items" :key="item.key" class="result-card">
          <div class="result-heading">
            <n-checkbox v-model:checked="item.selected">第 {{ index + 1 }} 条</n-checkbox>
            <n-text depth="3" class="original-text">{{ item.original }}</n-text>
          </div>

          <n-alert v-if="item.invalid_date" type="error" style="margin-bottom: 10px">输入中的日期无效，请重新选择。</n-alert>
          <n-alert v-if="item.uncertain_fields?.length" type="warning" style="margin-bottom: 10px">
            AI建议核对：{{ item.uncertain_fields.join('、') }}
          </n-alert>
          <n-alert v-if="item.duplicate" type="warning" style="margin-bottom: 10px">
            {{ item.duplicate.level === 'high' ? '高度疑似重复' : '可能重复' }}：已有“{{ item.duplicate.event.title }}”
            （{{ item.duplicate.event.start_date }}，评分 {{ item.duplicate.score }}）
            <n-checkbox v-model:checked="item.allow_duplicate" style="margin-left: 10px">仍然新增</n-checkbox>
          </n-alert>

          <n-grid class="quick-grid" :cols="2" :x-gap="12">
            <n-form-item-gi label="日期范围" :validation-status="!item.start_date || item.end_date < item.start_date ? 'error' : undefined">
              <n-date-picker
                v-model:formatted-value="item.date_range" type="daterange" format="yyyy-MM-dd"
                value-format="yyyy-MM-dd" clearable style="width: 100%" @update:formatted-value="handleDateRange(item, $event)"
              />
            </n-form-item-gi>
            <n-form-item-gi label="艺人" :validation-status="!item.artist_ids.length ? 'error' : undefined">
              <n-select
                v-model:value="item.artist_ids" multiple :options="artistOptions"
                placeholder="请选择艺人" @update:value="refreshAll"
              />
            </n-form-item-gi>
            <n-form-item-gi label="标题" :validation-status="!item.title ? 'error' : undefined">
              <n-input v-model:value="item.title" placeholder="行程标题" @blur="refreshAll" />
            </n-form-item-gi>
            <n-form-item-gi label="地点">
              <n-input v-model:value="item.location" placeholder="可留空" @blur="refreshAll" />
            </n-form-item-gi>
            <n-form-item-gi label="类型" :validation-status="!item.type ? 'error' : undefined">
              <n-select v-model:value="item.type" :options="typeOptions" placeholder="请选择类型" @update:value="refreshAll" />
            </n-form-item-gi>
            <n-form-item-gi label="分类" :validation-status="!item.category ? 'error' : undefined">
              <n-select v-model:value="item.category" :options="categoryOptions" placeholder="线上或线下" @update:value="refreshAll" />
            </n-form-item-gi>
            <n-form-item-gi label="时间状态">
              <n-select v-model:value="item.time_mode" :options="timeModeOptions" @update:value="handleTimeMode(item)" />
            </n-form-item-gi>
            <n-form-item-gi v-if="item.time_mode === 'specified'" label="开始 / 结束时间">
              <n-space :wrap="false" align="center">
                <n-input v-model:value="item.start_time" placeholder="19:30" />
                <n-text depth="3">—</n-text>
                <n-input v-model:value="item.end_time" placeholder="20:30" />
              </n-space>
            </n-form-item-gi>
          </n-grid>

          <n-space v-if="item.missing.length" :size="6">
            <n-text type="error" style="font-size: 12px">需要补充：</n-text>
            <n-tag v-for="field in item.missing" :key="field" type="error" size="small">{{ field }}</n-tag>
          </n-space>
          <n-text v-else depth="3" style="font-size: 12px">{{ item.time_mode === 'pending' ? '时间未提供，将保存为待定。' : '必填信息完整。' }}</n-text>
        </section>
      </div>

      <div class="quick-actions">
        <n-button @click="items = []">返回修改文字</n-button>
        <n-space>
          <n-button @click="emit('update:show', false)">取消</n-button>
          <n-button type="primary" :loading="saving" :disabled="!saveableCount" @click="handleSave">
            保存 {{ saveableCount }} 条行程
          </n-button>
        </n-space>
      </div>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  NModal, NAlert, NForm, NFormItem, NFormItemGi, NInput, NInputNumber, NButton,
  NSpace, NTag, NText, NGrid, NSelect, NDatePicker, NCheckbox,
} from 'naive-ui'
import { EVENT_TYPES, EVENT_CATEGORIES } from '../config/eventTypes.js'
import { parseQuickEntry, getMissingFields } from '../lib/quickEntryParser.js'
import { parseQuickEntryWithAI } from '../lib/aiQuickEntryParser.js'
import { findDuplicateCandidate } from '../lib/duplicateDetector.js'

const props = defineProps({
  show: Boolean,
  artists: { type: Array, default: () => [] },
  events: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:show', 'submit'])

const sourceText = ref('')
const defaultYear = ref(new Date().getFullYear())
const items = ref([])
const saving = ref(false)

const artistOptions = computed(() => props.artists.map((artist) => ({ label: `${artist.emoji || ''} ${artist.name}`, value: artist.id })))
const parsing = ref(false)
const parseMethod = ref('ai')
const parseNotice = ref('')
const typeOptions = EVENT_TYPES.map((value) => ({ label: value, value }))
const categoryOptions = EVENT_CATEGORIES.map((value) => ({ label: value, value }))
const timeModeOptions = [
  { label: '待定', value: 'pending' },
  { label: '全天', value: 'allDay' },
  { label: '指定时间', value: 'specified' },
]

const missingCount = computed(() => items.value.filter((item) => item.missing.length).length)
const duplicateCount = computed(() => items.value.filter((item) => item.duplicate).length)
const saveableItems = computed(() => items.value.filter((item) =>
  item.selected && !item.missing.length && (!item.duplicate || item.allow_duplicate)
))
const saveableCount = computed(() => saveableItems.value.length)

watch(() => props.show, (show) => {
  if (!show) {
    sourceText.value = ''
    items.value = []
    saving.value = false
    parsing.value = false
    parseMethod.value = 'ai'
    parseNotice.value = ''
  }
})

function applyParsedItems(parsedItems, method) {
  items.value = parsedItems.map((item) => ({
    ...item,
    end_date: item.end_date || item.start_date || '',
    date_range: item.start_date ? [item.start_date, item.end_date || item.start_date] : null,
  }))
  parseMethod.value = method
  refreshAll()
}

function handleRuleParse() {
  parseNotice.value = ''
  applyParsedItems(
    parseQuickEntry(sourceText.value, { artists: props.artists, defaultYear: defaultYear.value }),
    'rules',
  )
}

async function handleParse() {
  parsing.value = true
  parseNotice.value = ''
  try {
    const parsed = await parseQuickEntryWithAI(sourceText.value, {
      artists: props.artists,
      defaultYear: defaultYear.value,
    })
    applyParsedItems(parsed, 'ai')
  } catch (error) {
    applyParsedItems(
      parseQuickEntry(sourceText.value, { artists: props.artists, defaultYear: defaultYear.value }),
      'rules',
    )
    parseNotice.value = `AI识别暂不可用，已自动使用规则识别：${error.message}`
  } finally {
    parsing.value = false
  }
}

function handleTimeMode(item) {
  item.is_all_day = item.time_mode === 'allDay'
  if (item.time_mode !== 'specified') {
    item.start_time = null
    item.end_time = null
  }
  refreshAll()
}

function handleDateRange(item, value) {
  item.start_date = value?.[0] || ''
  item.end_date = value?.[1] || item.start_date
  refreshAll()
}

function isValidTime(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  return Boolean(match && Number(match[1]) < 24 && Number(match[2]) < 60 && Number(match[3] || 0) < 60)
}

function refreshAll() {
  const previous = []
  for (const item of items.value) {
    item.artist_id = item.artist_ids[0] || null
    item.end_date = item.end_date || item.start_date
    item.is_all_day = item.time_mode === 'allDay'
    item.missing = getMissingFields(item)
    if (item.start_date && item.end_date < item.start_date) item.missing.push('日期范围')
    if (item.time_mode === 'specified') {
      if (!isValidTime(item.start_time)) item.missing.push('开始时间')
      if (!isValidTime(item.end_time)) item.missing.push('结束时间')
    }
    item.duplicate = findDuplicateCandidate(item, [...props.events, ...previous])
    previous.push(item)
  }
}

function toPayload(item) {
  const cleanTime = (value) => {
    if (!value) return null
    const match = String(value).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
    return match ? `${match[1].padStart(2, '0')}:${match[2]}:${match[3] || '00'}` : null
  }
  return {
    artist_ids: [...item.artist_ids], artist_id: item.artist_ids[0] || null,
    title: item.title.trim(), type: item.type, category: item.category,
    is_all_day: item.time_mode === 'allDay', start_date: item.start_date, end_date: item.end_date || item.start_date,
    start_time: item.time_mode === 'specified' ? cleanTime(item.start_time) : null,
    end_time: item.time_mode === 'specified' ? cleanTime(item.end_time) : null,
    location: item.location?.trim() || '', notes: item.notes || '', image_urls: [],
  }
}

function handleSave() {
  refreshAll()
  if (!saveableCount.value) return
  saving.value = true
  emit('submit', saveableItems.value.map(toPayload), (success) => {
    saving.value = false
    if (success) emit('update:show', false)
  })
}
</script>

<style scoped>
.quick-entry-modal { width: min(94vw, 900px); max-height: 92dvh; }
.parse-summary { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.result-list { max-height: 65dvh; overflow-y: auto; padding-right: 4px; }
.result-card { padding: 14px; margin-bottom: 12px; border: 1px solid #d4d4d4; border-radius: 10px; background: #fafafa; }
.result-heading { display: flex; gap: 12px; align-items: center; margin-bottom: 10px; }
.original-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.quick-actions { display: flex; justify-content: space-between; gap: 10px; padding-top: 12px; border-top: 1px solid #e5e5e5; }
@media (max-width: 600px) {
  .quick-entry-modal { width: 100vw; max-width: 100vw; height: 100dvh; max-height: 100dvh; border-radius: 0; }
  .quick-grid { grid-template-columns: minmax(0, 1fr) !important; }
  .result-list { max-height: calc(100dvh - 190px); }
  .result-card { padding: 11px; }.original-text { white-space: normal; }
  .quick-actions { position: sticky; bottom: 0; background: #fff; padding-bottom: env(safe-area-inset-bottom); }
}
</style>
