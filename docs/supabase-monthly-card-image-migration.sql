-- RecordTrack：为月度行程卡片增加独立图片字段
-- 在 Supabase SQL Editor 中执行一次即可。

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS card_image_url text;
