// Aven's small Web Audio sound palette. Reference analysis: docs/sound-design.md.
import './sound.css';

const AudioEngine = window.AudioContext || window.webkitAudioContext;
const preference = 'aven-sound';
let enabled = true;
try { enabled = localStorage.getItem(preference) !== 'off'; } catch { /* Storage may be unavailable. */ }
let context, master, noise, initialized = false, revision = 0;
const active = new Set();
const lastPlayed = new Map();
const controls = [];

function unlock() {
  if (!AudioEngine || !enabled || document.hidden) return;
  try {
    if (!context) {
      context = new AudioEngine({ latencyHint: 'interactive' });
      master = context.createGain(); master.gain.value = .45;
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -20; compressor.knee.value = 12;
      compressor.ratio.value = 5; compressor.attack.value = .003; compressor.release.value = .18;
      master.connect(compressor).connect(context.destination);
      noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const samples = noise.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    }
    if (context.state !== 'running') context.resume().catch(() => {});
  } catch { /* Audio must never interrupt navigation. */ }
}

function stop() {
  revision++;
  active.forEach(source => { try { source.stop(); } catch { /* Already ended. */ } });
}

function voice(time, pan, { from = 700, to = from, duration = .07, gain = .1, delay = 0, texture = false, type = 'sine', attack = .003, filterType = 'bandpass', q = 1.5 } = {}) {
  const start = time + delay;
  const source = texture ? context.createBufferSource() : context.createOscillator();
  const envelope = context.createGain();
  const nodes = [source, envelope];
  if (texture) {
    source.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = filterType; filter.Q.value = q;
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(to, start + duration);
    source.connect(filter).connect(envelope); nodes.push(filter);
  } else {
    source.type = type;
    source.frequency.setValueAtTime(from, start);
    source.frequency.exponentialRampToValueAtTime(to, start + duration);
    source.connect(envelope);
  }
  envelope.gain.setValueAtTime(.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + attack);
  envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
  if (context.createStereoPanner) {
    const panner = context.createStereoPanner(); panner.pan.value = pan;
    envelope.connect(panner).connect(master); nodes.push(panner);
  } else envelope.connect(master);
  active.add(source);
  source.onended = () => { active.delete(source); nodes.forEach(node => node.disconnect()); };
  if (texture) source.start(start, Math.random() * .5);
  else source.start(start);
  source.stop(start + duration + .015);
}

