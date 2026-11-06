/* macOS 程序坞 — 2026-11-06 从旧站（aven.nixinhai.top v49）平移：
   高斯鱼眼放大 + 呼吸抖动 + 悬停合成音效 + 点击弹跳 + 联系面板 + Spotify 迷你播放器 + 首次提示气泡。
   独立文件，类名/ID 全部 aven- 前缀，不依赖站内其他模块。 */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;

  var dockEl = document.getElementById('avenDock');
  if (!dockEl) return;
  var icons = Array.prototype.slice.call(dockEl.querySelectorAll('.aven-dock-icon'));

  /* —— Mac 式邻近放大 + 流畅抖动 + 悬停音效 —— */
  if (canHover && !reduceMotion) {
    var scales = icons.map(function () { return 1; });
    var running = false, mx = 0, my = 0, inside = false;

    /* 悬停音效：Web Audio 合成的轻“啵”声，无需音频文件 */
    var actx = null;
    function ensureAudio() {
      try {
        if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
        if (actx.state === 'suspended') actx.resume();
      } catch (e) { /* 不支持就安静 */ }
    }
    document.addEventListener('pointerdown', ensureAudio, { once: true });
    function blip(i) {
      if (!actx || actx.state !== 'running') return;
      try {
        var t0 = actx.currentTime;
        var o = actx.createOscillator(), g = actx.createGain();
        var f = 1900 + i * 120; // 清脆嘀嗒，每个图标音高略不同
        o.type = 'triangle';
        o.frequency.setValueAtTime(f, t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.045);
        o.connect(g); g.connect(actx.destination);
        o.start(t0); o.stop(t0 + 0.06);
      } catch (e) {}
    }
    var lastHover = -1;
    icons.forEach(function (el, i) {
      el.addEventListener('mouseenter', function () {
        ensureAudio();
        if (lastHover !== i) { lastHover = i; blip(i); }
      });
    });
    dockEl.addEventListener('mouseleave', function () { lastHover = -1; });

    function targetScale(el) {
      var r = el.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var d = Math.hypot(mx - cx, my - cy);
      var range = 160, sigma = 62; // Mac 式高斯衰减
      if (d > range) return 1;
      var t = Math.exp(-(d * d) / (2 * sigma * sigma));
      return 1 + 0.55 * t; // 最大放大 55%
    }
    function tick(now) {
      var settled = true;
      icons.forEach(function (el, i) {
        var tg = inside ? targetScale(el) : 1;
        scales[i] += (tg - scales[i]) * 0.2;
        if (Math.abs(tg - scales[i]) > 0.001) settled = false;
        el.style.transform = 'scale(' + scales[i].toFixed(3) + ')';
        /* 流畅呼吸抖动：放大越多抖得越明显，sine 驱动 */
        var img = el.querySelector('img');
        if (img) {
          var amt = Math.max(0, scales[i] - 1.22);
          if (amt > 0.005) {
            var ph = now * 0.007 + i * 1.3;
            img.style.transform = 'rotate(' + (Math.sin(ph) * 5 * amt).toFixed(2) + 'deg)' +
              ' translateY(' + (Math.sin(ph * 1.35) * 4 * amt).toFixed(2) + 'px)';
          } else if (img.style.transform) {
            img.style.transform = '';
          }
        }
      });
      if (!settled || inside) requestAnimationFrame(tick);
      else running = false;
    }
    function kick() { if (!running) { running = true; requestAnimationFrame(tick); } }
    dockEl.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; inside = true; kick(); });
    dockEl.addEventListener('mouseleave', function () { inside = false; kick(); });
  }

  /* —— 点击弹跳（Mac 程序坞手感） —— */
  icons.forEach(function (el) {
    el.addEventListener('click', function () {
      if (reduceMotion) return;
      var img = el.querySelector('img');
      if (!img) return;
      el.classList.remove('aven-bounce');
      void el.offsetWidth;
      el.classList.add('aven-bounce');
    });
  });

  /* —— 信息面板：Genie 神奇效果抽出 / 点击空白收回 —— */
  var infoBtn = document.getElementById('avenDockInfo');
  var panel = document.getElementById('avenInfoPanel');
  if (infoBtn && panel) {
    infoBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (panel.classList.contains('open')) {
        panel.classList.remove('open');
        setTimeout(function () { panel.hidden = true; }, 420);
      } else {
        panel.hidden = false;
        requestAnimationFrame(function () { requestAnimationFrame(function () { panel.classList.add('open'); }); });
      }
    });
    document.addEventListener('click', function (e) {
      if (panel.classList.contains('open') && !panel.contains(e.target)) {
        panel.classList.remove('open');
        setTimeout(function () { panel.hidden = true; }, 420);
      }
    });
  }

  /* —— 音乐：Spotify 官方嵌入，点击播放/再点暂停 —— */
  var musicBtn = document.getElementById('avenDockMusic');
  var miniPlayer = document.getElementById('avenMiniPlayer');
  var spController = null, spPlaying = false;
  window.onSpotifyIframeApiReady = function (IFrameAPI) {
    var mount = document.getElementById('avenSpotifyEmbed');
    if (!mount) return;
    IFrameAPI.createController(mount,
      { uri: 'spotify:track:3gNdY7cdQckKDto9BP2dDW', width: '100%', height: '152' },
      function (controller) {
        spController = controller;
        controller.addListener('playback_update', function (e) {
          spPlaying = !e.data.isPaused;
          if (musicBtn) musicBtn.classList.toggle('playing', spPlaying);
        });
      });
  };
  setTimeout(function () { // API 加载失败兜底：放普通嵌入框，手动点播放
    var mount = document.getElementById('avenSpotifyEmbed');
    if (!spController && mount && !mount.firstChild) {
      mount.innerHTML = '<iframe src="https://open.spotify.com/embed/track/3gNdY7cdQckKDto9BP2dDW" width="100%" height="152" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Spotify 播放器"></iframe>';
    }
  }, 9000);
  if (musicBtn && miniPlayer) {
    musicBtn.addEventListener('click', function () {
      if (miniPlayer.hidden) {
        miniPlayer.hidden = false;
        requestAnimationFrame(function () { miniPlayer.classList.add('open'); });
        if (spController) spController.play();
      } else if (spController) {
        if (spPlaying) spController.pause(); else spController.play();
      }
    });
    var miniClose = document.getElementById('avenMiniClose');
    if (miniClose) miniClose.addEventListener('click', function (e) {
      e.stopPropagation();
      if (spController && spPlaying) spController.pause();
      miniPlayer.classList.remove('open');
      setTimeout(function () { miniPlayer.hidden = true; }, 320);
    });
  }

  /* —— 首次提示气泡：延迟弹出，首次交互后消失 —— */
  var hint = document.getElementById('avenDockHint');
  if (hint && !sessionStorage.getItem('dockHintSeen')) {
    var hideHint = function () {
      hint.classList.remove('show');
      try { sessionStorage.setItem('dockHintSeen', '1'); } catch (e) {}
      setTimeout(function () { hint.hidden = true; }, 500);
    };
    setTimeout(function () {
      hint.hidden = false;
      requestAnimationFrame(function () { hint.classList.add('show'); });
    }, 2500);
    document.addEventListener('pointerdown', function (e) {
      if (hint.classList.contains('show') && !hint.contains(e.target)) hideHint();
    }, { passive: true });
    var closeBtn = hint.querySelector('.aven-dock-hint-close');
    if (closeBtn) closeBtn.addEventListener('click', function (e) { e.stopPropagation(); hideHint(); });
    setTimeout(function () { if (hint.classList.contains('show')) hideHint(); }, 18000);
  }
})();
