// Static artwork with compositor-friendly scroll transitions; no canvas redraws.
export function initHero() {
  const hero = document.querySelector('.hero');
  const scene = hero.querySelector('.hero-fallback');
  const intro = hero.querySelector('.hero-introduction');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = n => Math.max(0, Math.min(1, n));
  const animations = [];
  const tracks = [];
  let frame = 0, lastProgress = -1;
  const timeline = typeof ViewTimeline === 'function' ? new ViewTimeline({ subject: hero, axis: 'block', inset: '0px' }) : null;

  // The galaxy is a static vector layer: rendered once instead of rebuilt on scroll.
  const ns = 'http://www.w3.org/2000/svg';
  const galaxy = document.createElementNS(ns, 'svg');
  galaxy.classList.add('hero-galaxy');
  galaxy.setAttribute('viewBox', '0 0 1000 600');
  galaxy.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 12; i++) {
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', `M 530 ${290 + i * 2} C 690 ${340 + i * 3}, 650 ${150 + i * 2}, 830 ${190 + i * 2} S 1000 ${160 + i * 2}, 1050 100`);
    path.setAttribute('stroke', i % 3 === 0 ? '#ddd6a6' : '#a8c8e5');
    path.setAttribute('stroke-width', i % 3 === 0 ? '1' : '.6');
    galaxy.append(path);
  }
  scene.append(galaxy);

  function track(element, start, end, from, to) {
    const keyframes = [
      { ...from, offset: 0 }, { ...from, offset: start },
      { ...to, offset: end }, { ...to, offset: 1 },
    ];
    const animation = element.animate(keyframes, timeline ? {
      timeline, rangeStart: 'contain 0%', rangeEnd: 'contain 100%', fill: 'both',
    } : { duration: 1000, fill: 'both' });
    animations.push(animation);
    if (!timeline) { animation.pause(); animation.currentTime = 0; tracks.push(animation); }
  }
  function setup() {
    animations.splice(0).forEach(animation => animation.cancel());
    tracks.length = 0;
    hero.classList.toggle('is-painted', !reduced.matches);
    if (!reduced.matches) {
      // Background only softens; the opening text is what shrinks and fades.
      track(hero.querySelector('.hero-night'), 0, .58, { filter: 'blur(0px) brightness(1)' }, { filter: 'blur(12px) brightness(.72)' });
      track(hero.querySelector('.hero-portrait'), 0, .58, { filter: 'blur(0px) brightness(1)' }, { filter: 'blur(12px) brightness(.72)' });
      track(hero.querySelector('.hero-static-name'), 0, .52, { opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.78)' });
      track(hero.querySelector('.hero-caption'), .04, .34, { opacity: 1 }, { opacity: 0 });
      track(hero.querySelector('.scroll-cue'), 0, .22, { opacity: 1 }, { opacity: 0 });
      track(galaxy, .03, .25, { opacity: 0 }, { opacity: .65 });
      const pieces = [
        ['.hero-introduction-copy', .36, .82, -90],
        ['.hero-photo', .40, .86, 120],
      ];
      pieces.forEach(([selector, start, end, x]) => track(intro.querySelector(selector), start, end,
        { opacity: 0, transform: `translateX(${x}px)` }, { opacity: 1, transform: 'translateX(0px)' }));
    }
    lastProgress = -1; schedule();
  }
  function update() {
    frame = 0;
    const rect = hero.getBoundingClientRect();
    const progress = reduced.matches ? 0 : clamp(-rect.top / Math.max(1, hero.offsetHeight - hero.querySelector('.hero-stage').offsetHeight));
    if (progress === lastProgress) return;
    lastProgress = progress;
    intro.inert = reduced.matches || progress < .82;
    intro.style.visibility = !reduced.matches && progress > .36 ? 'visible' : 'hidden';
    // Older browsers use the same opacity/transform transitions, once per scroll frame.
    tracks.forEach(animation => { animation.currentTime = progress * 1000; });
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  ['scroll', 'resize', 'page-transition-end'].forEach(type => addEventListener(type, schedule, { passive: true }));
  reduced.addEventListener('change', () => {
    [hero.querySelector('.hero-night'), hero.querySelector('.hero-portrait'), hero.querySelector('.hero-static-name'), hero.querySelector('.hero-caption'), hero.querySelector('.scroll-cue'), galaxy, ...intro.querySelectorAll('[style]')].forEach(el => {
      el.style.removeProperty('opacity'); el.style.removeProperty('transform'); el.style.removeProperty('filter');
    });
    setup();
  });
  setup();
}
