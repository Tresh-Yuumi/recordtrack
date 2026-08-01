-- ============================================================
-- RecordTrack：访客只读 + 密码管理模式
-- 前端和 Vercel API 部署完成并测试后，再在 Supabase SQL Editor 执行。
-- ============================================================

ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 移除旧版匿名读写策略。
DROP POLICY IF EXISTS "anon_select_artists" ON public.artists;
DROP POLICY IF EXISTS "anon_select_events" ON public.events;
DROP POLICY IF EXISTS "anon_insert_artists" ON public.artists;
DROP POLICY IF EXISTS "anon_insert_events" ON public.events;
DROP POLICY IF EXISTS "anon_update_artists" ON public.artists;
DROP POLICY IF EXISTS "anon_update_events" ON public.events;
DROP POLICY IF EXISTS "anon_delete_artists" ON public.artists;
DROP POLICY IF EXISTS "anon_delete_events" ON public.events;
DROP POLICY IF EXISTS "user_isolation" ON public.artists;
DROP POLICY IF EXISTS "user_isolation" ON public.events;

-- 访客只能读取。服务端 Secret/Service Role Key 不受这些匿名策略限制。
CREATE POLICY "viewer_select_artists"
  ON public.artists FOR SELECT TO anon USING (true);

CREATE POLICY "viewer_select_events"
  ON public.events FOR SELECT TO anon USING (true);

GRANT SELECT ON public.artists, public.events TO anon;
REVOKE INSERT, UPDATE, DELETE ON public.artists, public.events FROM anon;

-- Storage：保留公开图片读取，移除所有匿名写入能力。
DROP POLICY IF EXISTS "allow_upload" ON storage.objects;
DROP POLICY IF EXISTS "allow_update" ON storage.objects;
DROP POLICY IF EXISTS "allow_delete" ON storage.objects;

-- 若旧策略名称不同，请在 Dashboard > Storage > Policies 中确认：
-- anon 只能 SELECT event-images，不能 INSERT / UPDATE / DELETE。
