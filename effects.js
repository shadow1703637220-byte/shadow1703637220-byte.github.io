// Original implementation of the interaction behaviors studied on the reference site.
export function initEffects(site) {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const pointerQuery = matchMedia('(hover: hover) and (pointer: fine)');
  const motion = () => !motionQuery.matches;
  const pointer = () => motion() && pointerQuery.matches;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const ease = 'cubic-bezier(.22,1,.36,1)';
  document.documentElement.classList.add('enhanced-effects');

  // A fixed hit area and two independent spring layers prevent the button
  // moving its own pointer boundary while its label follows at a different rate.
  const magnets = [];
  const spring = (state, tx, ty, dt) => {
    const damping = Math.pow(.72, dt);
    state.vx = (state.vx + (tx - state.x) * .14 * dt) * damping;
    state.vy = (state.vy + (ty - state.y) * .14 * dt) * damping;
    state.x += state.vx * dt; state.y += state.vy * dt;
  };
  const state = () => ({ x: 0, y: 0, vx: 0, vy: 0 });
  $$('.round-button, .pill-button, .top-nav a, .side-menu nav a, .social-links a, .menu-toggle').forEach(element => {
    const isButton = element.matches('.round-button, .pill-button, .menu-toggle');
    const label = document.createElement('span');
    label.className = 'button-label';
    while (element.firstChild) label.append(element.firstChild);
    element.append(label);
    element.classList.add('magnet-control');
    if (isButton) {
      const fill = document.createElement('span');
      fill.className = 'button-wave'; fill.setAttribute('aria-hidden', 'true');
      element.prepend(fill);
      element.classList.add('wave-control');
      let animation;
      element.addEventListener('pointerenter', () => {
        if (!pointer()) return;
        const start = getComputedStyle(fill).transform;
        animation?.cancel();
        animation = fill.animate([{ transform: start }, { transform: 'translateY(0)' }], { duration: 260, easing: ease, fill: 'forwards' });
      });
      element.addEventListener('pointerleave', () => {
        const start = getComputedStyle(fill).transform;
        animation?.cancel();
        if (!pointer()) return;
        animation = fill.animate([{ transform: start }, { transform: 'translateY(76%)' }], { duration: 220, easing: ease, fill: 'forwards' });
      });
    }
    const magnet = { element, label, body: state(), text: state(), tx: 0, ty: 0 };
    magnets.push(magnet);
    element.addEventListener('pointermove', event => {
      if (!pointer()) return;
      const rect = element.getBoundingClientRect();
      const strength = element.matches('.round-button') ? 95 : element.matches('.menu-toggle') ? 45 : 24;
      magnet.tx = ((event.clientX - rect.left + magnet.body.x) / rect.width - .5) * strength;
      magnet.ty = ((event.clientY - rect.top + magnet.body.y) / rect.height - .5) * strength;
    });
    element.addEventListener('pointerleave', () => { magnet.tx = 0; magnet.ty = 0; });
    element.addEventListener('blur', () => { magnet.tx = 0; magnet.ty = 0; });
  });

  // The image, blue disc and label trail the pointer at independent speeds.
  const preview = $('.hover-preview');
  preview.replaceChildren();
  const reel = document.createElement('div'); reel.className = 'preview-reel';
  site.projects.forEach(project => {
    const image = new Image(); image.src = project.image; image.alt = '';
    reel.append(image);
  });
  preview.append(reel);
  const disc = document.createElement('div'); disc.className = 'project-cursor-disc';
  const cursorText = document.createElement('div'); cursorText.className = 'project-cursor-text'; cursorText.textContent = 'View ↗';
  for (const el of [disc, cursorText]) { el.setAttribute('aria-hidden', 'true'); document.body.append(el); }
  const follow = [preview, disc, cursorText].map((element, i) => ({ element, x: 0, y: 0, speed: [.1, .17, .21][i] }));
  let mouseX = 0, mouseY = 0, hover = false, initialized = false;
  const hideCursor = () => { hover = false; [preview, disc, cursorText].forEach(el => el.classList.remove('active', 'pressed')); };
  $$('.work-row:not(.project-folder)').forEach((row, index) => {
    row.addEventListener('pointerenter', event => {
      if (!pointer()) return;
      mouseX = event.clientX; mouseY = event.clientY;
      if (!initialized) { follow.forEach(item => { item.x = mouseX; item.y = mouseY; }); initialized = true; }
      hover = true;
      preview.classList.toggle('active', !$('#work-list').classList.contains('grid'));
      disc.classList.add('active'); cursorText.classList.add('active');
      reel.style.transform = `translateY(-${index * 100 / site.projects.length}%)`;
      reel.animate([{ scale: '.97' }, { scale: '1' }], { duration: 500, easing: ease });
    });
    row.addEventListener('pointermove', event => { mouseX = event.clientX; mouseY = event.clientY; });
    row.addEventListener('pointerleave', hideCursor);
    row.addEventListener('click', hideCursor);
    row.addEventListener('pointerdown', () => { disc.classList.add('pressed'); cursorText.classList.add('pressed'); });
  });
  addEventListener('pointerup', () => { disc.classList.remove('pressed'); cursorText.classList.remove('pressed'); });
  addEventListener('blur', hideCursor);
  addEventListener('page-transition-start', hideCursor);
  document.addEventListener('pointerleave', hideCursor);
  $('#view-toggle').addEventListener('click', hideCursor);
  $('.menu-toggle').addEventListener('click', hideCursor);

  // The greeting curtain and staggered entrance mirror the reference's timing.
  const loader = $('.loader');
  const greeting = loader.querySelector('span');
  if (motion()) {
    loader.classList.add('greeting-loader');
    ['Hello', 'Bonjour', 'こんにちは', 'Ciao', '你好'].forEach((word, i) => {
      setTimeout(() => { greeting.textContent = word; }, i * 180);
    });
    setTimeout(() => {
      loader.classList.add('departing');
      $$('.top-nav, .location, .hero-role, .name-marquee').forEach((el, i) => {
        el.animate([{ opacity: .15, translate: '0 90px' }, { opacity: 1, translate: '0 0' }], { duration: 1250, delay: i * 45, easing: ease });
      });
    }, 1050);
    setTimeout(() => { loader.hidden = true; }, 2200);
  } else loader.hidden = true;

  // Reveal the intro line by line without changing its words or accessibility text.
  const heading = $('.intro-main h2');
  const originalLabel = heading.textContent;
  const lines = [[]];
  [...heading.childNodes].forEach(node => {
    if (node.nodeName === 'BR') lines.push([]);
    else lines.at(-1).push(node);
  });
  heading.replaceChildren(); heading.setAttribute('aria-label', originalLabel);
  lines.forEach((nodes, i) => {
    const clip = document.createElement('span'); clip.className = 'line-clip'; clip.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('span'); inner.className = 'line-content'; inner.style.setProperty('--line-index', i);
    inner.append(...nodes); clip.append(inner); heading.append(clip);
  });
  const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('effect-visible'); revealObserver.unobserve(entry.target); }
  }), { threshold: .12 });
  heading.classList.add('effect-reveal'); revealObserver.observe(heading);

  // Scroll-responsive marquee, globe meridians, rotating arrows and footer curve.
  const track = $('.marquee-track');
  if (track) track.style.animation = 'none';
  // Two separate motions: the continuous 18-second loop and the horizontal
  // parallax tied to document scroll (reference data-scroll-speed="4").
  // Velocity-only acceleration cannot retrace the scroll position on the way up.
  let phase = 0, direction = 1, speed = 1, lastY = scrollY;
  let unitWidth = track?.firstElementChild.getBoundingClientRect().width || 0;
  const resize = new ResizeObserver(() => { unitWidth = track.firstElementChild.getBoundingClientRect().width; });
  if (track) resize.observe(track.firstElementChild);
  const footer = $('footer');
  const curve = document.createElement('div'); curve.className = 'footer-curve'; curve.setAttribute('aria-hidden', 'true');
  footer.prepend(curve);
  const globe = $('.globe');
  if (globe) {
  globe.replaceChildren();
  const axis = document.createElement('span'); axis.className = 'globe-axis';
  for (let i = 0; i < 3; i++) { const ring = document.createElement('i'); ring.style.setProperty('--ring', i); axis.append(ring); }
  globe.append(axis);
  for (let i = 0; i < 2; i++) { const latitude = document.createElement('b'); latitude.className = 'globe-latitude'; globe.append(latitude); }
  }

  // Keep wheel/trackpad scrolling native so rendering cannot delay scroll input.
  let scrollDirty = true;
  ['scroll', 'resize', 'page-transition-end'].forEach(type => addEventListener(type, () => { scrollDirty = true; requestFrame(); }, { passive: true }));

  const activeObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      $$('.side-menu nav a, .nav-links a').forEach(link => {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-20% 0px -55% 0px' });
  ['#home', '#about', '#work', '#footprints', '#contact'].forEach(id => activeObserver.observe($(id)));

  // Animate dialogs at their existing destination without changing mail or links.
  $$('dialog').forEach(dialog => {
    new MutationObserver(() => {
      if (!dialog.open || !motion()) return;
      dialog.animate([{ opacity: 0, transform: 'translateY(55px)', clipPath: 'inset(12% 0 0 round 35% 35% 0 0)' }, { opacity: 1, transform: 'translateY(0)', clipPath: 'inset(0% 0 0 round 0% 0% 0 0)' }], { duration: 650, easing: ease });
    }).observe(dialog, { attributes: true, attributeFilter: ['open'] });
  });
  function resetMotion() {
    scrollDirty = true; hideCursor();
    magnets.forEach(item => { item.tx = 0; item.ty = 0; item.body = state(); item.text = state(); item.element.style.translate = ''; item.label.style.translate = ''; });
    if (!motion()) { loader.hidden = true; if (track) track.style.transform = ''; }
    lastY = scrollY;
    requestFrame();
  }
  motionQuery.addEventListener('change', resetMotion);
  pointerQuery.addEventListener('change', resetMotion);

  let lastTime = 0, pendingFrame = 0;
  function requestFrame() {
    if (!pendingFrame && motion() && !document.hidden) pendingFrame = requestAnimationFrame(frame);
  }
  // Wake springs on input and stop scheduling when they settle.
  ['pointermove', 'pointerout', 'focusout'].forEach(type => document.addEventListener(type, requestFrame, { passive: true }));
  document.addEventListener('visibilitychange', () => { lastTime = 0; scrollDirty = true; requestFrame(); });
  function frame(time) {
    pendingFrame = 0;
    const dt = clamp((time - (lastTime || time - 16.67)) / 16.67, .1, 2); lastTime = time;
    if (motion() && !document.hidden) {
      const movingMagnets = magnets.filter(item => Math.abs(item.tx - item.body.x) + Math.abs(item.ty - item.body.y) + Math.abs(item.tx * .45 - item.text.x) + Math.abs(item.ty * .45 - item.text.y) + Math.abs(item.body.vx) + Math.abs(item.body.vy) + Math.abs(item.text.vx) + Math.abs(item.text.vy) > .01);
      if (scrollDirty || track) {
        scrollDirty = false;
        const delta = scrollY - lastY; lastY = scrollY;
        if (Math.abs(delta) > .2) direction = delta > 0 ? 1 : -1;
        speed += (direction - speed) * (1 - Math.pow(.82, dt));
        phase = unitWidth ? ((phase + speed * (unitWidth / 1080) * dt) % unitWidth + unitWidth) % unitWidth : 0;
        const scrollOffset = clamp(scrollY, 0, $('.hero').offsetHeight) * .4;
        const position = unitWidth ? ((phase + scrollOffset) % unitWidth + unitWidth) % unitWidth : 0;
        if (track) track.style.transform = `translateX(${-position}px)`;
        const directionArrow = $('.direction-arrow');
        if (directionArrow) directionArrow.style.rotate = `${clamp(scrollY / innerHeight, 0, 1) * 90}deg`;
        const progress = clamp((innerHeight - footer.getBoundingClientRect().top) / innerHeight, 0, 1);
        footer.style.setProperty('--curve-height', `${(1 - progress) * 95}px`);
        $('.contact-arrow').style.rotate = `${(1 - progress) * 20}deg`;
        $('#contact-button').style.setProperty('--footer-shift', `${(progress - .5) * -75}px`);
        $('.footer-inner').style.translate = `0 ${(1 - progress) * -35}px`;
        $('.menu-toggle').classList.toggle('over-footer', progress > .8);
      }
      movingMagnets.forEach(item => {
        if (pointer()) {
          spring(item.body, item.tx, item.ty, dt); spring(item.text, item.tx * .45, item.ty * .45, dt);
          item.element.style.translate = `${item.body.x}px ${item.body.y}px`;
          item.label.style.translate = `${item.text.x}px ${item.text.y}px`;
        }
      });
      if (hover) follow.forEach(item => {
        const weight = 1 - Math.pow(1 - item.speed, dt);
        item.x += (mouseX - item.x) * weight; item.y += (mouseY - item.y) * weight;
        item.element.style.left = `${item.x}px`; item.element.style.top = `${item.y}px`;
      });
      if (movingMagnets.length || hover || track) requestFrame();
    }
  }
  requestFrame();
}
