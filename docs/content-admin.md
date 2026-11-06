# 网页内容管理

采用 Decap CMS 3.17.3，脚本随站点托管。目标仓库为 `shadow1703637220-byte/shadow1703637220-byte.github.io`，分支 `main`，域名 `aven.nixinhai.top`。

## 日常使用

访问 `https://aven.nixinhai.top/admin/`，使用对该仓库有写权限的 GitHub 账号登录。选择“网站内容”，修改表单、上传图片，点击发布。后台自动生成 Git 提交，GitHub Actions 构建并发布 Pages；通常需要等待几分钟。无需手动修改代码或提交文件。发布历史保留在仓库中，失败构建不会覆盖已上线的版本。

可编辑首页文字、头像与背景、介绍、兴趣、经历、创作桌面文案、联系方式、社交链接、作品及排序、文章推荐卡片、地区足迹、灵感相册。文章推荐编辑标题、摘要和全文链接，现有博客全文仍在原博客系统编辑。布局、动效和声音属于页面程序，不在内容后台中修改。

## 本地体验

保留 Vite 开发服务运行，另一个终端执行 `npm run cms`。访问 `http://127.0.0.1:5174/admin/`，本地模式无须 GitHub 登录，编辑保存会直接写入 `content/*.json` 和 `public/uploads/`。刷新首页查看效果。只运行 Vite 而未启动 CMS 代理时，后台无法加载内容。不要把本地编辑代理暴露到公网。

## 一次性上线接入（尚未完成）

1. 将本项目合入目标仓库。已从原仓库 main 分支下载现有 `blog/`、`css/`、`js/` 和 `assets/` 到本项目 `public/`，保留旧文章和依赖资源的公开访问路径。合入前应比较线上是否又有新提交。当前本地目录尚未关联 Git 仓库。
2. 在 GitHub 仓库 Settings → Pages → Build and deployment 中选择 **GitHub Actions**。本项目的 `.github/workflows/pages.yml` 将在 `main` 提交后运行 `npm ci` 和 `npm run build`，上传 `dist/`。`public/CNAME` 保留当前域名。
3. 部署 `auth-worker/` 到自己的 Cloudflare Worker（网站仍托管在 GitHub Pages）。例如在该目录执行 `npx wrangler deploy`，取得 Worker 的 HTTPS 地址。
4. 在 GitHub Settings → Developer settings → OAuth Apps 新建 OAuth App：Homepage URL 填 `https://aven.nixinhai.top`；Authorization callback URL 填 `https://你的Worker地址/callback`。
5. 在 Worker 设置中新增加密变量 `GITHUB_CLIENT_ID` 和 `GITHUB_CLIENT_SECRET`。也可在 `auth-worker/` 执行 `npx wrangler secret put GITHUB_CLIENT_ID` 和 `npx wrangler secret put GITHUB_CLIENT_SECRET`，按提示直接输入。不要把密钥写入前端、Git 仓库或聊天。
6. 将 `public/admin/settings.json` 的 `authUrl` 设置为 Worker 地址并重新发布。此文件只有公开配置。首次正式登录验证修改、发布、构建以及线上内容更新。

GitHub Pages 不能运行 OAuth 密钥交换，所以认证服务是必需的一次性接入。当前没有 OAuth 应用与 Worker 账号的认证信息，正式地址会显示接入提示，不会假装登录可用。

## 文件和数据

- `content/*.json`：后台可编辑数据；Vite 将它们打包进站点。
- `public/uploads/`：图片和视频；原素材仍保留在 `assets/`。
- `public/admin/`：管理界面、表单和仓库设置。
- `scripts/validate-content.mjs`：构建前检查作品地址唯一性、链接、地区代码及本地媒体存在性。
- `auth-worker/`：只负责 GitHub 登录；OAuth state 使用短期 HttpOnly Cookie 校验，回传令牌限定站点来源，并验证仓库写权限。

作品地址标识需要唯一，既有标识请尽量不改，以免旧链接失效。作品可新增、删除（至少保留一项）和排序，插画可选择，预览展示各自封面或视频。时间使用文本字段，避免被后台自动转换时区。
