<template>
  <n-modal
    :show="show"
    @update:show="(v) => emit('update:show', v)"
    :title="modalTitle"
    preset="card"
    style="width: 640px; max-width: 90vw"
    :mask-closable="false"
    @after-leave="handleClose"
  >
    <!-- ============ 详情模式 ============ -->
    <template v-if="mode === 'detail'">
      <n-descriptions label-placement="left" bordered :column="2" size="small">
        <n-descriptions-item label="艺人">
          <n-space>
            <n-tag
              v-for="a in detailArtists"
              :key="a.id"
              :color="{ color: '#000', textColor: '#fff' }"
              size="small"
            >
              {{ a.emoji }} {{ a.name }}
            </n-tag>
          </n-space>
        </n-descriptions-item>
        <n-descriptions-item label="分类">
          <n-tag :type="eventData.category === '线上' ? 'info' : 'success'" size="small">
            {{ eventData.category }}
          </n-tag>
        </n-descriptions-item>
        <n-descriptions-item label="类型">{{ eventData.type }}</n-descriptions-item>
        <n-descriptions-item label="标题" :span="2">{{ eventData.title }}</n-descriptions-item>
        <n-descriptions-item :label="dateLabel">
          {{ formattedDate }}
        </n-descriptions-item>
        <n-descriptions-item label="时间">{{ detailTime }}</n-descriptions-item>
        <n-descriptions-item label="地点" :span="2">{{ eventData.location || '--' }}</n-descriptions-item>
        <n-descriptions-item label="备注" :span="2">{{ eventData.notes || '--' }}</n-descriptions-item>
      </n-descriptions>

      <div v-if="eventData.image_urls?.length" style="margin-top: 16px">
        <n-text depth="3" style="font-size: 13px; margin-bottom: 8px; display: block">相关图片</n-text>
        <n-space>
          <n-image
            v-for="(url, i) in eventData.image_urls"
            :key="i"
            :src="url"
            width="100"
            height="100"
            object-fit="cover"
            style="border-radius: 6px"
          />
        </n-space>
      </div>

      <n-space justify="end" style="margin-top: 20px">
        <n-button v-if="canEdit" @click="handleDelete" type="error" ghost>删除</n-button>
        <n-button v-if="canEdit" @click="switchMode('edit')" type="primary">编辑</n-button>
        <n-button @click="emit('update:show', false)">关闭</n-button>
      </n-space>
    </template>

    <!-- ============ 创建 / 编辑模式 ============ -->
    <template v-else>
      <n-form ref="formRef" :model="form" label-placement="top" :rules="rules">
        <!-- 艺人选择（多选标签） -->
        <n-form-item label="艺人（可多选）" path="artist_ids">
          <n-space>
            <n-tag
              v-for="a in artists"
              :key="a.id"
              :type="form.artist_ids.includes(a.id) ? 'primary' : 'default'"
              checkable
              :checked="form.artist_ids.includes(a.id)"
              :style="{
                cursor: 'pointer',
                borderColor: form.artist_ids.includes(a.id) ? '#000' : '#ccc',
                color: form.artist_ids.includes(a.id) ? '#fff' : '#333',
                backgroundColor: form.artist_ids.includes(a.id) ? '#000' : '#fff',
              }"
              @click="toggleArtist(a.id)"
            >
              {{ a.emoji || '' }} {{ a.name }}
            </n-tag>
          </n-space>
        </n-form-item>

        <!-- 行程标题 -->
        <n-form-item label="标题" path="title">
          <n-input v-model:value="form.title" placeholder="例如：品牌活动站台" />
        </n-form-item>

        <!-- 双列：类型 | 分类 -->
        <n-grid class="form-grid" :cols="2" :x-gap="16">
          <n-form-item-gi label="行程类型" path="type">
            <n-space>
              <n-button
                v-for="t in EVENT_TYPES"
                :key="t"
                :type="form.type === t ? 'primary' : 'default'"
                size="tiny"
                @click="form.type = t"
              >
                {{ t }}
              </n-button>
            </n-space>
          </n-form-item-gi>
          <n-form-item-gi label="分类" path="category">
            <n-space>
              <n-tag
                v-for="c in EVENT_CATEGORIES"
                :key="c"
                :type="form.category === c ? 'primary' : 'default'"
                checkable
                :checked="form.category === c"
                @click="form.category = c"
                style="cursor: pointer"
              >
                {{ c }}
              </n-tag>
            </n-space>
          </n-form-item-gi>
        </n-grid>

        <!-- 双列：日期 | 时间 -->
        <n-grid class="form-grid" :cols="2" :x-gap="16">
          <n-form-item-gi label="日期" path="start_date">
            <n-date-picker
              v-model:formatted-value="dateRange"
              type="daterange"
              format="yyyy-MM-dd"
              value-format="yyyy-MM-dd"
              clearable
            />
          </n-form-item-gi>
          <n-form-item-gi label="时间">
            <n-space vertical :size="10">
              <n-space :size="8">
                <n-button size="small" :type="timeMode === 'allDay' ? 'primary' : 'default'" @click="setTimeMode('allDay')">全天</n-button>
                <n-button size="small" :type="timeMode === 'pending' ? 'primary' : 'default'" @click="setTimeMode('pending')">待定</n-button>
                <n-button size="small" :type="timeMode === 'specified' ? 'primary' : 'default'" @click="setTimeMode('specified')">指定时间</n-button>
              </n-space>
              <n-space v-if="timeMode === 'specified'" align="center" :size="8">
                <n-time-picker
                  v-model:value="startTime"
                  format="HH:mm"
                  clearable
                  placeholder="开始"
                  style="width: 90px"
                  @update:value="handleStartTimeChange"
                />
                <n-text depth="3">~</n-text>
                <n-time-picker
                  v-model:value="endTime"
                  format="HH:mm"
                  clearable
                  placeholder="结束"
                  style="width: 90px"
                />
              </n-space>
              <n-text v-else-if="timeMode === 'pending'" depth="3" style="font-size: 12px">时间尚未确定</n-text>
            </n-space>
          </n-form-item-gi>
        </n-grid>

        <!-- 双列：地点 | 备注 -->
        <n-grid class="form-grid" :cols="2" :x-gap="16">
          <n-form-item-gi label="地点">
            <n-input v-model:value="form.location" placeholder="城市 / 场馆名" />
          </n-form-item-gi>
          <n-form-item-gi label="备注">
            <n-input
              v-model:value="form.notes"
              type="textarea"
              placeholder="其他备注信息"
              :rows="2"
            />
          </n-form-item-gi>
        </n-grid>

        <!-- 图片上传 -->
        <n-form-item label="相关图片">
          <n-space v-if="form.image_urls.length" style="margin-bottom: 8px">
            <div
              v-for="(url, i) in form.image_urls"
              :key="i"
              style="position: relative; width: 80px; height: 80px"
            >
              <img :src="url" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px" />
              <n-button
                size="tiny"
                circle
                type="error"
                style="position: absolute; top: -6px; right: -6px"
                @click="removeImg(i)"
              >
                ✕
              </n-button>
            </div>
          </n-space>
          <n-upload
            :show-file-list="false"
            accept="image/*"
            :custom-request="handleUpload"
            :disabled="uploading"
          >
            <n-button :loading="uploading" size="small">上传图片</n-button>
          </n-upload>
        </n-form-item>
      </n-form>

      <n-space justify="end" style="margin-top: 20px">
        <n-button v-if="mode === 'edit'" @click="switchMode('detail')">取消编辑</n-button>
        <n-button @click="emit('update:show', false)">取消</n-button>
        <n-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ mode === 'create' ? '创建' : '保存' }}
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import {
  NModal, NForm, NFormItem, NFormItemGi, NGrid, NInput, NSelect, NButton, NSpace,
  NTag, NDatePicker, NTimePicker, NSwitch, NUpload, NImage,
  NDescriptions, NDescriptionsItem, NText, NDivider, createDiscreteApi,
} from 'naive-ui'
import { EVENT_TYPES, EVENT_CATEGORIES } from '../config/eventTypes.js'

