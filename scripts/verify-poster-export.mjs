// Run with Vite available at POSTER_TEST_URL; PLAYWRIGHT_MODULE may point to a shared installation.
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const output = await mkdtemp(join(tmpdir(), 'recordtrack-poster-'))
const base = process.env.POSTER_TEST_URL || 'http://127.0.0.1:5175'
const results = []
try {
  for (const width of [375, 390, 812, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: width < 500 ? 3 : 1 })
    await page.route('**/__poster-test', route => route.fulfill({ contentType: 'text/html', body: `
      <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
      <style>* { box-sizing: border-box } body { margin: 0; font-family: Arial, sans-serif }</style></head>
      <body><div id="app"></div><script type="module">
      import { createApp, h } from '/node_modules/.vite/deps/vue.js';
      import Poster from '/src/components/MonthlyCardView.vue';
      const events = Array.from({length: 11}, (_, i) => ({ id: i, title: i === 1 ? 'RALPH LAUREN 拉夫劳伦 RALPH’S CLUB NEW YORK BAR 香水发布会' : 'MONTHLY EVENT 行程 ' + i,
        start_date: '2026-09-' + String(i + 1).padStart(2, '0'), end_date: '2026-09-' + String(i + 2).padStart(2, '0'),
        start_time: '19:00', location: 'The Mall lifestore Bangkapi 完整地点文字', artist_ids: [1, 2] }));
      createApp({render: () => h(Poster, { events, artists: [{id: 1, name: 'PERTH', emoji: '🖤'}, {id: 2, name: 'SANTA', emoji: '🤍'}] })}).mount('#app');
      </script></body></html>` }))
    await page.goto(base + '/__poster-test')
    await page.locator('input[type=month]').fill('2026-09')
    const downloadPromise = page.waitForEvent('download', { timeout: 60000 })
    await page.getByRole('button', { name: '下载海报' }).click()
    const download = await downloadPromise
    const path = join(output, `poster-${width}.png`)
    await download.saveAs(path)
    const bytes = await readFile(path)
    if (results.length) {
      const reference = await readFile(results[0].path)
      const difference = await page.evaluate(async ([a, b]) => {
        async function pixels(base64) {
          const bitmap = await createImageBitmap(await (await fetch('data:image/png;base64,' + base64)).blob())
          const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height
          const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0)
          return ctx.getImageData(0, 0, canvas.width, canvas.height)
        }
        const x = await pixels(a), y = await pixels(b)
        let count = 0, minX = x.width, minY = x.height, maxX = 0, maxY = 0
        for (let i = 0; i < x.data.length; i += 4) if ([0,1,2,3].some(c => x.data[i+c] !== y.data[i+c])) {
          count++; const px = (i/4) % x.width, py = Math.floor(i/4/x.width)
          minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py)
        }
        return {count, fraction: count / (x.width * x.height), minX, maxX, minY, maxY}
      }, [reference.toString('base64'), bytes.toString('base64')])
      console.log('pixel difference', width, difference)
      // Browser text antialiasing may vary slightly; reject meaningful layout/pixel changes.
      assert.ok(difference.fraction < 0.0001, 'More than 0.01% of export pixels changed')
    }
    results.push({ viewport: width, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), hash: createHash('sha256').update(bytes).digest('hex'), path })
    assert.equal(await page.locator('.poster-export').count(), 0, 'Export copy must be cleaned up')
    await page.close()
  }
  console.log(JSON.stringify(results, null, 2))
  for (const result of results) {
    assert.equal(result.width, results[0].width)
    assert.equal(result.height, results[0].height)
  }
} finally { await browser.close() }
