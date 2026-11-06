import { geoCentroid, geoContains, geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import countries from './assets/world-countries.json';
import { playSound } from './sound.js';

const ease = t => 1 - (1 - t) ** 3;
const wrap = angle => ((angle + 180) % 360 + 360) % 360 - 180;

export function initFootprints(locations = []) {
  const canvas = document.querySelector('#footprint-globe');
  const stage = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  const select = document.querySelector('#footprint-region');
  const detail = document.querySelector('#footprint-detail');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const projection = geoOrthographic().clipAngle(90).precision(.7);
  const path = geoPath(projection, ctx);
  const sphere = { type: 'Sphere' };
  const graticule = geoGraticule10();
  const features = countries.features.filter(feature => feature.properties.code !== 'ATA');
  features.sort((a, b) => a.properties.name.localeCompare(b.properties.name, 'zh'));
  const byCode = new Map(features.map(feature => [feature.properties.code, feature]));
  const byLocation = new Map(locations.map(location => [location.country, location]));
  for (const feature of features) {
    const option = new Option(feature.properties.name, feature.properties.code);
    select.add(option);
  }

  let rotation = [-105, -25, 0];
  let selected = null;
  let turn = null;
  let pointer = null;
  let dragging = false;
  let visible = false;
  let pendingFrame = 0;
  let cardVersion = 0;
  const emptyMarkup = '<div class="footprints-empty"><span class="eyebrow">THE WORLD IS OPEN / 世界未完待续</span><p>选一处，看看这里会留下什么。</p></div>';

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const pixelRatio = Math.min((devicePixelRatio || 1) * 1.25, 2.5);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    projection.translate([width / 2, height / 2]).scale(Math.min(width, height) * .465);
    draw();
  }
  function draw() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    ctx.clearRect(0, 0, width, height);
    projection.rotate(rotation);
    ctx.beginPath(); path(sphere);
    ctx.fillStyle = '#fcfcfc'; ctx.fill();
    ctx.strokeStyle = '#a4a6a8'; ctx.lineWidth = 1.25; ctx.stroke();

    ctx.beginPath(); path(graticule);
    ctx.strokeStyle = '#d4d6d7'; ctx.lineWidth = .65; ctx.stroke();
    ctx.beginPath(); path({ type: 'FeatureCollection', features });
    ctx.fillStyle = '#e0e2e2'; ctx.fill();
    ctx.strokeStyle = '#babdbf'; ctx.lineWidth = .65; ctx.stroke();

    if (selected) {
      ctx.beginPath(); path(selected);
      ctx.fillStyle = '#cdd4dc'; ctx.fill();
      ctx.strokeStyle = '#4553ff'; ctx.lineWidth = 1.25; ctx.stroke();
      const location = byLocation.get(selected.properties.code);
      const coords = location?.coordinates || geoCentroid(selected);
      if (geoDistance(coords, [-rotation[0], -rotation[1]]) < Math.PI / 2) {
        const point = projection(coords);
        if (point) {
          ctx.beginPath(); ctx.arc(point[0], point[1], 11, 0, Math.PI * 2);
          ctx.strokeStyle = '#4553ff'; ctx.lineWidth = 1; ctx.stroke();
          ctx.beginPath(); ctx.arc(point[0], point[1], 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#4553ff'; ctx.fill();
        }
      }
    }
    const [lon, lat] = [wrap(-rotation[0]), -rotation[1]];
    document.querySelector('#earth-lat').textContent = `${Math.abs(lat).toFixed(1)}° ${lat >= 0 ? 'N' : 'S'}`;
    document.querySelector('#earth-lon').textContent = `${Math.abs(lon).toFixed(1)}° ${lon >= 0 ? 'E' : 'W'}`;
  }

  function showCards(feature) {
    const version = ++cardVersion;
    detail.replaceChildren();
    const location = byLocation.get(feature.properties.code);
    const entries = location?.entries?.length ? location.entries : [{ placeholder: 'photo' }, { placeholder: 'message' }];
    const heading = document.createElement('div');
    heading.className = 'footprints-detail-heading';
    const title = document.createElement('h3'); title.textContent = feature.properties.name;
    const close = document.createElement('button'); close.type = 'button'; close.className = 'footprints-close'; close.title = '关闭地区卡片'; close.setAttribute('aria-label', '关闭地区卡片'); close.textContent = '×';
    close.addEventListener('click', () => { clearSelection(); select.focus(); });
    heading.append(title, close);
    const subtitle = document.createElement('p'); subtitle.className = 'eyebrow'; subtitle.textContent = location?.entries?.length ? `${entries.length} MOMENTS / ${entries.length} 个片段` : 'TO BE CONTINUED / 待记录';
    detail.append(heading, subtitle);
    entries.forEach((entry, index) => {
      const card = document.createElement('article'); card.className = 'footprint-card';
      const image = document.createElement('div'); image.className = 'footprint-photo';
      if (entry?.photo) {
        const photo = document.createElement('img'); photo.src = entry.photo; photo.alt = entry.title || `${feature.properties.name}的照片`; photo.loading = 'lazy'; image.append(photo);
      } else if (entry?.placeholder === 'message') {
        image.classList.add('footprint-message-mark'); image.textContent = '“';
      } else {
        image.classList.add('footprint-photo-empty'); image.textContent = '照片待添加';
      }
      const body = document.createElement('div'); body.className = 'footprint-card-body';
      const date = document.createElement('span'); date.className = 'eyebrow'; date.textContent = entry?.date || (entry?.placeholder === 'message' ? '02 / MESSAGE' : '01 / PHOTO');
      const name = document.createElement('h4'); name.textContent = entry?.title || (entry?.placeholder === 'message' ? '留言待写' : '影像待记录');
      const message = document.createElement('p'); message.textContent = entry?.message || (entry?.placeholder === 'message' ? '这里会写下我在此刻想说的话。' : '以后在这里放一张照片。');
      body.append(date, name, message); card.append(image, body); detail.append(card);
      if (!motion.matches) card.animate([
        { opacity: 0, transform: 'translateY(42px)', clipPath: 'inset(22% 0 0 0)' },
        { opacity: 1, transform: 'translateY(0)', clipPath: 'inset(0 0 0 0)' },
      ], { duration: 750, delay: 100 + index * 120, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }).finished.then(() => {
        if (cardVersion === version) card.getAnimations().forEach(animation => animation.cancel());
      }).catch(() => {});
    });
    if (!motion.matches) heading.animate([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 500, fill: 'both' });
  }

  function choose(feature) {
    playSound('locate');
    selected = feature;
    select.value = feature.properties.code;
    const coords = byLocation.get(feature.properties.code)?.coordinates || geoCentroid(feature);
    const target = [-coords[0], -Math.max(-75, Math.min(75, coords[1])), 0];
    target[0] = rotation[0] + wrap(target[0] - rotation[0]);
    if (motion.matches) { rotation = target; turn = null; draw(); }
    else { turn = { start: rotation.slice(), target, time: performance.now(), duration: 900 }; requestFrame(); }
    showCards(feature);
  }
  function clearSelection() {
    selected = null; turn = null; select.value = ''; ++cardVersion;
    detail.innerHTML = emptyMarkup; draw();
  }
  select.addEventListener('change', () => {
    if (select.value) choose(byCode.get(select.value));
    else clearSelection();
  });
  function hit(event) {
    const rect = canvas.getBoundingClientRect();
    const point = [(event.clientX - rect.left) * canvas.clientWidth / rect.width, (event.clientY - rect.top) * canvas.clientHeight / rect.height];
    const center = projection.translate();
    if (Math.hypot(point[0] - center[0], point[1] - center[1]) > projection.scale()) return null;
    const coords = projection.invert(point);
    if (!coords || geoDistance(coords, [-rotation[0], -rotation[1]]) > Math.PI / 2) return null;
    return features.find(feature => geoContains(feature, coords));
  }
  stage.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || pointer || motion.matches) return;
    const rect = stage.getBoundingClientRect();
    const clamp = value => Math.max(-1, Math.min(1, value));
    stage.style.setProperty('--earth-hover-x', `${clamp((event.clientX - rect.left) / rect.width * 2 - 1) * 8}px`);
    stage.style.setProperty('--earth-hover-y', `${clamp((event.clientY - rect.top) / rect.height * 2 - 1) * 12}px`);
  });
  stage.addEventListener('pointerleave', () => {
    stage.style.removeProperty('--earth-hover-x');
    stage.style.removeProperty('--earth-hover-y');
  });
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    pointer = { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, rotation: rotation.slice() };
    dragging = false; turn = null; canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!pointer) { canvas.style.cursor = hit(event) ? 'pointer' : 'grab'; return; }
    if (Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 5) dragging = true;
    if (!dragging) return;
    const speed = 115 / projection.scale() * canvas.clientWidth / canvas.getBoundingClientRect().width;
    rotation = [pointer.rotation[0] + (event.clientX - pointer.startX) * speed, Math.max(-85, Math.min(85, pointer.rotation[1] - (event.clientY - pointer.startY) * speed)), 0];
    canvas.style.cursor = 'grabbing'; draw();
  });
  canvas.addEventListener('pointerup', event => {
    if (!pointer) return;
    if (!dragging) { const feature = hit(event); if (feature) choose(feature); }
    pointer = null; canvas.style.cursor = 'grab';
  });
  canvas.addEventListener('pointercancel', () => { pointer = null; canvas.style.cursor = 'grab'; });
  canvas.tabIndex = 0;
  canvas.addEventListener('keydown', event => {
    const delta = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] }[event.key];
    if (delta) { event.preventDefault(); turn = null; rotation = [rotation[0] + delta[0], Math.max(-85, Math.min(85, rotation[1] + delta[1])), 0]; draw(); }
    if (event.key === 'Enter') { event.preventDefault(); const coords = [-rotation[0], -rotation[1]]; const feature = features.find(item => geoContains(item, coords)); if (feature) choose(feature); }
  });
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; requestFrame(); }).observe(stage);
  document.addEventListener('visibilitychange', requestFrame);
  function requestFrame() {
    if (!pendingFrame && visible && !document.hidden && turn) pendingFrame = requestAnimationFrame(tick);
  }
  function tick(time) {
    pendingFrame = 0;
    if (visible && !document.hidden) {
      if (turn) {
        const progress = Math.min(1, (time - turn.time) / turn.duration);
        rotation = turn.start.map((value, index) => value + (turn.target[index] - value) * ease(progress));
        if (progress === 1) turn = null;
        draw();
      }
    }
    requestFrame();
  }
  resize();
}