const { message } = createDiscreteApi(['message'])

const props = defineProps({
  show: Boolean,
  mode: { type: String, default: 'create' },
  artists: { type: Array, default: () => [] },
  editData: { type: Object, default: null },
  canEdit: { type: Boolean, default: false },
})
const emit = defineEmits(['update:show', 'mode-change', 'submit', 'delete', 'upload'])
const formRef = ref(null)
const submitting = ref(false)
const uploading = ref(false)

// ── 时间选择器必须用独立 ref（Naive UI bug: n-time-picker 不能绑定 reactive 属性） ──
const startTime = ref(null)
const endTime = ref(null)
const timeMode = ref('pending')

const artistOptions = computed(() =>
  props.artists.map((a) => ({
    label: `${a.emoji || ''} ${a.name}`,
    value: a.id,
  }))
)

const eventData = computed(() => props.editData || {})
const detailTime = computed(() => {
  const data = eventData.value
  if (data.is_all_day) return '全天'
  if (!data.start_time && !data.end_time) return '待定'
  if (!data.end_time) return data.start_time || '待定'
  return `${data.start_time || '--'} ~ ${data.end_time}`
})


// 详情模式：根据 artist_ids 查找艺人
const detailArtists = computed(() => {
  const ids = getArtistIds(eventData.value)
  return ids.map((id) => props.artists.find((a) => a.id === id)).filter(Boolean)
})

