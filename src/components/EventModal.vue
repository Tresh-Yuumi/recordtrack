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
          <n-tag :color="{ color: eventData.artists?.color }" size="small">
            {{ eventData.artists?.emoji }} {{ eventData.artists?.name }}
          </n-tag>
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
        <n-descriptions-item label="时间">
          {{ eventData.is_all_day ? '全天' : `${eventData.start_time || '--'} ~ ${eventData.end_time || '--'}` }}
        </n-descriptions-item>
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
        <n-button @click="handleDelete" type="error" ghost>删除</n-button>
        <n-button @click="switchMode('edit')" type="primary">编辑</n-button>
        <n-button @click="emit('update:show', false)">关闭</n-button>
      </n-space>
    </template>

    <!-- ============ 创建 / 编辑模式 ============ -->
    <template v-else>
      <n-form ref="formRef" :model="form" label-placement="top" :rules="rules">
        <!-- 艺人选择（标签点选） -->
        <n-form-item label="艺人" path="artist_id">
          <n-space>
            <n-tag
              v-for="a in artists"
              :key="a.id"
              :type="form.artist_id === a.id ? 'primary' : 'default'"
              checkable
              :checked="form.artist_id === a.id"
              :style="{
                cursor: 'pointer',
                borderColor: a.color,
                color: form.artist_id === a.id ? '#fff' : a.color,
                backgroundColor: form.artist_id === a.id ? a.color : 'transparent',
              }"
              @click="form.artist_id = a.id"
            >
              {{ a.emoji || '' }} {{ a.name }}
            </n-tag>
          </n-space>
        </n-form-item>

        <!-- 行程标题 -->
        <n-form-item label="标题" path="title">
          <n-input v-model:value="form.title" placeholder="例如：品牌活动站台" />
        </n-form-item>

        <!-- 类型 -->
        <n-form-item label="行程类型" path="type">
          <n-space>
            <n-button
              v-for="t in EVENT_TYPES"
              :key="t"
              :type="form.type === t ? 'primary' : 'default'"
              size="small"
              @click="form.type = t"
            >
              {{ t }}
            </n-button>
          </n-space>
        </n-form-item>

        <!-- 线上 / 线下 -->
        <n-form-item label="分类" path="category">
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
        </n-form-item>

        <!-- 日期范围 -->
        <n-form-item label="日期" path="start_date">
          <n-date-picker
            v-model:formatted-value="dateRange"
            type="daterange"
            format="yyyy-MM-dd"
            value-format="yyyy-MM-dd"
            clearable
          />
        </n-form-item>

        <!-- 全天开关 -->
        <n-form-item label="全天">
          <n-switch v-model:value="form.is_all_day" />
        </n-form-item>

        <!-- 时间选择（非全天时显示）。注意：n-time-picker 必须绑定独立 ref，不能绑定 reactive 属性 -->
        <n-form-item v-if="!form.is_all_day" label="时间">
          <n-space align="center">
            <n-time-picker
              v-model:value="startTime"
              format="HH:mm"
              clearable
              placeholder="开始"
            />
            <n-text depth="3">~</n-text>
            <n-time-picker
              v-model:value="endTime"
              format="HH:mm"
              clearable
              placeholder="结束"
            />
          </n-space>
        </n-form-item>

        <!-- 地点 -->
        <n-form-item label="地点">
          <n-input v-model:value="form.location" placeholder="城市 / 场馆名" />
        </n-form-item>

        <!-- 备注 -->
        <n-form-item label="备注">
          <n-input
            v-model:value="form.notes"
            type="textarea"
            placeholder="其他备注信息"
            :rows="2"
          />
        </n-form-item>

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
  NModal, NForm, NFormItem, NInput, NSelect, NButton, NSpace,
  NTag, NDatePicker, NTimePicker, NSwitch, NUpload, NImage,
  NDescriptions, NDescriptionsItem, NText, createDiscreteApi,
} from 'naive-ui'
import { EVENT_TYPES, EVENT_CATEGORIES } from '../config/eventTypes.js'

const { message } = createDiscreteApi(['message'])

const props = defineProps({
  show: Boolean,
  mode: { type: String, default: 'create' },
  artists: { type: Array, default: () => [] },
  editData: { type: Object, default: null },
})
const emit = defineEmits(['update:show', 'mode-change', 'submit', 'delete', 'upload'])
const formRef = ref(null)
const submitting = ref(false)
const uploading = ref(false)

// ── 时间选择器必须用独立 ref（Naive UI bug: n-time-picker 不能绑定 reactive 属性） ──
const startTime = ref(null)
const endTime = ref(null)

const artistOptions = computed(() =>
  props.artists.map((a) => ({
    label: `${a.emoji || ''} ${a.name}`,
    value: a.id,
  }))
)

const eventData = computed(() => props.editData || {})

const form = reactive({
  artist_id: null,
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
  artist_id: [{ required: true, message: '请选择艺人' }],
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

// 加载已有数据到表单
watch(
  () => props.editData,
  (data) => {
    if (!data || props.mode === 'create') {
      resetForm()
      return
    }
    form.artist_id = data.artist_id || data.artists?.id || null
    form.title = data.title || ''
    form.type = data.type || ''
    form.category = data.category || ''
    form.is_all_day = data.is_all_day || false
    form.start_date = data.start_date || ''
    form.end_date = data.end_date || ''
    form.location = data.location || ''
    form.notes = data.notes || ''
    form.image_urls = [...(data.image_urls || [])]
    dateRange.value = data.start_date && data.end_date
      ? [data.start_date, data.end_date]
      : null
    // 独立 ref 绑定时间
    startTime.value = data.start_time || null
    endTime.value = data.end_time || null
  },
  { immediate: true }
)

function resetForm() {
  form.artist_id = null
  form.title = ''
  form.type = ''
  form.category = ''
  form.is_all_day = false
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
      start_time: form.is_all_day ? null : (startTime.value || null),
      end_time: form.is_all_day ? null : (endTime.value || null),
      end_date: form.is_all_day
        ? form.start_date
        : (form.end_date || form.start_date),
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
