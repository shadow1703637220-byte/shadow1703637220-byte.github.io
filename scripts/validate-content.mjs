import { readFile, access } from 'node:fs/promises';
const read = async path => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'));
const settings = await read('content/site.json');
const { projects } = await read('content/projects.json');
const { footprints } = await read('content/footprints.json');
const { posts } = await read('content/journal.json');
const gallery = await read('content/gallery.json');
const countries = new Set((await read('assets/world-countries.json')).features.map(feature => feature.properties.code));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
function unique(items, key, label) {
  assert(new Set(items.map(item => item[key])).size === items.length, `${label}不能重复`);
}
function link(value, label) {
  if (!value) return;
  let url;
  try { url = new URL(value); } catch { throw new Error(`${label}需要完整链接`); }
  assert(url.protocol === 'https:' && !url.username && !url.password, `${label}必须是 HTTPS 链接`);
}
async function media(value) {
  if (!value) return;
  if (value.startsWith('https://')) { link(value, '媒体'); return; }
  assert(/^\/uploads\/(?!.*(?:\.\.|[?#\\])).+/.test(value), `媒体路径无效：${value}`);
  await access(new URL(`../public${value}`, import.meta.url));
}
assert(settings.name && settings.role && settings.bio, '请填写名字、身份和简介');
assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email), '联系邮箱格式错误');
new Intl.DateTimeFormat('zh-CN', { timeZone: settings.timeZone });
assert(projects.length > 0, '请至少保留一个作品');
unique(projects, 'slug', '作品地址标识'); unique(footprints, 'country', '足迹地区');
for (const project of projects) {
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug), '作品地址标识只能包含小写英文、数字和短横线');
  assert(project.name && project.description && project.image, '请填写作品名称、介绍和封面');
  link(project.url, project.name); await media(project.image); await media(project.previewVideo);
}
for (const location of footprints) {
  assert(countries.has(location.country), `未知地区代码：${location.country}`);
  for (const entry of location.entries) await media(entry.photo);
}
for (const social of settings.socials) link(social.url, social.label);
for (const post of posts) link(post.url, post.title);
link(settings.telegramUrl, 'Telegram'); link(settings.blogUrl, '博客');
for (const value of [settings.avatar, settings.heroImage, settings.telegramQr, ...gallery.photos.map(photo => photo.image)]) await media(value);
console.log(`内容校验通过：${projects.length} 个作品，${posts.length} 篇文章推荐，${footprints.length} 处足迹。`);
