// Folder cards with original vector mascots and pointer-following project previews.
const drawings = [
  '<path d="M80 78 160 48 240 78v106l-80 40-80-40Z" fill="#9fa5e8"/><path d="m80 78 80 36 80-36M160 114v110" fill="none"/><rect x="113" y="125" width="95" height="48" rx="24" fill="#fff1a9"/><circle cx="140" cy="149" r="6" fill="#24334e"/><path d="M155 149h35m-8 0v10m-13-10v10"/><path d="m103 201-14 31m127-31 14 31"/>',
  '<rect x="96" y="85" width="130" height="130" rx="24" fill="#9dcbb5"/><path d="M96 125h130M139 85V66h43v19" fill="none"/><path d="m143 156 14-23 14 23 26 6-23 15 2 27-21-18-25 8 11-23-16-17Z" fill="#fff0a2"/><path d="m80 101-18-12m177 70 21 5"/>',
  '<path d="m70 146 167-65-46 149-37-61Z" fill="#e9acb1"/><path d="m154 169 83-88-118 73m35 15 5 38" fill="none"/><path d="M64 185h42m-20 20h31"/><circle cx="94" cy="89" r="16" fill="#f4d685"/><path d="m85 89 6 6 12-12" fill="none"/>',
  '<ellipse cx="160" cy="145" rx="87" ry="54" fill="#92badf"/><path d="M85 159c43 22 115 14 160-32M160 91c-53 35-48 80 0 108M160 91c53 35 48 80 0 108" fill="none"/><path d="m205 61 7 18 19 4-16 12 1 20-16-12-19 7 7-19-11-16 20 1Z" fill="#ffe3a1"/><path d="M81 213c37 19 135 6 169-22" fill="none"/>'
];
const labels = ['TOKEN / OPEN SOURCE', 'TOOLS / MINI APP', 'CREATE / WORKFLOW', 'AVEN / PERSONAL SITE'];
const scenes = [
  '<div class="demo-toolbar">TOKEN MANAGER <span>● ● ●</span></div><div class="demo-layout"><div class="demo-sidebar">Overview<br />Keys<br />Usage<br />Settings</div><div class="demo-main"><b>一个地方，管理你的 Token</b><div class="demo-key">API KEY <span>•••• •••• ••••</span></div><div class="demo-key">API KEY <span>•••• •••• ••••</span></div><div class="demo-meter"><i></i></div><small>集中整理 · 随时查找</small></div></div>',
  '<div class="demo-phone"><div class="phone-island"></div><b>多啦百宝工具</b><small>31 个工具，一点生活便利</small><div class="demo-tools"><i>⌕</i><i>⇄</i><i>◷</i><i>▦</i><i>✂</i><i>⌘</i></div><span class="demo-tap"></span></div><div class="demo-phone-copy">小工具<br /><strong>大便利。</strong></div>',
  '<div class="demo-toolbar">CONTENT STUDIO <span>✦</span></div><div class="demo-workflow"><span>灵感</span><i>→</i><span>创作</span><i>→</i><span>分享</span></div><div class="demo-draft"><b>把想法，变成内容。</b><i></i><i></i><i></i></div>',
  '<div class="demo-sky"><b>aven</b><span>溺心海</span><i>探索 · 造物 · 分享</i></div>'
];

