import { site } from './site.config.js';
import { initEffects } from './effects.js';
import { initPageTransitions, projectHash } from './transitions.js';
import { initFootprints } from './footprints.js';
import { initHero } from './hero.js';
import { initUIEnhancements, showToast, copyContact, toggleAbout } from './ui-enhancements.js';
import { initCreativeDesktop } from './creative-desktop.js';
import { initProjectCards } from './project-cards.js';
import { initSound } from './sound.js';
import { applyContent } from './content.js';
import { initScrollScenes } from './scroll-scenes.js';

applyContent(site);

const $ = (selector) => document.querySelector(selector);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
document.querySelectorAll('[data-name]').forEach(el => { el.textContent = site.name; });
document.querySelectorAll('.marquee-track span').forEach(el => { el.textContent = `${site.name} —`; });
document.title = `${site.name} ・ 个人主页`;
$('h1').textContent = `${site.name} — ${site.role}`;
$('.footer-bottom p').textContent = `${new Date().getFullYear()} © ${site.name}`;
$('#copy-email').firstChild.textContent = `${site.email} `;
$('#about-button').setAttribute('aria-expanded', 'false');
$('#about-button').setAttribute('aria-controls', 'about-details');
site.socials.forEach(social => {
  const link = document.createElement('a');
  link.href = social.url;
  link.textContent = `${social.label} ↗`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  $('#social-links').append(link);
});

site.projects.forEach((project, index) => {
  const button = document.createElement('a');
  button.className = 'work-row project-folder';
  button.href = projectHash(index);
  const image = document.createElement('img');
  image.src = project.image; image.alt = `${project.name} · Aven 名字设计封面`; image.loading = 'lazy';
  const number = document.createElement('span'); number.className = 'work-number'; number.textContent = String(index + 1).padStart(2, '0');
  const title = document.createElement('h3'); title.textContent = project.name;
  const service = document.createElement('span'); service.className = 'work-service'; service.textContent = project.service;
  const arrow = document.createElement('span'); arrow.className = 'work-arrow'; arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
  button.append(image, number, title, service, arrow);
  $('#work-list').append(button);
});

const menuButton = $('.menu-toggle');
const menu = $('.side-menu');
function setMenu(open) {
  const wasOpen = menuButton.getAttribute('aria-expanded') === 'true';
  if (wasOpen === open) return;
  document.body.classList.toggle('menu-open', open);
  document.body.classList.toggle('locked', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
  menu.inert = !open;
  for (const selector of ['header', 'main', 'footer']) $(selector).inert = open;
  if (open) menu.querySelector('a').focus({ preventScroll: true });
  else menuButton.focus({ preventScroll: true });
}
menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
$('.menu-shade').addEventListener('click', () => setMenu(false));
menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', event => {
  if (menuButton.getAttribute('aria-expanded') !== 'true') return;
  if (event.key === 'Escape') setMenu(false);
  if (event.key === 'Tab') {
    const items = [menuButton, ...menu.querySelectorAll('a')];
    const current = items.indexOf(document.activeElement);
    event.preventDefault();
    items[(current + (event.shiftKey ? -1 : 1) + items.length) % items.length].focus();
  }
});

$('#about-button').addEventListener('click', () => {
  toggleAbout();
});
$('#view-toggle').addEventListener('click', () => {
  const grid = $('#work-list').classList.toggle('grid');
  $('#view-toggle').setAttribute('aria-pressed', String(grid));
  ($('#view-toggle .button-label') || $('#view-toggle')).firstChild.textContent = grid ? '切换列表视图 ' : '切换网格视图 ';
  if (!reducedMotion) $('#work-list').animate([{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 650, easing: 'cubic-bezier(.22,1,.36,1)' });
});

function openDialog(dialog) { dialog.showModal(); document.body.classList.add('locked'); }
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => document.body.classList.remove('locked'));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
});
$('#contact-dialog').setAttribute('aria-label', '联系我');
$('#contact-button').addEventListener('click', () => openDialog($('#contact-dialog')));
const toast = showToast;
$('#copy-email').addEventListener('click', async () => {
  await copyContact($('#copy-email'), site.email, '邮箱已复制，可以开始一段新对话了。');
});
$('#copy-wechat').firstChild.textContent = `微信 ${site.wechat} `;
$('#copy-wechat').addEventListener('click', async () => {
  await copyContact($('#copy-wechat'), site.wechat, '微信号已复制，添加请备注来意。');
});
$('#contact-form').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const subject = encodeURIComponent(`项目合作 · ${data.get('name')}`);
  const body = encodeURIComponent(`称呼：${data.get('name')}\n邮箱：${data.get('email')}\n\n${data.get('message')}`);
  location.href = `mailto:${site.email}?subject=${subject}&body=${body}`;
  toast('已请求打开邮件应用，请在邮件应用中确认发送。');
});
function updateTime() {
  $('#local-time').textContent = new Intl.DateTimeFormat('en-GB', { timeZone: site.timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZoneName: 'short' }).format(new Date());
}
updateTime(); setInterval(updateTime, 1000);

if (!reducedMotion) {
  document.documentElement.classList.add('js-motion');
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('in-view'); observer.unobserve(entry.target); }
  }), { threshold: .12 });
  document.querySelectorAll('.reveal:not(.intro-main):not(.intro-aside)').forEach(el => observer.observe(el));
}
let scheduled = false;
function updateScroll() {
  menuButton.classList.toggle('visible', scrollY > innerHeight * .55);
  scheduled = false;
}
addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateScroll); } }, { passive: true });
updateScroll();
initHero();
initPageTransitions(site, () => setMenu(false));
initEffects(site);
initFootprints(site.footprints);
initUIEnhancements();
initCreativeDesktop(site);
initProjectCards(site);
initScrollScenes();
initSound();
