// Native adaptations of EasyUI interaction patterns. See docs/easyui-review.md
// and public/licenses/easyui.txt for sources and the upstream MIT notice.
import { playSound } from './sound.js';
const $ = selector => document.querySelector(selector);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const fine = matchMedia('(hover: hover) and (pointer: fine)');
const ease = 'cubic-bezier(.22,1,.36,1)';
let toastProgress;

export function showToast(message) {
  const toast = $('.toast');
  toastProgress?.cancel();
  toast.querySelector('.toast-message').textContent = message;
  toast.classList.add('visible');
  toastProgress = toast.querySelector('.toast-progress').animate(
    [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }],
    { duration: 5000, fill: 'forwards' },
  );
  toastProgress.onfinish = () => toast.classList.remove('visible');
  if (toast.matches(':hover, :focus-within')) toastProgress.pause();
}

export async function copyContact(button, value, message) {
  if (button.dataset.copyState === 'loading') return;
  clearTimeout(button.copyReset);
  button.dataset.copyState = 'loading';
  button.setAttribute('aria-busy', 'true');
  const state = button.querySelector('.copy-state');
  state.textContent = '复制中…';
  try {
    await navigator.clipboard.writeText(value);
    button.dataset.copyState = 'success'; state.textContent = '✓ 已复制';
    playSound('success');
    showToast(message);
  } catch {
    button.dataset.copyState = 'error'; state.textContent = '请手动复制';
    showToast(`无法自动复制，请手动复制：${value}`);
  } finally {
    button.removeAttribute('aria-busy');
    button.copyReset = setTimeout(() => { delete button.dataset.copyState; }, 2600);
  }
}

let aboutAnimation;
export function toggleAbout() {
  const detail = $('#about-details');
  const button = $('#about-button');
  const opening = button.getAttribute('aria-expanded') !== 'true';
  const from = detail.hidden ? 0 : detail.getBoundingClientRect().height;
  aboutAnimation?.cancel();
  button.setAttribute('aria-expanded', String(opening));
  detail.hidden = false; detail.inert = !opening;
  if (reduced.matches) { detail.hidden = !opening; return; }
  const to = opening ? detail.getBoundingClientRect().height : 0;
  aboutAnimation = detail.animate([
    { height: `${from}px`, opacity: opening ? .35 : 1, overflow: 'hidden' },
    { height: `${to}px`, opacity: opening ? 1 : 0, overflow: 'hidden' },
  ], { duration: 500, easing: ease });
  aboutAnimation.onfinish = () => { detail.hidden = !opening; };
}

