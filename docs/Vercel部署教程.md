# RecordTrack Vercel 部署教程

## 概述

RecordTrack 是一个纯前端 Vue 3 SPA 应用，数据存储在 Supabase。Vercel 是最适合的免费托管方案，部署后你将获得一个公网 URL，手机和电脑随时可访问。

**预计耗时**：15-20 分钟（首次还需注册账号）

---

## 第一步：注册 Vercel 账号（如已有可跳过）

1. 打开 [vercel.com](https://vercel.com)
2. 点击 **Sign Up** → 选择 **Continue with GitHub**
3. 授权 Vercel 访问你的 GitHub 账号
4. 按照提示完成注册

> Vercel 免费额度：每月 100 GB 带宽、100 次部署，完全够个人使用。

---

## 第二步：注册 GitHub 账号（如已有可跳过）

1. 打开 [github.com](https://github.com)
2. 点击 **Sign up** 注册账号
3. 完成邮箱验证

---

## 第三步：将代码推送到 GitHub

### 3.1 在项目根目录初始化 Git

```bash
cd d:\MyFile\claude\FanTrackProject

# 初始化 Git 仓库
git init

# 确保 .gitignore 存在（已创建，包含 node_modules 等）
# 如果不存在，创建它：
# echo "node_modules\ndist\n.env" > .gitignore
```

### 3.2 在 GitHub 上创建仓库

1. 打开 [github.com/new](https://github.com/new)
2. **Repository name** 填写：`recordtrack`（或任意你想要的名字）
3. **Private** 保持选中（推荐设为私有）
4. **不要**勾选 "Add a README file"（我们已有代码）
5. 点击 **Create repository**

### 3.3 推送代码

创建仓库后，GitHub 会显示一段命令。复制并执行：

```bash
git add .
git commit -m "初始提交：RecordTrack 行程日历"
git branch -M main
git remote add origin https://github.com/你的用户名/recordtrack.git
git push -u origin main
```

> ⚠️ 推送前确认 `.env` 文件已被 `.gitignore` 忽略！绝不要把含密钥的 `.env` 推送到 GitHub。

---

## 第四步：在 Vercel 部署

### 4.1 导入项目

1. 打开 [vercel.com/dashboard](https://vercel.com/dashboard)
2. 点击 **Add New...** → 选择 **Project**
3. 找到 `recordtrack` 仓库，点击 **Import**
4. 如果没看到，点 **Adjust GitHub App Permissions** 授权

### 4.2 配置项目

Vercel 会自动识别 Vite 项目，无需修改构建配置：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| Framework Preset | Vite | 自动检测 |
| Build Command | `npm run build` | 默认 |
| Output Directory | `dist` | 默认 |
| Install Command | `npm install` | 默认 |

### 4.3 配置环境变量（⚠️ 关键步骤）

点击 **Environment Variables** 展开，添加以下 3 个变量：

| 变量名 | 值（来自你的 `.env` 文件） |
|--------|---------------------------|
| `VITE_SUPABASE_URL` | `https://bsmsfssgmyteqbynqkqx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzbXNmc3NnbXl0ZXFieW5xa3F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3OTM3MDEsImV4cCI6MjEwMDM2OTcwMX0.JUdehIfZfrqdZalC9NJbddQVsJBO4d7p5F6zVxs3KAU` |
| `VITE_MY_USER_ID` | `5cb725e8-95f5-40ce-a0d7-bd0e28740362` |

### 4.4 部署

点击 **Deploy** 按钮，等待 1-2 分钟构建完成。

---

## 第五步：访问你的应用

部署成功后，Vercel 会显示：

```
🎉 部署成功！
https://recordtrack-xxxxx.vercel.app
```

这个 URL 就是你的公网地址：

- ✅ **电脑浏览器**直接打开
- ✅ **手机浏览器**直接打开（任何网络，无需局域网）
- ✅ **分享给别人**也能打开

---

## 后续更新代码

当你修改了代码想更新线上版本，只需：

```bash
git add .
git commit -m "描述你的改动"
git push
```

Vercel 会自动检测到 GitHub 推送，自动重新部署。无需任何额外操作。

---

## 绑定自定义域名（可选）

1. 在 Vercel 项目页面 → **Settings** → **Domains**
2. 输入你的域名（如 `track.yourdomain.com`）
3. 按提示在域名 DNS 添加一条 CNAME 记录指向 `cname.vercel-dns.com`
4. 等待 DNS 生效即可

> 没有自己的域名可以跳过这一步，`vercel.app` 域名完全够用。

---

## 故障排查

| 问题 | 解决方法 |
|------|---------|
| 页面空白 | 检查 Vercel 环境变量是否配齐（3 个都必须有） |
| 数据加载失败 | 确认 Supabase 项目状态为 Active（免费版长时间不用会暂停） |
| 部署失败 | 在 Vercel → Deployments → 点击失败的部署 → 查看构建日志 |
| 路由 404 | 确认 `vercel.json` 文件存在且内容正确 |
