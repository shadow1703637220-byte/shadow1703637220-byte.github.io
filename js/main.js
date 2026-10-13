/* ══════════════════════════════════════════
   Aven溺心海 · 个人主页交互逻辑（浅色 v3）
   - 滚动叙事：进度条 + 首屏视差
   - Dock 式项目卡片放大（mac 程序坞手感）
   - 项目悬停预览弹窗（跟随鼠标）
   - 卡片滚动显现 / 导航效果 / 页脚年份
   性能原则：只用 transform 和 opacity（GPU 合成），
   不触发布局重排，保证 60fps。
   ══════════════════════════════════════════ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var smallScreen = window.matchMedia('(max-width: 768px)').matches;
  var canHover = window.matchMedia('(hover: hover)').matches;

  var heroInner = document.querySelector('.hero-inner');

  /* ---------- 1. 滚动叙事：进度条 + 首屏视差 ---------- */
  var progress = document.getElementById('progress');
  var scrollTicking = false;
  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
      if (!reduceMotion && heroInner && y < window.innerHeight * 1.2) {
        heroInner.style.transform = 'translateY(' + (y * 0.28) + 'px)';
        heroInner.style.opacity = Math.max(0, 1 - y / (window.innerHeight * 0.85));
      }
      scrollTicking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var grid = document.querySelector('#projects .grid');
  var fxEnabled = grid && canHover && !reduceMotion && !smallScreen;

  /* ---------- 2. Dock 式项目卡片放大 ---------- */
  // 像 mac 程序坞：鼠标靠近的卡片平滑放大，邻居跟着起伏
  if (fxEnabled) {
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.project-card'));
    var scales = cards.map(function () { return 1; });
    var running = false, px = 0, py = 0, inside = false;

    cards.forEach(function (c) { c.style.willChange = 'transform'; });

    function targetScale(el) {
      var r = el.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var d = Math.hypot(px - cx, py - cy);
      var range = Math.max(r.width, r.height) * 1.6;
      if (d > range) return 1;
      var t = 1 - d / range;
      t = t * t * (3 - 2 * t); // smoothstep，平滑衰减
      // ★ 在这里改：0.07 = 最大放大 7%，越大越夸张
      return 1 + 0.07 * t;
    }

    function tick() {
      var settled = true;
      cards.forEach(function (el, i) {
        if (!el.classList.contains('visible')) return; // 入场动画没播完就不碰它
        var target = inside ? targetScale(el) : 1;
        scales[i] += (target - scales[i]) * 0.18; // 阻尼跟随
        if (Math.abs(target - scales[i]) > 0.0005) settled = false;
        el.style.transform = 'translateY(-4px) scale(' + scales[i].toFixed(4) + ')';
      });
      if (!settled || inside) {
        requestAnimationFrame(tick);
      } else {
        running = false;
        cards.forEach(function (el, i) {
          el.style.transform = '';
          el.style.transitionProperty = '';
          scales[i] = 1;
        });
      }
    }
    function kick() { if (!running) { running = true; requestAnimationFrame(tick); } }

    grid.addEventListener('mouseenter', function () {
      cards.forEach(function (c) { c.style.transitionProperty = 'border-color, box-shadow'; });
    });
    grid.addEventListener('mousemove', function (e) {
      px = e.clientX; py = e.clientY; inside = true; kick();
    });
    grid.addEventListener('mouseleave', function () { inside = false; kick(); });
  }

  /* ---------- 3. 悬停预览弹窗（跟随鼠标） ---------- */
  // 像 elliothu.me：悬停时，一个"浏览器小窗"预览跟随鼠标出现
  // ★ 在这里改：想让哪些元素有悬停预览，就加到 previewTargets 的选择器里
  var preview = document.getElementById('preview');
  if (preview && fxEnabled) {
    var previewShot = document.getElementById('previewShot');
    var previewUrl = document.getElementById('previewUrl');
    var pvx = 0, pvy = 0, ptx = 0, pty = 0, pRunning = false, pOn = false;
    var PW = 300, PH = 240; // 弹窗大致尺寸，用于边缘防溢出

    var previewTargets = document.querySelectorAll(
      '.project-card, .blog-card, .pick-card, .channel, .contact-btns .btn'
    );

    function placeAt(x, y) {
      // 跟随在光标右下方，边缘处自动收进屏幕内
      ptx = Math.min(x + 28, window.innerWidth - PW - 12);
      pty = Math.min(y + 28, window.innerHeight - PH - 12);
      ptx = Math.max(12, ptx); pty = Math.max(12, pty);
    }

    function fillPreview(el) {
      // 1) 有真实截图（取消注释 img.preview-src 后）→ 显示截图
      var img = el.querySelector('img.preview-src');
      if (img && img.getAttribute('src')) {
        previewShot.className = 'preview-shot';
        previewShot.innerHTML = '';
        var cl = document.createElement('img');
        cl.src = img.getAttribute('src');
        cl.alt = img.getAttribute('alt') || '预览图';
        previewShot.appendChild(cl);
      } else if (el.classList.contains('blog-card')) {
        // 2) 博客卡片 → 迷你文章预览（标题 + 摘要）
        var t = el.querySelector('h3'), d = el.querySelector('p');
        previewShot.className = 'preview-shot preview-doc';
        previewShot.innerHTML = '';
        var h = document.createElement('h4');
        h.textContent = t ? t.textContent : '';
        var p = document.createElement('p');
        p.textContent = d ? d.textContent : '';
        var bar = document.createElement('div');
        bar.className = 'doc-bar';
        var bar2 = document.createElement('div');
        bar2.className = 'doc-bar short';
        previewShot.appendChild(h);
        previewShot.appendChild(p);
        previewShot.appendChild(bar);
        previewShot.appendChild(bar2);
      } else {
        // 3) 否则显示 emoji / 图标占位（频道按钮用 data-shot 指定图标）
        var cover = el.querySelector('.project-cover');
        var pemoji = el.querySelector('.pick-emoji');
        previewShot.className = 'preview-shot';
        if (cover) {
          var coverCls = '';
          cover.classList.forEach(function (c) { if (c.indexOf('cover-') === 0) coverCls = c; });
          previewShot.className = 'preview-shot ' + coverCls;
          previewShot.textContent = cover.textContent;
        } else if (pemoji) {
          previewShot.textContent = pemoji.textContent;
        } else {
          previewShot.textContent = el.getAttribute('data-shot') || '🔗';
        }
      }
      // 地址栏：a 标签用自己的 href，卡片用里面的链接
      var href = el.getAttribute('href');
      if (!href) {
        var link = el.querySelector('.card-link, .btn');
        href = link ? link.getAttribute('href') : null;
      }
      var label = '链接待补充';
      if (href && href !== '#') {
        label = href.replace(/^https?:\/\//, '').replace(/^mailto:/, '');
      }
      previewUrl.textContent = label;
    }

    function pTick() {
      pvx += (ptx - pvx) * 0.22;
      pvy += (pty - pvy) * 0.22;
      preview.style.transform = 'translate3d(' + pvx.toFixed(1) + 'px,' + pvy.toFixed(1) + 'px,0)';
      if (pOn || Math.abs(ptx - pvx) > 0.5 || Math.abs(pty - pvy) > 0.5) {
        requestAnimationFrame(pTick);
      } else {
        pRunning = false;
      }
    }
    function pKick() { if (!pRunning) { pRunning = true; requestAnimationFrame(pTick); } }

    document.addEventListener('mousemove', function (e) {
      if (!pOn) return;
      placeAt(e.clientX, e.clientY);
      pKick();
    });

    previewTargets.forEach(function (el) {
      el.addEventListener('mouseenter', function (e) {
        fillPreview(el);
        placeAt(e.clientX, e.clientY);
        pvx = ptx; pvy = pty; // 从当前位置弹出，避免闪跳
        pOn = true;
        preview.classList.add('on');
        pKick();
      });
      el.addEventListener('mouseleave', function () {
        pOn = false;
        preview.classList.remove('on');
        pKick();
      });
    });
  }

  /* ---------- 4. 卡片滚动显现 ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ---------- 5. 导航滚动效果 ---------- */
  var nav = document.getElementById('nav');
  window.addEventListener('scroll', function () {
    if (window.scrollY > 30) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }, { passive: true });

  /* ---------- 6. 页脚年份 ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();

/* ══════════════════════════════════════════
   v5 · 首屏互动场景 + macOS 程序坞 + 风车
   ══════════════════════════════════════════ */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia('(hover: hover)').matches;
  var hero = document.getElementById('home');

  /* ---------- 7. 首屏互动场景 ---------- */
  var scene = document.getElementById('scene');
  if (scene && hero) {
    var sceneInner = document.getElementById('sceneInner');
    var draggables = Array.prototype.slice.call(scene.querySelectorAll('.drag'));
    var items = draggables.map(function (el) {
      return { el: el, x: 0, y: 0, isChar: el.classList.contains('char') };
    });
    function apply(it) {
      // 卡通人物用 top:50% 定位，translate 里补 -50% 回来；字母直接位移
      it.el.style.transform = it.isChar
        ? 'translate(' + it.x + 'px, calc(-50% + ' + it.y + 'px))'
        : 'translate(' + it.x + 'px, ' + it.y + 'px)';
    }

    /* 入场：从四周随机方向向中间聚拢 */
    function entrance() {
      items.forEach(function (it, i) {
        var ang = (i / items.length) * Math.PI * 2 + Math.random() * 0.8;
        var dist = Math.max(window.innerWidth, window.innerHeight) * 0.75;
        it.x = Math.cos(ang) * dist;
        it.y = Math.sin(ang) * dist;
        it.el.style.opacity = '0';
        apply(it);
      });
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          items.forEach(function (it, i) {
            it.el.style.transition = 'transform 1.35s cubic-bezier(.22,.9,.24,1), opacity 0.9s ease';
            it.el.style.transitionDelay = (i * 0.07) + 's';
            it.x = 0; it.y = 0;
            it.el.style.opacity = '1';
            apply(it);
          });
          setTimeout(function () {
            items.forEach(function (it) { it.el.style.transition = ''; it.el.style.transitionDelay = ''; });
          }, 2400);
        });
      });
    }
    if (!reduceMotion) entrance();

    /* 拖拽（只在桌面 hover 设备启用，保证手机滑动不受影响） */
    if (canHover && !reduceMotion) {
      var active = null, sx = 0, sy = 0, ox = 0, oy = 0;
      items.forEach(function (it) {
        it.el.style.touchAction = 'none';
        it.el.addEventListener('pointerdown', function (e) {
          active = it; sx = e.clientX; sy = e.clientY; ox = it.x; oy = it.y;
          try { it.el.setPointerCapture(e.pointerId); } catch (err) {}
          it.el.classList.add('grabbing');
        });
      });
      window.addEventListener('pointermove', function (e) {
        if (!active) return;
        active.x = ox + (e.clientX - sx);
        active.y = oy + (e.clientY - sy);
        apply(active);
      });
      var endDrag = function () {
        if (active) active.el.classList.remove('grabbing');
        active = null;
      };
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
    }

    /* 名字字母：双击任意字 → 全部沿随机路线飞回重组 */
    var letters = items.filter(function (it) { return it.el.classList.contains('letter'); });
    function flyHome() {
      letters.forEach(function (it) {
        var sx = it.x, sy = it.y;
        if (!sx && !sy) return;
        var mx = sx / 2 + (Math.random() - 0.5) * 320; // 随机控制点
        var my = sy / 2 + (Math.random() - 0.5) * 320;
        var t0 = performance.now(), dur = 850 + Math.random() * 450;
        function frame(t) {
          var p = Math.min((t - t0) / dur, 1);
          var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
          var q = 1 - e;
          it.x = q * q * sx + 2 * q * e * mx;
          it.y = q * q * sy + 2 * q * e * my;
          apply(it);
          if (p < 1) requestAnimationFrame(frame);
          else { it.x = 0; it.y = 0; apply(it); }
        }
        requestAnimationFrame(frame);
      });
    }
    var lastTap = 0;
    letters.forEach(function (it) {
      it.el.addEventListener('dblclick', function (e) { e.preventDefault(); flyHome(); });
      it.el.addEventListener('pointerup', function () { // 触屏双击复位
        var now = Date.now();
        if (now - lastTap < 350) flyHome();
        lastTap = now;
      });
    });

    /* 打字小人：悬停抬头看你 + 飘问号（触屏用点击） */
    var typing = document.getElementById('charTyping');
    if (typing) {
      typing.addEventListener('mouseenter', function () { typing.classList.add('look'); });
      typing.addEventListener('mouseleave', function () { typing.classList.remove('look'); });
      typing.addEventListener('click', function () {
        typing.classList.add('look');
        setTimeout(function () { typing.classList.remove('look'); }, 2200);
      });
    }
    /* 哭泣小人：点击开心笑 */
    var crying = document.getElementById('charCrying');
    if (crying) {
      crying.addEventListener('click', function () {
        if (crying.classList.contains('happy')) return;
        crying.classList.add('happy');
        setTimeout(function () { crying.classList.remove('happy'); }, 1900);
      });
    }

    /* 滚动：所有元素一起向中间聚拢、缩小、渐隐 */
    var heroH = hero.offsetHeight || window.innerHeight;
    window.addEventListener('scroll', function () {
      if (reduceMotion || !sceneInner) return;
      var p = Math.max(0, Math.min(window.scrollY / heroH, 1));
      sceneInner.style.transform = 'translateY(' + (p * 90).toFixed(1) + 'px) scale(' + (1 - 0.45 * p).toFixed(3) + ')';
      sceneInner.style.opacity = Math.max(0, 1 - p * 1.15).toFixed(3);
    }, { passive: true });
  }

  /* ---------- 8. macOS 程序坞 ---------- */
  var dockEl = document.getElementById('dock');
  if (dockEl) {
    var icons = Array.prototype.slice.call(dockEl.querySelectorAll('.dock-icon'));

    /* Mac 式邻近放大 */
    if (canHover && !reduceMotion) {
      var scales = icons.map(function () { return 1; });
      var running = false, mx = 0, my = 0, inside = false;
      function targetScale(el) {
        var r = el.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var d = Math.hypot(mx - cx, my - cy);
        var range = 140;
        if (d > range) return 1;
        var t = 1 - d / range;
        t = t * t * (3 - 2 * t);
        return 1 + 0.55 * t; // ★ 最大放大 55%
      }
      function tick() {
        var settled = true;
        icons.forEach(function (el, i) {
          var tg = inside ? targetScale(el) : 1;
          scales[i] += (tg - scales[i]) * 0.2;
          if (Math.abs(tg - scales[i]) > 0.001) settled = false;
          el.style.transform = 'scale(' + scales[i].toFixed(3) + ')';
        });
        if (!settled || inside) requestAnimationFrame(tick);
        else running = false;
      }
      function kick() { if (!running) { running = true; requestAnimationFrame(tick); } }
      dockEl.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; inside = true; kick(); });
      dockEl.addEventListener('mouseleave', function () { inside = false; kick(); });
    }

    /* 点击弹跳（Mac 程序坞手感） */
    icons.forEach(function (el) {
      el.addEventListener('click', function () {
        if (reduceMotion) return;
        var img = el.querySelector('img');
        if (!img) return;
        el.classList.remove('bounce');
        void el.offsetWidth;
        el.classList.add('bounce');
      });
    });

    /* 信息面板：Genie 神奇效果抽出 / 点击空白收回 */
    var infoBtn = document.getElementById('dockInfo');
    var panel = document.getElementById('infoPanel');
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

    /* 音乐：Spotify 官方嵌入，点击播放/再点暂停，常驻播放 */
    var musicBtn = document.getElementById('dockMusic');
    var miniPlayer = document.getElementById('miniPlayer');
    var spController = null, spPlaying = false;
    window.onSpotifyIframeApiReady = function (IFrameAPI) {
      var mount = document.getElementById('spotifyEmbed');
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
      if (!spController && document.getElementById('spotifyEmbed') && !document.getElementById('spotifyEmbed').firstChild) {
        document.getElementById('spotifyEmbed').innerHTML =
          '<iframe src="https://open.spotify.com/embed/track/3gNdY7cdQckKDto9BP2dDW" width="100%" height="152" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="Spotify 播放器"></iframe>';
      }
    }, 9000);
    if (musicBtn && miniPlayer) {
      musicBtn.addEventListener('click', function () {
        if (miniPlayer.hidden) {
          miniPlayer.hidden = false;
          requestAnimationFrame(function () { miniPlayer.classList.add('open'); });
          if (spController) spController.play();
        } else if (spController) {
          spPlaying ? spController.pause() : spController.play();
        }
      });
      var miniClose = document.getElementById('miniClose');
      if (miniClose) miniClose.addEventListener('click', function (e) {
        e.stopPropagation();
        if (spController && spPlaying) spController.pause();
        miniPlayer.classList.remove('open');
        setTimeout(function () { miniPlayer.hidden = true; }, 320);
      });
    }
  }

  /* ---------- 9. 小风车随滚动转动 ---------- */
  var blades = document.getElementById('wmBlades');
  if (blades) {
    window.addEventListener('scroll', function () {
      blades.style.transform = 'rotate(' + ((window.scrollY * 0.35) % 360).toFixed(1) + 'deg)';
    }, { passive: true });
  }
})();