// Distinct materials and envelopes, with harmonic pitches shared across the site.
const pluck = (frequency, gain = .085, delay = 0) => [
  { from: frequency, type: 'triangle', duration: .2, gain, delay },
  { from: frequency * 2, duration: .075, gain: gain * .2, delay },
];
const glass = (frequency, gain = .075) => [
  { from: frequency, duration: .36, gain },
  { from: frequency * 2.76, duration: .15, gain: gain * .22 },
  { from: frequency * 4.07, duration: .07, gain: gain * .1 },
];
const palette = {
  hover: [{ texture: true, from: 5600, duration: .012, gain: .045 }],
  tap: [{ from: 710, to: 470, duration: .065, gain: .14 }, { texture: true, from: 1800, duration: .014, gain: .055 }],
  open: [{ from: 520, to: 880, duration: .11, gain: .14 }, { texture: true, from: 3000, to: 6200, duration: .085, gain: .035 }],
  close: [{ from: 780, to: 430, duration: .11, gain: .13 }],
  flip: [{ texture: true, from: 2600, to: 5400, duration: .065, gain: .13 }, { texture: true, from: 4200, to: 2400, duration: .045, delay: .035, gain: .07 }],
  toggle: [{ from: 660, to: 990, duration: .07, gain: .13 }, { texture: true, from: 4200, duration: .012, gain: .08 }],
  key: [{ texture: true, from: 3200, duration: .012, gain: .085 }, { from: 1650, duration: .01, gain: .018 }],
  drop: [{ from: 460, to: 340, duration: .065, gain: .13 }, { texture: true, from: 1400, duration: .035, gain: .1 }],
  success: [{ from: 659.25, duration: .32, gain: .1 }, { from: 987.77, delay: .085, duration: .38, gain: .09 }],
  reset: [{ from: 440, to: 880, type: 'triangle', duration: .13, gain: .07 }, { from: 1318.51, delay: .12, duration: .22, gain: .065 }],
  'nav-hover': pluck(392, .065),
  navigate: [...pluck(392), ...pluck(587.33, .065, .065)],
  'project-hover': glass(659.25, .055),
  project: [...glass(659.25), ...pluck(987.77, .07, .085)],
  'paper-hover': [{ texture: true, from: 1700, to: 3300, duration: .08, attack: .015, gain: .075, q: .6 }],
  paper: [{ texture: true, from: 900, to: 3400, duration: .16, attack: .025, gain: .14, q: .5 }, { texture: true, from: 2800, to: 1200, duration: .1, delay: .065, gain: .08, q: .7 }],
  'wood-hover': [{ from: 370, to: 290, duration: .045, gain: .1 }, { texture: true, from: 1100, duration: .025, gain: .07, q: 4 }],
  wood: [{ from: 310, to: 170, duration: .09, gain: .16 }, { texture: true, from: 880, duration: .045, gain: .12, q: 3 }],
  'camera-hover': [{ texture: true, from: 2400, duration: .018, gain: .1 }, { texture: true, from: 1600, duration: .025, delay: .04, gain: .06 }],
  shutter: [{ texture: true, from: 3200, duration: .025, gain: .18, q: 2 }, { texture: true, from: 1400, duration: .045, delay: .065, gain: .15 }, { from: 180, duration: .03, delay: .065, gain: .07 }],
  'terminal-hover': [{ from: 880, type: 'square', duration: .026, gain: .022 }],
  boot: [{ from: 440, type: 'square', duration: .055, gain: .03 }, { from: 880, type: 'square', duration: .07, delay: .075, gain: .025 }],
  enter: [{ texture: true, from: 1500, duration: .025, gain: .12 }, { from: 523.25, type: 'square', duration: .045, delay: .04, gain: .025 }],
  erase: [{ texture: true, from: 1800, to: 850, duration: .04, gain: .1 }],
  error: [{ from: 220, type: 'triangle', duration: .08, gain: .1 }, { from: 164.81, type: 'triangle', duration: .12, delay: .09, gain: .08 }],
  'menu-open': [{ texture: true, from: 450, to: 2400, duration: .23, attack: .055, gain: .12, q: .6 }, { from: 196, to: 293.66, duration: .15, gain: .09 }],
  'menu-close': [{ texture: true, from: 2400, to: 450, duration: .18, attack: .025, gain: .11, q: .6 }],
  'switch-hover': [{ texture: true, from: 4200, duration: .008, gain: .09, q: 3 }],
  'switch-grid': [{ texture: true, from: 3300, duration: .015, gain: .15, q: 3 }, { texture: true, from: 4800, duration: .012, delay: .045, gain: .1, q: 3 }],
  'switch-list': [{ texture: true, from: 2200, duration: .018, gain: .14, q: 3 }, { from: 260, duration: .025, gain: .09 }],
  'contact-hover': [{ from: 740, to: 1110, duration: .065, gain: .065 }],
  contact: [...pluck(523.25), ...pluck(659.25, .075, .075), ...pluck(783.99, .065, .15)],
  send: [{ texture: true, from: 900, to: 4800, duration: .16, attack: .025, gain: .09 }, { from: 600, to: 1200, duration: .13, gain: .075 }],
  locate: [{ from: 880, duration: .2, attack: .008, gain: .1 }, { from: 1760, duration: .26, delay: .07, gain: .035 }],
  'soft-close': [{ texture: true, filterType: 'lowpass', from: 650, to: 300, duration: .13, attack: .012, gain: .16 }],
};

export async function playSound(name, x, { pitch = 1, volume = 1, hover = false, variation = false } = {}) {
  if (!enabled || !context || document.hidden || !palette[name]) return;
  const now = performance.now();
  const channel = hover ? 'hover' : name;
  if (now - (lastPlayed.get(channel) ?? -Infinity) < (hover ? 110 : 45)) return;
  lastPlayed.set(channel, now);
  const token = revision;
  try {
    if (context.state !== 'running') await context.resume();
    if (!enabled || document.hidden || token !== revision || context.state !== 'running') return;
    const pan = Number.isFinite(x) ? Math.max(-.55, Math.min(.55, (x / innerWidth * 2 - 1) * .55)) : 0;
    const time = context.currentTime + .005;
    const tuning = pitch * (variation ? .96 + Math.random() * .08 : 1);
    palette[name].forEach(note => voice(time, pan, {
      ...note, from: note.from * tuning, to: (note.to ?? note.from) * tuning,
      gain: note.gain * volume,
    }));
    controls.forEach(button => {
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        button.querySelector('.sound-bars').animate([{ opacity: .35 }, { opacity: 1 }], { duration: 220 });
      }
    });
  } catch { /* Unsupported or interrupted audio remains silent. */ }
}

