# 行程日历 - 自用开发文档 (Project Spec)

> **项目代号**：RecordTrack  
> **技术形态**：纯前端单页应用 (SPA) + BaaS 云服务  
> **核心目标**：记录多位艺人行程，支持图片上传，按艺人颜色区分日历视图，数据云端互通且无需登录。

---

## 1. 技术栈选型 (Tech Stack)
| 类别              | 技术选型                               | 备注                                   |
| :---------------- | :------------------------------------- | :------------------------------------- |
| **前端框架**      | Vue 3 (Composition API) + Vite         | 启动快，响应式                         |
| **日历组件**      | FullCalendar v6 (`@fullcalendar/vue3`) | 专业日历，支持日/周/月视图             |
| **UI 组件库**     | Naive UI                               | 美观且按需引入，弹窗/表单/卡片开箱即用 |
| **云数据库/存储** | Supabase (PostgreSQL + Storage)        | 免费额度足够，支持行级安全策略         |
| **HTTP 客户端**   | `@supabase/supabase-js`                | 官方 SDK                               |
| **部署平台**      | Vercel / Netlify                       | Git 关联，自动构建部署                 |

---

## 2. 环境变量配置 (`.env`)

在项目根目录创建 `.env` 文件，填入以下内容（**不要提交到 GitHub**）：

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxx
VITE_MY_USER_ID=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
```

> **特别注意**：`VITE_MY_USER_ID` 是“无登录”的关键。请先在 Supabase 后台生成一个固定的 UUID（随便用在线工具生成），后续所有数据库 RLS 策略只认这个 ID。

---

## 3. 数据库设计 (Supabase SQL)

在 Supabase 的 **SQL Editor** 中按顺序执行以下语句，一键建表并设置安全策略。

### 3.1 创建 `artists` (艺人表)
```sql
CREATE TABLE artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#808080',
  emoji TEXT,
  user_id UUID NOT NULL -- 关联到固定用户ID，保证数据隔离
);

-- 插入默认三位艺人（颜色沿用之前约定：珊瑚红、蒂芙尼蓝、芒果黄）
INSERT INTO artists (id, name, color, user_id) VALUES 
  ('11111111-aaaa-1111-aaaa-111111111111', 'Perth', '#FF6B6B', '5cb725e8-95f5-40ce-a0d7-bd0e28740362'),
  ('22222222-bbbb-2222-bbbb-222222222222', 'Santa', '#4ECDC4', '5cb725e8-95f5-40ce-a0d7-bd0e28740362'),
  ('33333333-cccc-3333-cccc-333333333333', 'Domiia', '#FFD93D', '5cb725e8-95f5-40ce-a0d7-bd0e28740362');
```

### 3.2 创建 `events` (行程主表)
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 枚举：商务站台,演唱会,见面会,商务直播,剧宣,社媒
  category TEXT NOT NULL, -- 枚举：线下,线上
  is_all_day BOOLEAN DEFAULT false,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  notes TEXT,
  image_urls TEXT[] DEFAULT '{}', -- 存储图片公网链接数组
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 创建索引提升查询速度
CREATE INDEX idx_events_user_date ON events(user_id, start_date);
```

### 3.3 设置 RLS (行级安全策略) —— 最重要的一步！
```sql
-- 开启行级安全
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 策略：只允许你的固定ID增删改查（彻底屏蔽外人）
CREATE POLICY "user_isolation" ON artists
  FOR ALL USING (user_id = '你的固定用户ID');

CREATE POLICY "user_isolation" ON events
  FOR ALL USING (user_id = '你的固定用户ID');
```

---

## 4. Supabase Storage (图片存储) 配置

1. 在 Supabase Dashboard -> **Storage** 中新建一个 Bucket，命名为 `event-images`。
2. 将 Bucket 权限设置为 **Public**（这样图片链接无需带 token 即可直接渲染）。
3. 在 **Storage Policies** 中添加以下宽松策略（因为是自用，且受 RLS 保护）：

```sql
-- 允许所有人查看 (Public 桶默认已开，若未开则执行)
CREATE POLICY "give_public_access" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-images');

-- 允许上传 (无登录限制，但只有知道URL的人能操作)
CREATE POLICY "allow_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'event-images');
```

---

## 5. 项目文件夹结构 (必须照做)

```text
record-track/
├── index.html
├── package.json
├── vite.config.js
├── .env
├── src/
│   ├── main.js                # Vue 入口，全局引入 Naive UI
│   ├── App.vue                # 根组件
│   ├── config/
│   │   └── artists.js         # 导出默认三位艺人 ID 及颜色 (硬编码备用于前端快速渲染)
│   ├── lib/
│   │   └── supabase.js        # 初始化 supabase 客户端并导出
│   ├── composables/
│   │   └── useCalendar.js     # 封装增删改查、图片上传、JSON导出的逻辑
│   └── components/
│       ├── CalendarView.vue   # 包裹 FullCalendar 的主视图
│       └── EventModal.vue     # 新增/编辑/详情 的共用弹窗 (含图片上传)
└── README.md
```

---

## 6. 核心编码逻辑 (分步实现指南)

