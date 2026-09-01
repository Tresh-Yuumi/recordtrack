-- ============================================================
-- RecordTrack 数据库 Schema
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================================

-- 1. 创建艺人表
CREATE TABLE IF NOT EXISTS artists (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL,
  name      text NOT NULL,
  emoji     text DEFAULT '',
  color     text DEFAULT '#999',
  created_at timestamptz DEFAULT now()
);

-- 2. 创建行程表（新版：支持多艺人）
CREATE TABLE IF NOT EXISTS events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  artist_ids  uuid[] NOT NULL DEFAULT '{}',   -- ★ 多艺人支持：UUID 数组
  title       text NOT NULL DEFAULT '',
  type        text DEFAULT '',                -- 商务站台 / 演唱会 / 见面会 / ...
  category    text DEFAULT '',                -- 线上 / 线下
  is_all_day  boolean DEFAULT false,
  start_date  date NOT NULL,
  end_date    date DEFAULT NULL,
  start_time  time DEFAULT NULL,
  end_time    time DEFAULT NULL,
  location    text DEFAULT '',
  notes       text DEFAULT '',
  hashtags    text[] NOT NULL DEFAULT '{}',
  image_urls  text[] DEFAULT '{}',
  card_image_url text,
  created_at  timestamptz DEFAULT now()
);

-- 已创建 events 表的现有项目也会补充该字段
ALTER TABLE events ADD COLUMN IF NOT EXISTS hashtags text[] NOT NULL DEFAULT '{}';
ALTER TABLE events ADD COLUMN IF NOT EXISTS card_image_url text;

-- 3. 索引
CREATE INDEX IF NOT EXISTS idx_artists_user ON artists(user_id);
CREATE INDEX IF NOT EXISTS idx_events_user   ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_artist_ids ON events USING gin(artist_ids);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);

-- 4. RLS 策略（无登录模式，按 user_id 隔离）
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE events  ENABLE ROW LEVEL SECURITY;

-- 允许匿名读（按 user_id 过滤）
CREATE POLICY "anon_select_artists" ON artists FOR SELECT USING (true);
CREATE POLICY "anon_select_events"  ON events  FOR SELECT USING (true);

-- 允许匿名写（应用层通过 user_id 隔离）
CREATE POLICY "anon_insert_artists" ON artists FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_insert_events"  ON events  FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_artists" ON artists FOR UPDATE USING (true);
CREATE POLICY "anon_update_events"  ON events  FOR UPDATE USING (true);
CREATE POLICY "anon_delete_artists" ON artists FOR DELETE USING (true);
CREATE POLICY "anon_delete_events"  ON events  FOR DELETE USING (true);

-- 5. 插入三位默认艺人
INSERT INTO artists (id, user_id, name, emoji, color) VALUES
  ('11111111-aaaa-1111-aaaa-111111111111', '5cb725e8-95f5-40ce-a0d7-bd0e28740362', 'Perth',  '🖤', '#000000'),
  ('22222222-bbbb-2222-bbbb-222222222222', '5cb725e8-95f5-40ce-a0d7-bd0e28740362', 'Santa',  '🤍', '#FFFFFF'),
  ('33333333-cccc-3333-cccc-333333333333', '5cb725e8-95f5-40ce-a0d7-bd0e28740362', 'Domiia', '❤️', '#FF0000')
ON CONFLICT (id) DO NOTHING;
