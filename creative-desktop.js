// Independently implemented desktop interactions, inspired by elliothu.me.
import { playSound } from './sound.js';
export function initCreativeDesktop(site) {
  const desk = document.querySelector('.creative-desktop');
  const workspace = desk.querySelector('.desk-workspace');
  const windows = [...desk.querySelectorAll('.desk-window')];
  const dock = desk.querySelector('.desk-dock');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const movable = matchMedia('(min-width: 701px)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const positions = new Map(windows.map(window => [window, { x: 0, y: 0 }]));
  let layer = 4;
  const windowAnimations = new Map();
  function animateWindow(window, opening) {
    const style = getComputedStyle(window);
    const from = { opacity: style.opacity, scale: style.scale === 'none' ? '1' : style.scale };
    windowAnimations.get(window)?.cancel();
    if (reduced.matches) { window.hidden = !opening; return; }
    const animation = window.animate([
      opening && window.hidden ? { opacity: 0, scale: '.94' } : from,
      opening ? { opacity: 1, scale: '1' } : { opacity: 0, scale: '.94' },
    ], { duration: opening ? 260 : 160, easing: 'cubic-bezier(.22,1,.36,1)' });
    window.hidden = false;
    windowAnimations.set(window, animation);
    animation.onfinish = () => { if (windowAnimations.get(window) === animation) { window.hidden = !opening; windowAnimations.delete(window); } };
  }
  const activate = window => { window.style.zIndex = ++layer; };
  function move(window, x, y) {
    const position = positions.get(window);
    const bounds = workspace.getBoundingClientRect();
    const box = window.getBoundingClientRect();
    const originX = box.left - bounds.left - position.x;
    const originY = box.top - bounds.top - position.y;
    position.x = Math.max(-originX, Math.min(x, bounds.width - box.width - originX));
    position.y = Math.max(-originY, Math.min(y, bounds.height - box.height - originY));
    window.style.setProperty('--window-x', `${position.x}px`);
    window.style.setProperty('--window-y', `${position.y}px`);
  }
  function restore(window, focus = true) {
    if (window.hidden || windowAnimations.has(window)) animateWindow(window, true);
    window.inert = false;
    dock.querySelector(`[data-window="${window.id}"]`)?.setAttribute('aria-expanded', 'true'); // 便签/头像已无 dock 按钮（2026-11-06），找不到时跳过
    activate(window);
    if (focus) window.querySelector(window.id === 'desk-terminal' ? 'input' : '.desk-handle').focus({ preventScroll: true });
    if (focus && !movable.matches) window.scrollIntoView({ behavior: 'instant', block: 'center' });
  }
  windows.forEach(window => {
    const handle = window.querySelector('.desk-handle');
    let drag;
    window.addEventListener('pointerdown', () => activate(window));
    window.addEventListener('focusin', () => activate(window));
    window.querySelector('.desk-close').addEventListener('click', () => {
      animateWindow(window, false); window.inert = true;
      const launcher = dock.querySelector(`[data-window="${window.id}"]`);
      if (launcher) { launcher.setAttribute('aria-expanded', 'false'); launcher.focus({ preventScroll: true }); }
    });
    handle.addEventListener('pointerdown', event => {
      if (!movable.matches || event.button !== 0) return;
      drag = { pointer: event.pointerId, clientX: event.clientX, clientY: event.clientY, ...positions.get(window) };
      handle.setPointerCapture(event.pointerId); window.classList.add('is-dragging');
    });
    handle.addEventListener('pointermove', event => {
      if (drag && movable.matches) move(window, drag.x + event.clientX - drag.clientX, drag.y + event.clientY - drag.clientY);
    });
    const stop = () => {
      if (drag) {
        const position = positions.get(window);
        if (Math.hypot(position.x - drag.x, position.y - drag.y) > 3) {
          playSound(window.id === 'desk-note' ? 'paper' : window.id === 'desk-portrait' ? 'wood' : 'drop', undefined, { variation: true });
        }
      }
      drag = null; window.classList.remove('is-dragging');
    };
    handle.addEventListener('lostpointercapture', stop);
    handle.addEventListener('pointercancel', stop);
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('keydown', event => {
      const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (!movable.matches || !directions[event.key]) return;
      event.preventDefault(); const [dx, dy] = directions[event.key]; const { x, y } = positions.get(window);
      move(window, x + dx * (event.shiftKey ? 30 : 10), y + dy * (event.shiftKey ? 30 : 10));
    });
  });
  dock.querySelectorAll('[data-window]').forEach(button => button.addEventListener('click', () => restore(document.getElementById(button.dataset.window))));
  function reset() {
    windows.forEach(window => {
      positions.set(window, { x: 0, y: 0 });
      window.style.removeProperty('--window-x'); window.style.removeProperty('--window-y');
      window.style.removeProperty('z-index');
    });
    layer = 4;
  }
  desk.querySelector('.desk-reset').addEventListener('click', () => { windows.forEach(window => restore(window, false)); reset(); });
  new ResizeObserver(reset).observe(workspace);

  const icons = [...dock.querySelectorAll('.dock-icon')];
  const resetDock = () => icons.forEach(icon => { icon.style.removeProperty('--dock-scale'); icon.style.removeProperty('--dock-lift'); });
  dock.addEventListener('pointermove', event => {
    if (reduced.matches || !fine.matches) return;
    icons.forEach(icon => {
      const rect = icon.parentElement.getBoundingClientRect();
      const proximity = Math.max(0, 1 - Math.abs(event.clientX - rect.left - rect.width / 2) / 110);
      icon.style.setProperty('--dock-scale', 1 + proximity * .32);
      icon.style.setProperty('--dock-lift', proximity * 8);
    });
  });
  dock.addEventListener('pointerleave', resetDock);
  reduced.addEventListener('change', resetDock);

  const output = desk.querySelector('.terminal-output');
  const input = desk.querySelector('#desk-command');
  const history = []; let historyIndex = 0;
  function write(text) {
    const line = document.createElement('p'); line.textContent = text; output.append(line);
    while (output.childElementCount > 40) output.firstElementChild.remove();
    output.scrollTop = output.scrollHeight;
  }
  desk.querySelector('.terminal-form').addEventListener('submit', event => {
    event.preventDefault(); const command = input.value.trim().toLowerCase();
    if (!command) return;
    history.push(command); if (history.length > 40) history.shift(); historyIndex = history.length;
    input.value = ''; write(`aven ~ % ${command}`);
    const routes = { work: '#work', about: '#about', blog: '#blog', contact: '#contact', home: '#home' };
    playSound(['clear', 'help', 'whoami', 'notes'].includes(command) || routes[command] ? 'enter' : 'error');
    if (command === 'clear') output.replaceChildren();
    else if (command === 'help') write('whoami   认识 Aven\nwork     看看作品\nabout    关于我\nblog     读读文章\ncontact  联系我\nhome     回到星空\nnotes    打开便签\nclear    清空终端');
    else if (command === 'whoami') write(`${site.name} / ${site.role}\n${site.heroDescription}`);
    else if (command === 'notes') { restore(document.getElementById('desk-note')); write('灵感便签已打开。'); }
    else if (routes[command]) {
      const link = document.createElement('a'); link.href = routes[command]; desk.append(link); link.click(); link.remove();
    } else write(`还不认识「${command}」。输入 help 查看可用命令。`);
  });
  input.addEventListener('keydown', event => {
    if (!['ArrowUp', 'ArrowDown'].includes(event.key) || !history.length) return;
    event.preventDefault(); historyIndex = Math.max(0, Math.min(history.length, historyIndex + (event.key === 'ArrowUp' ? -1 : 1)));
    input.value = history[historyIndex] || '';
  });
}
