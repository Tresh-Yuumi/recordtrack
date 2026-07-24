-- ============================================================
-- 迁移脚本：单艺人 → 多艺人
-- 如果 events 表已存在（使用 artist_id 单 UUID），执行此脚本
-- ============================================================

-- 1. 解除旧列 NOT NULL 约束（否则插入时报错）
ALTER TABLE events ALTER COLUMN artist_id DROP NOT NULL;

-- 2. 添加新列
ALTER TABLE events ADD COLUMN IF NOT EXISTS artist_ids uuid[] DEFAULT '{}';

-- 3. 把旧 artist_id 数据迁移到新列
UPDATE events
SET artist_ids = ARRAY[artist_id]
WHERE artist_id IS NOT NULL AND (artist_ids IS NULL OR array_length(artist_ids, 1) IS NULL);

-- 4. 添加 GIN 索引（提升数组查询性能）
CREATE INDEX IF NOT EXISTS idx_events_artist_ids ON events USING gin(artist_ids);

-- 5. （可选）如有引用旧列的外键约束，先删除
-- ALTER TABLE events DROP CONSTRAINT IF EXISTS events_artist_id_fkey;

-- 6. （可选）删除旧列（确认前端已完全切换到 artist_ids 后再执行）
-- ALTER TABLE events DROP COLUMN IF EXISTS artist_id;
