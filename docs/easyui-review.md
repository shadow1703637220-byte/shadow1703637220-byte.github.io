# EasyUI 组件筛选与适配

目录来源：https://easyui.site/components ，源码：https://github.com/Surajmaurya1/easyui 。
本次收集 registry 全部 132 项名称、说明、演示地址与源码路径，保存在 `easyui-catalog.json`。这是目录级筛选；详细阅读了下表涉及的组件源码，并非逐个验证全部 132 项演示。

现有站点使用 Vite + 原生 JavaScript。选中的交互在 `ui-enhancements.js` 和 `ui-enhancements.css` 中适配，未增加 React / Tailwind / Framer Motion 运行时依赖。许可证保存在 `public/licenses/easyui.txt`，随构建发布。

| EasyUI 参考 | 站内落点 | 适配内容 |
| --- | --- | --- |
| Scroll Progress Navigation | 首页之后的底部章节导航 | 阅读进度、当前章节滑动胶囊、站内跳转；菜单、详情页与弹窗期间隐藏 |
| Animated Tabs | 作品区列表／卡片开关 | 指示背景滑动，与原有切换按钮同步；原生按钮可用键盘操作 |
| Spotlight Card | 博客卡片与作品行 | 根据指针局部坐标绘制浅蓝追光，键盘有独立焦点轮廓 |
| Reveal Card | 作品网格 | 小角度透视倾斜；触屏与减少动态效果关闭 |
| Smooth Accordion | More about me 展开的经历 | 高度与透明度同步变化，可中途反向；收起区域设为 inert |
| Morphing Button | 邮箱／微信复制 | 保留按钮尺寸，真实 Clipboard 成功后显示成功状态，失败提示手动复制 |
| VelocityToast | 操作反馈 | 弹出与计时条，鼠标悬停或键盘聚焦暂停，Escape 关闭 |
| Photo Box | 名字设计稿收藏 | 本地设计稿扇形排布，悬停提起；点击打开 modal，左右键换图、Escape 退出并恢复焦点。简化为照片卡片，不包含原版纸盒拆封机构 |

## 全目录筛选原则

- 已有同类效果：Magnetic Button、Cursor Follower、Intro Loader、Hamburger Menu、Sticky Pages 等，沿用本站已实现的磁吸、跟随、开场和首屏滚动。
- 选用与现有内容相符的导航、卡片、预览和操作反馈；蓝金配色与星空主题呼应。
- 图表、实时数据、支付、钱包、登录注册、上传、AI 对话等需要额外真实业务与数据，当前个人站没有对应场景。
- 活动热力图、数字统计、头像堆叠需要真实记录；未填充演示数据。
- Shooting Stars、Meteors、Sparkles、Speed Warp 等与已有银河背景重复，避免额外覆盖星空原画与滚动演出。
- 足迹目前仍为明确的内容占位，继续使用现有真实国家地球和地区选择器。

## 验证要点

桌面与触屏布局；原有作品详情及返回；导航当前项；双入口视图同步；展开收起反向；剪贴板成功／失败；提示暂停；照片点击、键盘换图、焦点返回；减少动态效果；生产构建。

已完成 Chrome 浏览器验证：1440px 桌面，以及 375 / 390 / 900px 触屏布局无横向溢出；双入口切换、作品详情返回、菜单隐藏导航、经历快速反向、三张照片独立点击和触控、方向键换图、Escape / 背景关闭、焦点恢复均通过。真实剪贴板写入成功、模拟拒绝后的手动复制提示、Toast 悬停 / 聚焦暂停及恢复计时均通过。减少动态效果模式通过。手机检查中修复了路由目标默认蓝色外框和作品切换栏与菜单按钮重叠。Vite 生产构建通过，已确认 `dist/licenses/easyui.txt` 与上游许可一致。
