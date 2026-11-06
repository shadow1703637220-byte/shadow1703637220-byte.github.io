const text = (name, label, extra = {}) => ({ name, label, widget: 'string', ...extra });
const area = (name, label, extra = {}) => text(name, label, { widget: 'text', ...extra });
const image = (name, label, extra = {}) => text(name, label, { widget: 'image', ...extra });
const list = (name, label, fields, extra = {}) => ({ name, label, widget: 'list', fields, ...extra });
const url = (name, label, extra = {}) => text(name, label, { pattern: ['^https://[^\\s]+$', '请输入完整的 https:// 地址'], ...extra });
const file = (name, label, fields) => ({ name, label, file: `content/${name}.json`, fields });
const strings = (name, label, extra = {}) => ({ name, label, widget: 'list', field: text('value', label), ...extra });
const collections = [{
  name: 'website', label: '网站内容', editor: { preview: false }, files: [
    file('site', '首页与个人信息', [
      text('name', '名字'), text('role', '身份'), text('email', '联系邮箱', { pattern: ['^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', '请输入有效邮箱'] }), text('wechat', '微信号'),
      text('timeZone', '时区', { hint: '例如 Asia/Shanghai' }), image('avatar', '头像'), image('heroImage', '首页背景'),
      text('heroName', '首页英文名'), text('heroChineseName', '首页中文名'), text('heroHeading', '介绍标题第一行'), text('heroHeadingSecond', '第二行前半句'), text('heroHighlight', '第二行强调文字'),
      area('heroIntro', '介绍第一段'), area('heroDescription', '介绍第二段'), text('heroCaption', '头像下方说明'),
      strings('aboutTitle', '关于我的标题（每项一行）', { min: 1, max: 4 }), area('bio', '个人简介'), area('bioNote', '简介补充'), strings('interests', '兴趣标签'),
      list('journey', '个人经历', [text('date', '时间'), text('title', '标题'), area('description', '说明')], { summary: '{{fields.date}} · {{fields.title}}' }),
      text('deskTitle', '桌面标题前半句'), text('deskTitleSecond', '桌面标题后半句'), area('deskDescription', '桌面介绍'), text('noteTitle', '便签标题'), text('noteSignature', '便签签名'),
      area('contactInvitation', '联系邀请语'), text('telegramLabel', 'Telegram 按钮文字'), url('telegramUrl', 'Telegram 链接'), image('telegramQr', '联系二维码'), url('blogUrl', '全部教程链接'),
      list('socials', '社交链接', [text('label', '名称'), url('url', '链接')], { summary: '{{fields.label}}' }),
    ]),
    file('projects', '作品管理', [list('projects', '作品（可拖动排序）', [
      text('slug', '作品地址标识', { hint: '全站唯一，例如 token-manager。发布后尽量不要修改。', pattern: ['^[a-z0-9]+(?:-[a-z0-9]+)*$', '使用小写英文、数字和短横线'] }),
      text('name', '作品名称'), text('service', '类型与状态'), text('year', '年份'), image('image', '封面'),
      { name: 'artwork', label: '卡片插画', widget: 'select', options: [{ label: '钥匙盒', value: 0 }, { label: '工具包', value: 1 }, { label: '纸飞机', value: 2 }, { label: '星球', value: 3 }], default: 0 },
      text('previewVideo', '预览视频', { widget: 'file', required: false, media_library: { config: { max_file_size: 20000000 } } }),
      url('url', '访问链接', { required: false }), text('linkLabel', '访问按钮文字', { required: false }), area('description', '作品介绍'), area('note', '补充说明', { required: false }),
    ], { min: 1, summary: '{{fields.name}}' })]),
    file('journal', '文章推荐', [list('posts', '首页文章卡片', [text('date', '日期'), text('category', '分类'), { name: 'kind', label: '类型', widget: 'select', options: [{ label: '个人博客', value: 'blog' }, { label: '教程文章', value: 'tutorial' }], default: 'tutorial' }, { name: 'source', label: '发布出处', widget: 'select', options: [{ label: '本站', value: 'site' }, { label: 'Blogger', value: 'blogger' }, { label: 'X', value: 'x' }], default: 'site' }, text('title', '标题'), area('description', '摘要'), url('url', '全文链接')], { summary: '{{fields.title}}' })]),
    file('footprints', '旅行足迹', [list('footprints', '地区', [
      text('country', '地区代码', { hint: '例如中国 CHN、日本 JPN、法国 FRA；每个地区添加一次。', pattern: ['^[A-Z]{3}$', '使用三位大写地区代码'] }),
      list('entries', '照片与留言', [text('title', '标题'), text('date', '日期'), image('photo', '照片', { required: false }), area('message', '留言')], { min: 1, summary: '{{fields.title}}' }),
    ], { summary: '{{fields.country}}' })]),
    file('gallery', '灵感相册', [text('title', '相册标题'), area('description', '相册说明'), list('photos', '图片', [image('image', '图片'), text('title', '图片说明')], { max: 5, summary: '{{fields.title}}' })]),
  ],
}];

try {
  const response = await fetch('./settings.json');
  if (!response.ok) throw new Error('无法读取后台设置');
  const settings = await response.json();
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  document.querySelector('#mode').textContent = local ? '本地编辑 · 保存会更新当前电脑的网站文件，尚未发布到线上。' : 'Aven 内容后台 · 点击发布后，网站会自动构建更新。';
  if (!local && !settings.authUrl) {
    document.querySelector('#setup').innerHTML = '<h1>内容后台已准备好</h1><p>还需连接 GitHub 登录服务，才能编辑并发布。完成一次性接入后，就可以在这里修改内容和上传图片。</p><p>接入步骤见项目中的 docs/content-admin.md。</p><a href="/">返回网站 ↗</a>';
  } else {
    if (!window.CMS) throw new Error('编辑器加载失败，请刷新重试');
    document.querySelector('#setup').remove();
    window.CMS.init({ config: {
      load_config_file: false, locale: 'zh_Hans',
      backend: { name: 'github', repo: settings.repo, branch: settings.branch, ...(settings.authUrl ? { base_url: settings.authUrl, auth_endpoint: 'auth' } : {}) },
      local_backend: local ? { url: 'http://localhost:8081/api/v1' } : false,
      media_folder: 'public/uploads', public_folder: '/uploads', site_url: settings.siteUrl,
      display_url: settings.siteUrl, logo_url: '/uploads/aven-avatar.svg', collections,
    } });
    // Reload the persisted entry so subsequent edits compare against its new value.
    window.CMS.registerEventListener({ name: 'postSave', handler: () => setTimeout(() => location.reload(), 100) });
  }
} catch (error) {
  document.querySelector('#setup').textContent = `无法打开后台：${error.message}`;
}