function interactionSound(target) {
  const profile = (hover, click, pitch = 1) => ({ hover, click, pitch });
  if (target.matches('.project-folder, .case-next')) {
    const cards = [...document.querySelectorAll('.project-folder')];
    const index = target.matches('.case-next') ? cards.findIndex(card => card.hash === target.hash) : cards.indexOf(target);
    return profile('project-hover', 'project', [1, 1.1892, 1.4983, 1.7818][Math.max(0, index)] ?? 1);
  }
  if (target.matches('.menu-toggle')) return profile('wood-hover', target.getAttribute('aria-expanded') === 'true' ? 'menu-close' : 'menu-open');
  if (target.matches('[data-view], #view-toggle')) {
    const grid = target.dataset.view ? target.dataset.view === 'grid' : !document.querySelector('#work-list').classList.contains('grid');
    return profile('switch-hover', grid ? 'switch-grid' : 'switch-list');
  }
  if (target.matches('.photo-print, [data-window="desk-portrait"]')) return profile('camera-hover', 'shutter');
  if (target.matches('.photo-controls button, [data-window="desk-note"]') || target.closest('.journal')) return profile('paper-hover', 'paper');
  if (target.matches('[data-window="desk-terminal"]')) return profile('terminal-hover', 'boot');
  if (target.matches('.desk-close')) return profile('wood-hover', target.closest('.desk-note') ? 'paper' : 'soft-close');
  if (target.matches('.desk-reset')) return profile('wood-hover', 'reset');
  if (target.matches('.terminal-form button')) return profile('terminal-hover', null);
  if (target.matches('#about-button')) return profile('wood-hover', target.getAttribute('aria-expanded') === 'true' ? 'soft-close' : 'wood');
  if (target.matches('#contact-button')) return profile('contact-hover', 'contact');
  if (target.matches('#copy-email, #copy-wechat')) return profile('contact-hover', null);
  if (target.closest('.social-links, .direct-contact') || target.matches('#case-link, #contact-form button[type="submit"]')) return profile('contact-hover', 'send');
  if (target.matches('.dialog-close')) return profile('wood-hover', null);
  if (target.matches('.footprints-close')) return profile('switch-hover', 'soft-close');
  if (target.matches('a[href^="#"]')) {
    const section = ['#home', '#about', '#desk', '#work', '#footprints', '#blog', '#contact'].indexOf(target.hash);
    return profile('nav-hover', 'navigate', [1, 1.1225, 1.2599, 1.4983, 1.6818, 2, 2.245][Math.max(0, section)]);
  }
  return profile('hover', 'tap');
}

function updateControls() {
  controls.forEach(button => {
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', enabled ? '关闭音效' : '开启音效');
    button.title = enabled ? '关闭交互音效' : '开启交互音效';
    button.querySelector('.sound-label').textContent = enabled ? '音效 开' : '音效 关';
  });
}

export function initSound() {
  if (initialized || !AudioEngine) return;
  initialized = true;
  [document.body, ...document.querySelectorAll('dialog')].forEach(parent => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'sound-toggle';
    button.innerHTML = '<span class="sound-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="sound-label"></span>';
    controls.push(button); parent.append(button);
    button.addEventListener('click', event => {
      enabled = !enabled;
      try { localStorage.setItem(preference, enabled ? 'on' : 'off'); } catch { /* Optional persistence. */ }
      updateControls();
      if (enabled) { unlock(); playSound('toggle', event.detail ? event.clientX : undefined); }
      else { stop(); context?.suspend().catch(() => {}); }
    });
  });
  updateControls();
  ['pointerdown', 'pointerup', 'keydown', 'click'].forEach(type => document.addEventListener(type, event => {
    if (event.isTrusted) unlock();
  }, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stop(); context?.suspend().catch(() => {}); }
  });
  addEventListener('pagehide', stop);
  addEventListener('storage', event => {
    if (event.key !== preference && event.key !== null) return;
    enabled = event.newValue !== 'off'; updateControls();
    if (!enabled) { stop(); context?.suspend().catch(() => {}); }
  });

  const hoverTargets = 'a[href], button:not(.sound-toggle):not(.desk-handle)';
  document.addEventListener('pointerover', event => {
    if (event.pointerType !== 'mouse' || !event.isTrusted) return;
    const target = event.target.closest(hoverTargets);
    if (!target || target.disabled || target.contains(event.relatedTarget) || target.closest('[inert]')) return;
    // Only hover after a gesture has unlocked audio; never queue hover sounds.
    if (context?.state === 'running') {
      const profile = interactionSound(target);
      playSound(profile.hover, event.clientX, { pitch: profile.pitch, hover: true });
    }
  }, { passive: true });
  document.addEventListener('click', event => {
    if (!event.isTrusted || event.button !== 0) return;
    const target = event.target.closest('a[href], button');
    if (!target || target.disabled || target.closest('[inert]') || target.matches('.sound-toggle, .desk-handle')) return;
    const profile = interactionSound(target);
    if (profile.click) playSound(profile.click, event.detail ? event.clientX : undefined, { pitch: profile.pitch });
  }, { capture: true });
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('close', () => playSound(dialog.matches('.photo-viewer') ? 'paper' : 'soft-close')));
  document.querySelector('#desk-command').addEventListener('keydown', event => {
    if (!event.isTrusted || event.repeat || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key.length === 1) playSound('key', undefined, { variation: true });
    else if (event.key === 'Backspace') playSound('erase', undefined, { variation: true });
  });
}
