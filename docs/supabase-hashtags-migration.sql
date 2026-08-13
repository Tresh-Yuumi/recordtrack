-- RecordTrack：为现有 events 表增加可选 Hashtag 数组
-- 在 Supabase Dashboard → SQL Editor 中执行一次即可。

ALTER TABLE events
ADD COLUMN IF NOT EXISTS hashtags text[] NOT NULL DEFAULT '{}';
