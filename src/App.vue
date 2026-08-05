<template>
  <main v-if="!selectedMode" class="entry-shell">
    <section class="entry-card">
      <h1>📅 RecordTrack</h1>
      <p>请选择进入方式</p>
      <button type="button" class="entry-button" @click="openApp('viewer')">
        <span>👀 查看行程</span>
        <small>仅查看，不可修改</small>
      </button>
      <button type="button" class="entry-button entry-button-primary" @click="openApp('admin')">
        <span>🔐 管理行程</span>
        <small>需要输入管理密码</small>
      </button>
    </section>
  </main>

  <Suspense>
    <template #fallback>
      <main class="loading-shell">正在加载行程…</main>
    </template>
    <RecordTrackApp v-if="selectedMode" :initial-mode="selectedMode" />
  </Suspense>
</template>

<script setup>
import { defineAsyncComponent, onMounted, ref } from 'vue'

const selectedMode = ref('')
const loadRecordTrackApp = () => import('./RecordTrackApp.vue')
const RecordTrackApp = defineAsyncComponent(loadRecordTrackApp)

function openApp(mode) {
  selectedMode.value = mode
}

onMounted(() => {
  const preload = () => loadRecordTrackApp()
  if ('requestIdleCallback' in window) window.requestIdleCallback(preload, { timeout: 1500 })
  else window.setTimeout(preload, 300)
})
</script>

<style>
* { box-sizing: border-box; }
body { margin: 0; font-family: 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif; background: #f5f6fa; color: #222; }
.loading-shell { min-height: 100vh; display: grid; place-items: center; color: #888; }
.entry-shell { min-height: 100vh; display: grid; place-items: center; padding: 20px; }
.entry-card { width: min(92vw, 400px); padding: 28px; background: #fff; border-radius: 16px; box-shadow: 0 10px 35px rgba(0,0,0,.08); text-align: center; }
.entry-card h1 { margin: 0; font-size: 28px; }
.entry-card p { margin: 8px 0 22px; color: #888; }
.entry-button { width: 100%; min-height: 64px; margin-top: 12px; padding: 10px 16px; border: 1px solid #ddd; border-radius: 9px; background: #fff; color: #222; cursor: pointer; font: inherit; }
.entry-button span, .entry-button small { display: block; }
.entry-button span { font-size: 16px; font-weight: 600; }
.entry-button small { margin-top: 3px; color: #888; }
.entry-button-primary { border-color: #ff6b6b; background: #ff6b6b; color: #fff; }
.entry-button-primary small { color: rgba(255,255,255,.82); }
</style>
