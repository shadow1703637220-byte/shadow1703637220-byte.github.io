// Render editor content before animation and interaction modules bind to the DOM.
const $ = selector => document.querySelector(selector);
function element(tag, text, className) {
  const node = document.createElement(tag); node.textContent = text;
  if (className) node.className = className;
  return node;
}
// 文章区（2026-11-06 定版）：两摞平台扇形卡。悬停时封面卡隐去，平台卡绕底部支点扇形展开，点击直达对应平台。
const FAN_STACKS = [
  { key: 'blog', eyebrow: 'PERSONAL BLOG', title: '个人博客', sub: '认知、学习与自我成长，写给自己，也写给你。', foot: '本站 · Substack · Medium 三处可读', platforms: [
    { name: '本站', mark: 'A', en: 'MY BLOG', desc: '在我的网站里读，排版最舒服', url: '/blog.html', accent: '#455ce9' },
    { name: 'Substack', mark: 'S', en: 'SUBSTACK', desc: '订阅后，新文章直接送进你的邮箱', url: 'https://substack.com/@fugitsuscipit286398', accent: '#ff6719' },
    { name: 'Medium', mark: 'M', en: 'MEDIUM', desc: '同步发布，方便海外读者', url: 'https://medium.com/@shadow1703637220', accent: '#0f0f10' },
  ] },
  { key: 'tutorial', eyebrow: 'TUTORIALS', title: '教程文章', sub: '开户、工具与避坑教程，照着做就行。', foot: 'X · Blogger 两处发布', platforms: [
    { name: 'X', mark: 'X', en: 'X / TWITTER', desc: '长文教程与经验帖的首发地', url: 'https://x.com/NIxinhai0', accent: '#0f0f10' },
    { name: 'Blogger', mark: 'B', en: 'BLOGGER', desc: '图文全集，步骤最完整', url: 'https://nixinhai.blogspot.com/', accent: '#f4511e' },
  ] },
];
function fanPlatformCard(platform, index, total) {
  const link = document.createElement('a'); link.href = platform.url; link.className = 'fan-card';
  if (!platform.url.startsWith('/')) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
  const step = total === 2 ? 30 : 18;
  const offset = index - (total - 1) / 2;
  link.style.setProperty('--ang', `${offset * step}deg`);
  link.style.setProperty('--ty', `${Math.abs(offset) * 12}px`);
  link.style.setProperty('--delay', `${index * 50}ms`);
  link.style.setProperty('--z', String(index + 2));
  const glyph = element('span', platform.mark, 'fan-plat-glyph'); glyph.style.background = platform.accent;
  link.append(
    element('p', platform.en, 'fan-card-meta'),
    glyph,
    element('h4', `在${platform.name}观看`),
    element('p', platform.desc, 'fan-card-desc'),
    element('span', '前往 ↗', 'fan-card-cta'),
  );
  return link;
}
function buildFanStack(def) {
  const stack = document.createElement('div'); stack.className = `fan-stack fan-${def.key}`;
  stack.setAttribute('role', 'group'); stack.setAttribute('aria-label', `${def.title}卡组，悬停展开`);
  const base = document.createElement('div'); base.className = 'fan-base';
  base.append(
    element('p', def.eyebrow, 'fan-base-eyebrow'),
    element('h3', def.title),
    element('p', def.sub, 'fan-base-sub'),
    element('p', def.foot, 'fan-base-foot'),
  );
  stack.append(base);
  def.platforms.forEach((platform, index) => stack.append(fanPlatformCard(platform, index, def.platforms.length)));
  stack.append(element('p', '把鼠标放上来展开 · 点卡片跳转', 'fan-hint'));
  stack.addEventListener('click', event => { if (event.target === stack || event.target.closest('.fan-base')) stack.classList.toggle('open'); });
  return stack;
}
function renderJournal() {
  const host = $('.journal-grid');
  if (!host) return;
  host.classList.add('journal-host');
  const row = document.createElement('div'); row.className = 'fan-row';
  FAN_STACKS.forEach(def => row.append(buildFanStack(def)));
  host.replaceChildren(row);
}
export function applyContent(site) {
  document.querySelector('meta[name="description"]').content = site.bio;
  for (const selector of ['.hero-photo img', '.desk-portrait img', '.contact-heading img']) {
    $(selector).src = site.avatar; $(selector).alt = site.name;
  }
  $('.hero-portrait').src = site.heroImage;
  document.documentElement.style.setProperty('--hero-artwork', `url(${JSON.stringify(site.heroImage)})`);
  $('.hero-static-name').replaceChildren(document.createTextNode(site.heroName), element('span', site.heroChineseName));
  $('.hero-heading-line:first-child > span').textContent = site.heroHeading;
  $('.hero-heading-line:nth-child(2) > span').replaceChildren(document.createTextNode(site.heroHeadingSecond), element('strong', site.heroHighlight));
  $('.hero-intro-line').textContent = site.heroIntro;
  $('.hero-intro-line + .hero-intro-line').textContent = site.heroDescription;
  $('.hero-photo figcaption').textContent = site.heroCaption;
  $('.hero-caption > span:first-child').replaceChildren(document.createTextNode('STUDENT CREATOR'), document.createElement('br'), document.createTextNode(site.role));
  $('.intro-main h2').replaceChildren(...site.aboutTitle.flatMap((line, index) => [
    ...(index ? [document.createElement('br')] : []), element('span', line, index === 1 ? 'serif' : undefined),
  ]));
  $('.intro-aside > p').textContent = site.bio;
  $('.intro-aside > .muted').textContent = site.bioNote;
  $('.interest-tags').replaceChildren(...site.interests.map(text => element('span', text)));
  $('.services').replaceChildren(...site.journey.map(item => {
    const article = document.createElement('article');
    article.append(element('span', item.date), element('h3', item.title), element('p', item.description)); return article;
  }));
  $('#desk-title').replaceChildren(document.createTextNode(site.deskTitle), element('span', site.deskTitleSecond));
  $('.desk-heading > p:last-child').textContent = site.deskDescription;
  $('.desk-note-body h3').textContent = site.noteTitle;
  $('.desk-note-body > p').replaceChildren(...site.interests.flatMap((text, index) => [
    ...(index && index % 2 === 0 ? [document.createElement('br')] : []), document.createTextNode(`${text}　 `),
  ]));
  $('.note-signature').replaceChildren(document.createTextNode(site.noteSignature), element('span', `— ${site.name}`));
  $('.desk-portrait > p').textContent = site.role;
  $('.contact-invitation').textContent = site.contactInvitation;
  $('.dialog-content > p:not(.eyebrow)').textContent = site.contactInvitation;
  $('.direct-contact img').src = site.telegramQr;
  $('.direct-contact a').href = site.telegramUrl;
  $('.direct-contact a').textContent = site.telegramLabel;
  $('.demo-note').textContent = `邮件发给 ${site.email}，将打开你的邮件应用，由你确认发送。`;
  const journalLink = $('.journal .section-label a');
  journalLink.href = site.blogUrl; journalLink.textContent = '在 Blogger 看全部教程 ↗';
  renderJournal();
  $('#archive-title').textContent = site.gallery.title;
  $('.archive-copy > p:not(.eyebrow)').textContent = site.gallery.description;
  $('.photo-box').replaceChildren(...site.gallery.photos.map((photo, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'photo-print';
    button.setAttribute('aria-label', `放大${photo.title}`);
    const image = document.createElement('img'); image.src = photo.image; image.alt = photo.title; image.loading = 'lazy';
    button.append(image, element('span', `${String(index + 1).padStart(2, '0')} / ${site.heroName.toUpperCase()}`));
    button.style.setProperty('--print-x', `${(index - (site.gallery.photos.length - 1) / 2) * 20}%`);
    button.style.setProperty('--print-r', `${(index - (site.gallery.photos.length - 1) / 2) * 10 - 2}deg`);
    return button;
  }));
  $('.photo-archive').hidden = !site.gallery.photos.length;
}