const form = reactive({
  artist_ids: [],
  title: '',
  type: '',
  category: '',
  is_all_day: false,
  start_date: '',
  end_date: '',
  location: '',
  notes: '',
  image_urls: [],
})

const dateRange = ref(null)

watch(dateRange, (val) => {
  if (val && val.length === 2) {
    form.start_date = val[0]
    form.end_date = val[1]
  }
})

const rules = {
  artist_ids: [
    { required: true, message: '请至少选择一位艺人', validator: (_, v) => v?.length > 0 },
  ],
  title: [{ required: true, message: '请输入标题' }],
  type: [{ required: true, message: '请选择行程类型' }],
  category: [{ required: true, message: '请选择线上/线下' }],
  start_date: [{ required: true, message: '请选择日期' }],
}

const modalTitle = computed(() => {
  if (props.mode === 'detail') return '行程详情'
  if (props.mode === 'edit') return '编辑行程'
  return '新增行程'
})

const dateLabel = computed(() =>
  eventData.value.is_all_day ? '日期' : '日期范围'
)

const formattedDate = computed(() => {
  const d = eventData.value
  if (!d.start_date) return '--'
  if (d.is_all_day || d.start_date === d.end_date) return d.start_date
  return `${d.start_date} ~ ${d.end_date}`
})

function switchMode(m) {
  emit('mode-change', m)
}

// 多选：切换艺人
function toggleArtist(id) {
  const idx = form.artist_ids.indexOf(id)
  if (idx >= 0) {
    form.artist_ids.splice(idx, 1)
  } else {
    form.artist_ids.push(id)
  }
}

// 兼容新旧数据：从 editData 中提取艺人 ID 列表
function getArtistIds(data) {
  if (!data) return []
  if (data.artist_ids?.length) return data.artist_ids
  // 兼容旧数据（单 artist_id）
  if (data.artist_id) return [data.artist_id]
  if (data.artists?.id) return [data.artists.id]
  return []
}

