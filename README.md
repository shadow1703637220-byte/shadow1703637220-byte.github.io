# Aven溺心海 · 个人主页预览版

采用已确认的 Dennis 风格布局，使用 Aven 本人的头像、名字设计图、介绍、项目近况、博客与联系方式。

## 运行与构建

```sh
npm install
npm run dev
npm run build
```

构建结果位于 `dist/`。构建后也可运行 `python3 -m http.server 5173 --bind 127.0.0.1 --directory dist`，访问 http://127.0.0.1:5173 。开发时使用 `npm run dev` 输出的地址。

## 内容与文件

日常内容请打开 `/admin/` 编辑，不再修改源码。先在本地运行 `npm run cms`，然后访问 http://127.0.0.1:5174/admin/ 。首页文字、图片、作品、文章推荐、足迹和相册已迁移到 `content/*.json`；完整使用及 GitHub Pages 登录接入说明见 [内容后台](docs/content-admin.md)。当前正式登录尚需配置 OAuth Worker，详情见该文档。

- `project-cards.js` / `project-cards.css`：文件夹式作品卡片，原创 SVG 插画持续摇摆，悬停／键盘聚焦弹出跟随预览。默认卡片视图，仍可切换列表。`project-content.mp4` 和 `project-aven.mp4` 是从对应公开站点逐帧采集并编码的 6 秒页面浏览预览；Token 管理器与小程序暂用明确标注的「交互示意」。`site.config.js` 的 `previewVideo` 可替换为真实项目视频，播放失败回退到示意并更新标签。触屏直接点击进入详情，减少动态效果关闭摇摆和浮动预览。

- `creative-desktop.js` / `creative-desktop.css`：参考 elliothu.me 的桌面交互，独立实现 Aven 创作桌面（`#desk`），包含可拖动窗口、终端命令、便签、头像及放大 Dock。手机使用纵向布局，具体映射见 `docs/elliot-review.md`。

- `ui-enhancements.js` / `ui-enhancements.css`：EasyUI 交互适配，包括章节进度导航、作品视图滑动开关、追光与卡片轻微透视、经历展开、复制反馈与可暂停提示、设计稿照片预览。完整 132 项组件目录及筛选说明见 `docs/easyui-catalog.json` 和 `docs/easyui-review.md`；上游 MIT 许可随构建附在 `licenses/easyui.txt`。

- `site.config.js`：汇总后台维护的 JSON 内容。
- `content.js`：将内容填充到页面并初始化动画前的 DOM。
- `index.html`：页面结构与初始回退文案，日常内容以后台为准。
- `style.css`：基础布局与交互样式。
- `personal.css`：Aven 的头像、中文标题和手机排版适配。
- `hero.js` / `hero.css`：参考 bdoan.me 录屏设计的星空首屏，现采用静态图片、文字和 SVG 银河，无首屏 Canvas。滚动时通过 opacity / transform 从星空过渡到深靛蓝介绍，原刷痕揭幕已简化；向上滚动同步还原。支持 `ViewTimeline` 时由浏览器驱动动画，旧浏览器按滚动事件调度 RAF 回退。桌面与手机首屏总高度均为 230svh，减少动态效果模式使用静态单屏。
- `assets/hero-starry-wide.png`：用户于 2026-11-05 新提供的 1672 × 941 横版星空画，替代此前 700 × 1108 的竖版图。首页与介绍背景共用，横屏保留湖面和村庄。直接显示原始 PNG，保留画质并取消滚动中的画布重绘；性能对比见 `docs/performance-review.md`。
- 首屏英文使用参考站同款 Londrina Solid 900，中文使用站酷快乐体（ZCOOL KuaiLe），均为本地字符子集，许可证见 `assets/*OFL.txt`。修改标题文字时需要更新字体子集。介绍的眉题、两行标题、正文、照片和链接按滚动分步淡入上移，反向滚动同步还原。
- `assets/hero-ocean.jpg`：首屏海面氛围素材，来源 `https://images.unsplash.com/photo-1518837695005-2083093ee35b`（Unsplash），本地保存并随构建打包，不代表个人旅行记录。
- `effects.js` / `effects.css`：双层弹簧磁吸、弧形按钮填充、三层鼠标跟随与作品滑片、弧边菜单、问候开场、逐行入场、滚动方向跑马灯和页脚弧线。桌面与触屏均使用原生滚动，遵循系统减少动态效果设置；输入唤醒 RAF，磁吸弹簧稳定且无跟随效果时停止调度，首屏背景取消开场位移动画。
- `transitions.js` / `transitions.css`：站内导航与作品详情的弧形黑幕转场。项目使用 `#project/token-manager` 等地址，支持直接访问、刷新、前进后退与返回列表。项目外链保留新标签页打开方式。
- `footprints.js` / `footprints.css`：真实国家轮廓与经纬线的可拖动地球；点击陆地或使用地区选择器打开卡片，支持方向键旋转、Enter 选择与减少动态效果模式。取消自动旋转，仅在拖动、键盘操作、尺寸变化或地区转动动画时重绘；地区动画仅在可见时调度 RAF，完成后停止。
- 桌面地球从 90% 的静止尺寸在约 1.6 秒内放大到 125%（视觉直径增加约 39%），并轻微跟随鼠标偏移，移出后平滑恢复；窄窗口降低放大幅度，触屏和减少动态效果模式保持原尺寸。
- `assets/world-countries.json`：Natural Earth 1:110m 国家边界数据（从 Natural Earth Vector 精简），构建时本地打包，无需在线地图服务。
- `assets/aven-*`：从 https://aven.nixinhai.top 下载的头像、三张名字设计图、站点图标和 Telegram 二维码。

内容来源是 `/Users/Admin/Desktop/personal-site-clone/index.html` 和用户提供的 `personal-site-handover.md`。介绍与经历保留源文案，数字和状态按提供材料记录。

作品区展示源文件提到的 Token 管理器、多啦百宝工具、内容工场 + X 工具站与个人站。封面使用个人名字设计稿；小程序标明备案审核中，没有虚构上线链接；Token 管理器使用已知的个人 GitHub 入口。

联系方式支持复制邮箱/微信、打开公开社交主页及 Telegram 二维码。表单使用 `mailto:` 打开访客的邮件应用，由访客确认发送，没有服务端代发功能。

此目录是独立预览项目，线上站的合并与发布按用户后续安排。布局与交互参考 Dennis Snellenberg，Neue Montreal 字体沿用先前演示版；旧演示图片保留在源目录但不再被页面引用，生产构建不会包含这些图片。

## 添加足迹

在后台“旅行足迹”中添加地区、照片、留言和日期即可；同一地区可添加多张卡片。`country` 是地图中的三位代码（如 `CHN`、`JPN`）。内容保存在 `content/footprints.json`，上传的照片位于 `public/uploads/`。数据格式示例：

```js
{ country: 'CHN', entries: [
  { title: '北京', date: '2026', photo: '/uploads/beijing.webp', message: '这里写真实的经历。' },
] },
```

尚未填写的地区会显示明确标为待记录的照片卡和留言卡，不代表已经到访。