export function initProjectCards(site) {
  const list = document.querySelector('#work-list');
  const rows = [...list.querySelectorAll('.project-folder')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  // Reuse the existing switch so both controls start in the same state.
  if (!list.classList.contains('grid')) document.querySelector('#view-toggle').click();
  rows.forEach((row, index) => {
    const art = Number(site.projects[index].artwork) || 0;
    const artwork = document.createElement('span'); artwork.className = 'project-art'; artwork.setAttribute('aria-hidden', 'true');
    artwork.innerHTML = `<svg class="project-mascot" viewBox="0 0 320 270" fill="none" stroke="#24334e" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"><ellipse cx="160" cy="242" rx="65" ry="9" stroke="none" fill="#24334e18"/><g class="mascot-swing">${drawings[art] || drawings[0]}</g><g class="mascot-spark" stroke="#cba85a"><path d="M60 57v20m-10-10h20M257 208v14m-7-7h14"/></g></svg>`;
    const tag = document.createElement('span'); tag.className = 'folder-tab'; tag.textContent = `${String(index + 1).padStart(2, '0')} / ${site.projects[index].year}`;
    const description = document.createElement('p'); description.className = 'folder-description'; description.textContent = site.projects[index].description;
    row.prepend(tag, artwork); row.append(description); row.style.setProperty('--swing-delay', `${-index * .7}s`);
  });
  const popup = document.createElement('div'); popup.className = 'project-motion-preview'; popup.setAttribute('aria-hidden', 'true');
  document.body.append(popup);
  let active = null, frame = 0, x = 0, y = 0, currentX = 0, currentY = 0, lastTime = 0, hideTimer;
  const panels = new Map();
  function position(time) {
    frame = 0;
    const width = popup.offsetWidth, height = popup.offsetHeight;
    const left = Math.max(12, Math.min(x + 24, innerWidth - width - 12));
    const top = Math.max(12, Math.min(y - height * .35, innerHeight - height - 16));
    const weight = 1 - Math.exp(-Math.min(50, time - (lastTime || time - 16)) / 55); lastTime = time;
    currentX += (left - currentX) * weight; currentY += (top - currentY) * weight;
    popup.style.translate = `${currentX}px ${currentY}px`;
    if (active && Math.abs(left - currentX) + Math.abs(top - currentY) > .2) frame = requestAnimationFrame(position);
  }
  function hide() {
    clearTimeout(hideTimer); cancelAnimationFrame(frame); frame = 0; lastTime = 0;
    active = null; popup.classList.remove('is-active');
    popup.querySelectorAll('video').forEach(video => video.pause());
    rows.forEach(row => row.classList.remove('previewing'));
  }
  const leave = () => { clearTimeout(hideTimer); hideTimer = setTimeout(hide, 110); };
  function panelFor(index) {
    if (panels.has(index)) return panels.get(index);
    const panel = document.createElement('div'); panel.className = 'preview-panel';
    const project = site.projects[index];
    const scene = document.createElement('div'); scene.className = 'project-demo';
    const caption = document.createElement('div'); caption.className = 'preview-caption';
    caption.textContent = `${project.name} · ${project.previewVideo ? '项目视频' : '项目封面'}`;
    const fallback = () => {
      const image = document.createElement('img'); image.src = project.image; image.alt = '';
      image.style.cssText = 'width:100%;height:100%;object-fit:contain';
      scene.replaceChildren(image); caption.textContent = `${project.name} · 项目封面`;
    };
    if (project.previewVideo) {
      const video = document.createElement('video'); video.src = project.previewVideo; video.muted = true; video.loop = true; video.playsInline = true; video.preload = 'metadata'; scene.append(video);
      video.addEventListener('error', fallback, { once: true });
      video.addEventListener('loadeddata', () => { if (active === rows[index]) video.play().catch(() => {}); }, { once: true });
    } else fallback();
    const eyebrow = document.createElement('div'); eyebrow.className = 'preview-eyebrow'; eyebrow.textContent = project.service;
    panel.append(eyebrow, scene, caption); popup.append(panel); panels.set(index, panel);
    return panel;
  }
  function show(row, index, event) {
    if (!fine.matches || reduced.matches || document.body.matches('.locked, .page-transitioning, .section-scrolling')) return;
    clearTimeout(hideTimer);
    const visible = popup.classList.contains('is-active');
    active?.classList.remove('previewing'); active = row; row.classList.add('previewing');
    const panel = panelFor(index);
    panels.forEach(item => {
      item.classList.toggle('is-current', item === panel);
      const video = item.querySelector('video');
      if (video) { if (item === panel) video.play().catch(() => {}); else video.pause(); }
    });
    const rect = row.getBoundingClientRect(); x = event?.clientX ?? rect.left + rect.width / 2; y = event?.clientY ?? rect.top + rect.height / 2;
    if (!visible) {
      currentX = Math.max(12, Math.min(x + 24, innerWidth - popup.offsetWidth - 12));
      currentY = Math.max(12, Math.min(y - popup.offsetHeight * .35, innerHeight - popup.offsetHeight - 16));
      popup.style.translate = `${currentX}px ${currentY}px`; lastTime = 0;
    }
    if (!frame) frame = requestAnimationFrame(position);
    popup.classList.add('is-active');
  }
  rows.forEach((row, index) => {
    row.addEventListener('pointerenter', event => show(row, index, event));
    row.addEventListener('pointermove', event => { if (active !== row) return; x = event.clientX; y = event.clientY; if (!frame) frame = requestAnimationFrame(position); });
    row.addEventListener('pointerleave', leave); row.addEventListener('click', hide);
    row.addEventListener('focus', () => show(row, index)); row.addEventListener('blur', leave);
  });
  // Pointer still over a card after a navigation scroll should remain previewable.
  ['resize', 'blur', 'page-transition-start', 'scroll'].forEach(type => addEventListener(type, hide, { passive: true }));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });
  document.querySelector('#view-toggle').addEventListener('click', hide);
  document.querySelector('.menu-toggle').addEventListener('click', hide);
  reduced.addEventListener('change', hide); fine.addEventListener('change', hide);
  new IntersectionObserver(entries => entries.forEach(entry => entry.target.classList.toggle('art-visible', entry.isIntersecting))).observe(list);
}