// Naive UI 的时间选择器使用毫秒时间戳，数据库 time 字段使用 HH:mm:ss。
function timeStringToTimestamp(value) {
  if (!value) return null
  if (typeof value === 'number') return value
  const [hours = 0, minutes = 0, seconds = 0] = String(value).split(':').map(Number)
  const date = new Date(1970, 0, 1, hours, minutes, seconds)
  return date.getTime()
}

function timestampToTimeString(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string') {
    const match = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/)
    if (!match) return null
    return `${match[1].padStart(2, '0')}:${match[2]}:${match[3] || '00'}`
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':')
}

function setTimeMode(mode) {
  timeMode.value = mode
  form.is_all_day = mode === 'allDay'
  if (mode !== 'specified') {
    startTime.value = null
    endTime.value = null
  }
}

function handleStartTimeChange(value) {
  if (value === null || value === undefined) {
    endTime.value = null
    return
  }
  endTime.value = new Date(value).getTime() + 60 * 60 * 1000
}

// 加载已有数据到表单
watch(
  () => props.editData,
  (data) => {
    if (!data) {
      resetForm()
      return
    }

    if (props.mode === 'create') {
      // 创建模式：只重置表单，但保留从日历点击传来的日期
      resetForm()
      if (data.start_date) {
        form.start_date = data.start_date
        form.end_date = data.end_date || data.start_date
        dateRange.value = [data.start_date, data.end_date || data.start_date]
      }
      return
    }

    // 编辑/详情模式：加载完整数据
    form.artist_ids = [...getArtistIds(data)]
    form.title = data.title || ''
    form.type = data.type || ''
    form.category = data.category || ''
    form.is_all_day = data.is_all_day || false
    timeMode.value = data.is_all_day
      ? 'allDay'
      : (data.start_time || data.end_time ? 'specified' : 'pending')
    form.start_date = data.start_date || ''
    form.end_date = data.end_date || ''
    form.location = data.location || ''
    form.notes = data.notes || ''
    form.image_urls = [...(data.image_urls || [])]
    dateRange.value = data.start_date && data.end_date
      ? [data.start_date, data.end_date]
      : null
    startTime.value = timeStringToTimestamp(data.start_time)
    endTime.value = timeStringToTimestamp(data.end_time)
  },
  { immediate: true }
)

function resetForm() {
  form.artist_ids = []
  form.title = ''
  form.type = ''
  form.category = ''
  form.is_all_day = false
  timeMode.value = 'pending'
  form.start_date = ''
  form.end_date = ''
  form.location = ''
  form.notes = ''
  form.image_urls = []
  dateRange.value = null
  startTime.value = null
  endTime.value = null
}

async function handleUpload({ file }) {
  uploading.value = true
  try {
    emit('upload', file.file, (url) => {
      form.image_urls.push(url)
    })
  } finally {
    uploading.value = false
  }
}

function removeImg(index) {
  form.image_urls.splice(index, 1)
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    const payload = {
      ...form,
      is_all_day: timeMode.value === 'allDay',
      start_time: timeMode.value === 'specified' ? timestampToTimeString(startTime.value) : null,
      end_time: timeMode.value === 'specified' ? timestampToTimeString(endTime.value) : null,
      end_date: timeMode.value === 'allDay'
        ? form.start_date
        : (form.end_date || form.start_date),
      // 兼容旧表：artist_id 取数组第一位
      artist_id: form.artist_ids[0] || null,
    }
    emit('submit', payload)
  } finally {
    submitting.value = false
  }
}

function handleDelete() {
  emit('delete', eventData.value.id)
}

function handleClose() {
  if (props.mode !== 'detail') {
    resetForm()
  }
}
</script>

<style scoped>
@media (max-width: 600px) {
  .form-grid { grid-template-columns: minmax(0, 1fr) !important; }
  :deep(.n-card__content) { padding: 14px !important; overflow-y: auto; }
  :deep(.n-card-header) { padding: 14px !important; }
  :deep(.n-date-picker), :deep(.n-time-picker) { width: 100% !important; }
}
</style>