### 6.1 初始化 Supabase 客户端 (`src/lib/supabase.js`)
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const MY_USER_ID = import.meta.env.VITE_MY_USER_ID;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 6.2 FullCalendar 数据映射 (`CalendarView.vue`)
FullCalendar 的事件源要求 `start` 和 `end` 必须是标准 ISO 字符串。根据 `is_all_day` 进行拼接：

```javascript
function formatEventForCalendar(dbEvent) {
  const startStr = dbEvent.is_all_day 
    ? dbEvent.start_date 
    : `${dbEvent.start_date}T${dbEvent.start_time}`;
  const endStr = dbEvent.is_all_day 
    ? dbEvent.end_date 
    : `${dbEvent.end_date}T${dbEvent.end_time}`;
    
  return {
    id: dbEvent.id,
    title: dbEvent.title,
    start: startStr,
    end: endStr,
    allDay: dbEvent.is_all_day,
    backgroundColor: dbEvent.artists?.color || '#999',
    borderColor: dbEvent.artists?.color || '#999',
    extendedProps: { ...dbEvent } // 把原始数据挂载到扩展属性，供弹窗调用
  };
}
```

### 6.3 图片上传逻辑 (`composables/useCalendar.js`)
核心：上传 -> 获取公网 URL -> 存入数据库 `image_urls` 数组。

```javascript
async function uploadAndSaveImage(file) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
  const filePath = `public/${fileName}`;

  const { error } = await supabase.storage
    .from('event-images')
    .upload(filePath, file);

  if (error) throw error;

  const { data } = supabase.storage
    .from('event-images')
    .getPublicUrl(filePath);
    
  return data.publicUrl;
}
```

### 6.4 JSON 导入/导出备份功能
这是你明确要求的“手动备份”方案：

**导出 (Export)**：从数据库拉取全部数据，生成 `.json` 并下载。
```javascript
async function exportData() {
  const { data: events } = await supabase.from('events').select('*').eq('user_id', MY_USER_ID);
  const { data: artists } = await supabase.from('artists').select('*').eq('user_id', MY_USER_ID);
  const blob = new Blob([JSON.stringify({ events, artists }, null, 2)], { type: 'application/json' });
  // 创建 a 标签下载 ...
}
```

**导入 (Import)**：用户选择 JSON 文件，读取后批量 Upsert（存在则更新，不存在则插入）。
```javascript
async function importData(jsonFile) {
  const text = await jsonFile.text();
  const data = JSON.parse(text);
  
  // 注意：导入前最好清空现有数据，或使用 upsert 去重
  const { error } = await supabase.from('events').upsert(data.events, { onConflict: 'id' });
  // 同样处理 artists
}
```

### 6.5 页面交互流 (点击日历)
- **点击空白日期 (`dateClick`)**：弹出 `EventModal.vue`，模式为 `'create'`，自动填入 `start_date`。
- **点击已有事件 (`eventClick`)**：弹出 `EventModal.vue`，模式为 `'detail'`，通过 `arg.event.extendedProps` 传递完整数据，支持点击“编辑”按钮切换为 `'edit'` 模式。

---

## 7. 前端 UI 配色与交互细节 (体验优化)

- **顶部筛选栏**：展示三个彩色小圆点（代表默认三位艺人），默认全选。点击取消某个圆点，FullCalendar 重新 `refetch` 并过滤掉对应 `artist_id` 的数据。
- **行程类型录入**：使用 Naive UI 的 `NSpace` 包裹 6 个按钮（`商务站台`、`演唱会`等），点击后高亮选中；**线上/线下** 单独用两个 `NTag` 切换。
- **全天开关**：使用 `NSwitch`，开启后隐藏时间选择器。

---

## 8. 构建与部署 (Deployment)

由于是纯静态资源，部署极其简单：

1. **本地测试**：`npm run dev` 确保一切正常。
2. **构建产物**：`npm run build` 生成 `dist` 文件夹。
3. **部署到 Vercel**：
   - 将项目推送到 GitHub 私有仓库。
   - 登录 Vercel，Import 该仓库。
   - **重要**：在 Vercel 项目的 Environment Variables 中，手动添加 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY` 和 `VITE_MY_USER_ID`。
   - 点击 Deploy，一分钟内即可上线获得公网地址。

---

## 9. 开发注意事项 (防坑指南)

1. **时区问题**：FullCalendar 默认会将 `start` 字符串解析为本地时间。由于我们存储的是日期（`YYYY-MM-DD`）或纯时间（`HH:MM:SS`），建议在 FullCalendar 初始化时设置 `timeZone: 'local'` 以避免日期偏移。
2. **图片上传大小限制**：Supabase 免费版单文件上限 50MB，建议在前端进行图片压缩（例如使用 `compressorjs`）或限制仅上传 5MB 以内图片。
3. **CORS 问题**：若在本地 `localhost` 测试上传图片遇到跨域，需在 Supabase Dashboard -> Storage -> Configuration -> CORS 中添加 `http://localhost:5173` 到白名单。

---

## 10. 后续可扩展方向 (不在本期范围)

- **推送提醒**：对接浏览器 Notification API，行程当天弹窗提醒。
- **分享海报**：使用 `html2canvas` 将行程卡片生成图片分享到粉丝群。
- **云函数爬虫**：用 Supabase Edge Functions 定时抓取艺人工作室微博，自动生成行程草稿。

---

