import { site as content } from './site.config.js';
const slugs = content.projects.map(project => project.slug);
export const projectHash = index => `#project/${slugs[index]}`;

export function initPageTransitions(site, closeMenu) {
  const $ = selector => document.querySelector(selector);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sectionNames = { home: 'Home', desk: 'Desktop', work: 'Work', footprints: 'Footprints', about: 'About', contact: 'Contact', blog: 'Notes' };
  const curtain = document.createElement('div');
  curtain.className = 'page-curtain'; curtain.hidden = true; curtain.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span'); label.className = 'page-curtain-label'; curtain.append(label);
  document.body.append(curtain);
  const announcement = document.createElement('div'); announcement.className = 'sr-only'; announcement.setAttribute('role', 'status'); document.body.append(announcement);

  const view = document.createElement('section');
  view.className = 'case-page'; view.hidden = true; view.setAttribute('aria-labelledby', 'case-title');
  view.innerHTML = `<nav class="case-nav" aria-label="项目导航"><a href="#home" class="brand"></a><a href="#work" class="case-back">所有作品 ↗</a></nav>
    <div class="case-content section-width"><p class="eyebrow case-enter">SELECTED PROJECT / 作品与近况</p><h1 id="case-title" class="case-enter" tabindex="-1"></h1>
    <div class="case-meta case-enter"><div><p class="eyebrow">ROLE / 项目</p><p id="case-service"></p></div><div><p class="eyebrow">CREATOR / 创作者</p><p id="case-creator"></p></div><div><p class="eyebrow">YEAR / 年份</p><p id="case-year"></p></div></div>
    <div class="case-cover case-enter"><img id="case-image" alt="" /><a id="case-link" class="round-button blue-button" target="_blank" rel="noopener noreferrer"><span>访问项目 ↗</span></a></div>
    <div class="case-story case-enter"><p class="eyebrow">ABOUT THIS PROJECT / 关于项目</p><div><p id="case-description"></p><p id="case-note" class="muted"></p><p class="muted">封面使用我的名字设计稿。</p></div></div>
    <a class="case-next" id="case-next"><span class="eyebrow">NEXT PROJECT / 下一个项目</span><span id="case-next-name"></span><span aria-hidden="true">↗</span></a></div>`;
  $('main').append(view);
  view.querySelector('.brand').textContent = `© ${site.name}`;
  $('#case-creator').textContent = site.name;
  const positions = new Map();
  let currentHash = '', busy = false, queuedHash = null;
  let scrollFrame = 0, scrollToken = 0;
  history.scrollRestoration = 'manual';

  function route(hash) {
    const index = slugs.indexOf(hash.replace('#project/', ''));
    if (hash.startsWith('#project/') && index >= 0) return { index, hash, title: site.projects[index].name };
    const section = hash.replace('#', '') || 'home';
    return { index: -1, section: sectionNames[section] ? section : 'home', hash, title: sectionNames[section] || 'Home' };
  }
  function render(destination, restore) {
    const project = site.projects[destination.index];
    document.body.classList.toggle('project-view', Boolean(project));
    view.hidden = !project;
    if (project) {
      $('#case-title').textContent = project.name;
      $('#case-service').textContent = project.service;
      $('#case-year').textContent = project.year;
      $('#case-image').src = project.image; $('#case-image').alt = `${project.name} · Aven 名字设计封面`;
      $('#case-description').textContent = project.description;
      $('#case-note').textContent = project.note || ''; $('#case-note').hidden = !project.note;
      const link = $('#case-link'); link.hidden = !project.url;
      if (project.url) link.href = project.url; else link.removeAttribute('href');
      const linkLabel = link.querySelector('.button-label') || link.querySelector('span');
      linkLabel.textContent = project.linkLabel || '访问项目 ↗';
      const next = (destination.index + 1) % site.projects.length;
      $('#case-next').href = projectHash(next); $('#case-next-name').textContent = site.projects[next].name;
    }
    document.title = project ? `${project.name} — ${site.name}` : `${site.name} ・ 个人主页`;
    const target = project ? $('#case-title') : $(`#${destination.section}`);
    const top = restore && positions.has(destination.hash) ? positions.get(destination.hash) : project ? 0 : target.getBoundingClientRect().top + scrollY;
    window.scrollTo({ top, behavior: 'instant' });
    target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true });
    currentHash = destination.hash;
    announcement.textContent = `已打开 ${project ? project.name : destination.title}`;
  }
  const animate = (element, frames, options) => element.animate(frames, options).finished.catch(() => {});
  function stopSectionScroll() {
    scrollToken++;
    cancelAnimationFrame(scrollFrame); scrollFrame = 0;
    const moving = document.body.classList.contains('section-scrolling');
    document.body.classList.remove('section-scrolling');
    if (moving) window.dispatchEvent(new Event('page-transition-end'));
  }
  function navigateSection(destination, { push, restore }) {
    stopSectionScroll();
    positions.set(currentHash, scrollY);
    closeMenu();
    const target = $(`#${destination.section}`);
    const from = scrollY;
    const top = () => Math.max(0, Math.min(
      restore && positions.has(destination.hash) ? positions.get(destination.hash) : target.getBoundingClientRect().top + scrollY,
      document.documentElement.scrollHeight - innerHeight,
    ));
    if (push && location.hash !== destination.hash) history.pushState(null, '', destination.hash);
    currentHash = destination.hash;
    const finish = () => {
      scrollFrame = 0;
      document.body.classList.remove('section-scrolling');
      target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true });
      announcement.textContent = `已到达 ${destination.title}`;
      window.dispatchEvent(new Event('page-transition-end'));
    };
    if (reduced.matches || Math.abs(top() - from) < 2) {
      window.scrollTo({ top: top(), behavior: 'instant' }); finish(); return;
    }
    document.body.classList.add('section-scrolling');
    window.dispatchEvent(new Event('page-transition-start'));
    const duration = Math.min(900, 360 + Math.sqrt(Math.abs(top() - from)) * 8);
    const start = performance.now(), token = scrollToken;
    const step = time => {
      if (token !== scrollToken) return;
      const progress = Math.min(1, (time - start) / duration);
      const eased = 1 - (1 - progress) ** 4;
      window.scrollTo({ top: from + (top() - from) * eased, behavior: 'instant' });
      if (progress < 1) scrollFrame = requestAnimationFrame(step);
      else finish();
    };
    scrollFrame = requestAnimationFrame(step);
  }
  // Wheel, touch and scrolling keys immediately return control to the visitor.
  ['wheel', 'touchstart', 'pointerdown'].forEach(type => addEventListener(type, stopSectionScroll, { passive: true }));
  document.addEventListener('keydown', event => {
    if (['Escape', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key) && !event.target.matches('input, textarea, select, [contenteditable]')) stopSectionScroll();
  });
  reduced.addEventListener('change', stopSectionScroll);
  async function navigate(hash, { push = true, restore = false } = {}) {
    if (busy) { queuedHash = { hash, push, restore }; return; }
    const destination = route(hash);
    if (destination.index < 0 && !document.body.classList.contains('project-view')) {
      navigateSection(destination, { push, restore }); return;
    }
    if (hash === currentHash && !restore) return;
    stopSectionScroll();
    busy = true;
    positions.set(currentHash, scrollY);
    window.dispatchEvent(new Event('page-transition-start'));
    closeMenu();
    document.body.classList.add('page-transitioning', 'locked');
    const sections = [$('header'), $('main'), $('footer'), $('.menu-toggle')];
    sections.forEach(el => { el.inert = true; });
    try {
      label.textContent = destination.title;
      if (!reduced.matches) {
        curtain.hidden = false; curtain.dataset.phase = 'cover';
        label.style.opacity = '1';
        await animate(curtain, [{ transform: 'translateY(115%)' }, { transform: 'translateY(0)' }], { duration: 260, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
      }
      if (push) history.pushState(null, '', hash);
      render(destination, restore);
      if (!reduced.matches) {
        curtain.dataset.phase = 'reveal';
        const targets = destination.index >= 0 ? [...view.querySelectorAll('.case-enter')] : [$(`#${destination.section}`)];
        targets.forEach((el, i) => el.animate([{ opacity: .5, translate: '0 24px' }, { opacity: 1, translate: '0 0' }], { duration: 420, delay: i * 30, easing: 'cubic-bezier(.22,1,.36,1)' }));
        await Promise.all([
          animate(curtain, [{ transform: 'translateY(0)' }, { transform: 'translateY(-120%)' }], { duration: 360, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }),
          animate(label, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }),
        ]);
      }
    } finally {
      curtain.hidden = true;
      curtain.getAnimations().forEach(animation => animation.cancel());
      label.getAnimations().forEach(animation => animation.cancel());
      sections.forEach(el => { el.inert = false; });
      document.body.classList.remove('page-transitioning', 'locked');
      const focus = destination.index >= 0 ? $('#case-title') : $(`#${destination.section}`);
      focus.focus({ preventScroll: true });
      busy = false;
      window.dispatchEvent(new Event('page-transition-end'));
      if (queuedHash !== null) { const next = queuedHash; queuedHash = null; navigate(next.hash, next); }
    }
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank' || link.hasAttribute('download')) return;
    if (!link.hash || (!link.hash.startsWith('#project/') && !sectionNames[link.hash.slice(1)])) return;
    event.preventDefault(); navigate(link.hash);
  });
  addEventListener('hashchange', () => navigate(location.hash || '#home', { push: false, restore: true }));
  render(route(location.hash || '#home'), false);
}
