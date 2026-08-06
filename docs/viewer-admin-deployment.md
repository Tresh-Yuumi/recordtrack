# 查看模式与管理模式部署

## Vercel 环境变量

除原来的三个 `VITE_*` 变量外，在 Vercel 项目中增加：

- `SUPABASE_URL`：Supabase 项目 URL。
- `SUPABASE_SECRET_KEY`：Supabase Secret Key；旧项目可使用 Service Role Key。仅限服务端。
- `APP_USER_ID`：当前 RecordTrack 固定用户 UUID。
- `ADMIN_PASSWORD`：进入管理模式的密码。
- `ADMIN_SESSION_SECRET`：用于签署管理会话，建议使用至少 32 字节随机字符串。
- `DEEPSEEK_API_KEY`：DeepSeek API Key，仅用于服务端快速录入解析。
- `DEEPSEEK_MODEL`：填写 `deepseek-v4-flash`，使用低延迟模型。

这些变量不要添加 `VITE_` 前缀，也不要提交真实值到 Git。

## 部署顺序

1. 先部署本版本和上述 Vercel 环境变量。
2. 在线上分别验证“查看行程”和“管理行程”。
3. 验证管理模式可以新增、编辑、删除、上传图片和导入备份。
4. 最后执行 `docs/enable-viewer-admin-access.sql` 收紧匿名权限。
5. 退出管理模式后再次确认只能读取，不能通过 Supabase anon key 写入。

## 使用方式

- 普通链接进入后可选择查看或管理。
- `/?mode=view` 会直接进入查看模式，适合分享。
- 管理会话默认保持 30 天；点击“退出管理”可立即清除。

## 本地开发

纯 `vite` 开发服务器不会运行 Vercel `/api` 函数，因此只能验证查看界面。需要联调管理模式时使用 Vercel 本地开发环境，或部署 Preview 环境进行验证。
