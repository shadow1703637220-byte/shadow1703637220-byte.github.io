// Scroll position owns entrance progress; stopping or reversing scroll retraces it.
export function initScrollScenes() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const groups = [
    '.intro-main, .intro-aside', '.desk-window', '.project-folder',
    '.earth-stage, .footprints-detail', '.journal-grid > a', '.archive-copy, .photo-box',
  ].map(selector => [...document.querySelectorAll(selector)]);
  const items = groups.flat().map(element => {
    // Replace the older timed upward reveal, including its initial hidden state.
    element.classList.remove('reveal', 'effect-reveal');
    return { element, animation: null };
  });
  let frame = 0;
  function update() {
    frame = 0;
    if (reduced.matches || document.body.classList.contains('project-view')) return;
    // Horizontal translation leaves these vertical measurements unchanged.
    const positions = items.map(({ element }) => element.getBoundingClientRect().top);
    items.forEach(({ element, animation }, index) => {
      if (!animation || element.hidden) return;
      const progress = element.matches(':focus-within') ? 1 :
        Math.max(0, Math.min(1, (innerHeight * .97 - positions[index]) / (innerHeight * .40)));
      animation.currentTime = progress * 1000;
    });
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  function setup() {
    items.forEach(item => { item.animation?.cancel(); item.animation = null; });
    if (reduced.matches) return;
    const distance = Math.min(170, innerWidth * .12);
    groups.forEach(group => {
      const rects = group.map(element => element.getBoundingClientRect());
      group.forEach((element, index) => {
        const rect = rects[index];
        const sameRow = rects.filter(other => Math.abs(other.top - rect.top) < 24);
        const center = sameRow.reduce((sum, other) => sum + other.left + other.width / 2, 0) / sameRow.length;
        const direction = sameRow.length > 1 ? (rect.left + rect.width / 2 < center ? -1 : 1) : (index % 2 ? 1 : -1);
        const animation = element.animate([
          { translate: `${direction * distance}px 0`, opacity: 0 },
          { translate: '0px 0', opacity: 1 },
        ], { duration: 1000, fill: 'both', easing: 'cubic-bezier(.22,.61,.36,1)' });
        animation.pause(); animation.currentTime = 0;
        items.find(item => item.element === element).animation = animation;
      });
    });
    update();
  }
  ['scroll', 'page-transition-end'].forEach(type => addEventListener(type, schedule, { passive: true }));
  addEventListener('resize', setup, { passive: true });
  document.addEventListener('focusin', schedule);
  document.addEventListener('focusout', schedule);
  reduced.addEventListener('change', setup);
  // Images, expanded biographies and the list/grid switch can move later sections.
  new ResizeObserver(schedule).observe(document.querySelector('main'));
  new MutationObserver(setup).observe(document.querySelector('#work-list'), { attributes: true, attributeFilter: ['class'] });
  setup();
}