export function initUIEnhancements() {
  // Progress navigation appears once the painted opening has left the screen.
  const sections = [['home', '首页'], ['about', '关于'], ['work', '作品'], ['footprints', '足迹'], ['blog', '文章'], ['contact', '联系']];
  /* 2026-11-06 章节胶囊退场：底部位置改由 macOS 程序坞（dock.js）接管，本段保留备查、不再执行（删掉这层 if(false) 包裹即可恢复）。 */
  if (false) {
  const nav = document.createElement('nav');
  nav.className = 'chapter-nav'; nav.setAttribute('aria-label', '页面章节导航');
  nav.innerHTML = '<span class="chapter-indicator" aria-hidden="true"></span>' + sections.map(([id, label]) => `<a href="#${id}">${label}</a>`).join('') + '<span class="chapter-progress" aria-hidden="true"></span>';
  document.body.append(nav);
  let queued = false;
  function updateNav() {
    queued = false;
    const desktop = document.querySelector('#desk')?.getBoundingClientRect();
    const onDesktop = desktop && desktop.top < innerHeight * .55 && desktop.bottom > innerHeight * .4;
    const scrolling = document.body.classList.contains('section-scrolling');
    const visible = (!onDesktop || scrolling) && (scrollY > $('.hero').offsetHeight - 80 || scrolling) && !document.body.matches('.locked, .project-view, .page-transitioning');
    nav.classList.toggle('is-visible', visible); nav.inert = !visible;
    let active = 0;
    sections.forEach(([id], i) => { if ($(`#${id}`).getBoundingClientRect().top <= innerHeight * .4) active = i; });
    nav.querySelectorAll('a').forEach((link, i) => {
      if (i === active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
    });
    nav.style.setProperty('--chapter', active);
    nav.style.setProperty('--page-progress', Math.min(1, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)));
  }
  const scheduleNav = () => { if (!queued) { queued = true; requestAnimationFrame(updateNav); } };
  addEventListener('scroll', scheduleNav, { passive: true });
  addEventListener('resize', scheduleNav);
  addEventListener('page-transition-end', scheduleNav);
  new MutationObserver(scheduleNav).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  new ResizeObserver(scheduleNav).observe(document.body);
  updateNav();
  }

  // One sliding indicator, with the existing list toggle kept in sync.
  const viewSwitch = $('.view-switch');
  const syncView = () => {
    const grid = $('#work-list').classList.contains('grid');
    viewSwitch.style.setProperty('--view', Number(grid));
    viewSwitch.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String((button.dataset.view === 'grid') === grid)));
  };
  viewSwitch.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    if ((button.dataset.view === 'grid') !== $('#work-list').classList.contains('grid')) $('#view-toggle').click();
  }));
  $('#view-toggle').addEventListener('click', syncView); syncView();

  // Pointer light uses local coordinates; tilt is restricted to artwork cards.
  const cards = [...document.querySelectorAll('.journal-grid > a, .work-row')];
  cards.forEach(card => {
    card.classList.add('ui-spotlight');
    const reset = () => { ['--light-x', '--light-y', '--tilt-x', '--tilt-y'].forEach(property => card.style.removeProperty(property)); };
    card.addEventListener('pointermove', event => {
      if (reduced.matches || !fine.matches) return;
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left, y = event.clientY - rect.top;
      card.style.setProperty('--light-x', `${x}px`); card.style.setProperty('--light-y', `${y}px`);
      card.style.setProperty('--tilt-x', `${(y / rect.height - .5) * -5}deg`);
      card.style.setProperty('--tilt-y', `${(x / rect.width - .5) * 5}deg`);
    });
    card.addEventListener('pointerleave', reset); reduced.addEventListener('change', reset);
  });

  // The label retains its size while the feedback layer changes state.
  ['#copy-email', '#copy-wechat'].forEach(selector => {
    const button = $(selector);
    const state = document.createElement('span'); state.className = 'copy-state'; state.setAttribute('aria-live', 'polite');
    button.append(state);
  });
  const toast = $('.toast');
  toast.innerHTML = '<span class="toast-message"></span><span class="toast-progress" aria-hidden="true"></span>';
  toast.tabIndex = 0; toast.setAttribute('aria-atomic', 'true');
  const pause = () => toastProgress?.pause();
  const resume = () => { if (!toast.matches(':hover, :focus-within')) toastProgress?.play(); };
  toast.addEventListener('pointerenter', pause); toast.addEventListener('pointerleave', resume);
  toast.addEventListener('focusin', pause); toast.addEventListener('focusout', resume);
  toast.addEventListener('keydown', event => { if (event.key === 'Escape') { toastProgress?.cancel(); toast.classList.remove('visible'); } });

  // A fan of local design prints opens into a keyboard-accessible image viewer.
  const prints = [...document.querySelectorAll('.photo-print')];
  const viewer = document.createElement('dialog'); viewer.className = 'photo-viewer';
  viewer.setAttribute('aria-label', '名字设计稿预览');
  viewer.innerHTML = '<button class="dialog-close" aria-label="关闭图片预览">×</button><figure><img alt="" /><figcaption aria-live="polite"></figcaption></figure><div class="photo-controls"><button type="button" data-step="-1" aria-label="上一张">←</button><span>设计手记 / AVEN</span><button type="button" data-step="1" aria-label="下一张">→</button></div>';
  document.body.append(viewer);
  let index = 0, origin;
  const display = next => {
    index = (next + prints.length) % prints.length;
    const image = prints[index].querySelector('img');
    viewer.querySelector('figure img').src = image.src;
    viewer.querySelector('figure img').alt = image.alt;
    viewer.querySelector('figcaption').textContent = `${String(index + 1).padStart(2, '0')} / ${String(prints.length).padStart(2, '0')} — ${image.alt}`;
    if (!reduced.matches) viewer.querySelector('figure').animate([{ opacity: .3, transform: 'translateY(12px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 350, easing: ease });
  };
  prints.forEach((print, i) => print.addEventListener('click', () => {
    origin = print; display(i); viewer.showModal(); document.body.classList.add('locked');
  }));
  viewer.querySelector('.dialog-close').addEventListener('click', () => viewer.close());
  viewer.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => display(index + Number(button.dataset.step))));
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); display(index + (event.key === 'ArrowRight' ? 1 : -1)); playSound('paper'); }
  });
  viewer.addEventListener('click', event => { if (event.target === viewer) { const r = viewer.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) viewer.close(); } });
  viewer.addEventListener('close', () => { document.body.classList.remove('locked'); origin?.focus({ preventScroll: true }); });
}
