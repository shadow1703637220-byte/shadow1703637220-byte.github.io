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
      '.project-card, .blog-card, .pick-card, .channel, .contact-grid .contact-item'
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

    /* ═══ v9 · 打字小人桌宠化：工作/好奇/开心/说话/发呆/睡觉 ═══ */
    var typing = document.getElementById('charTyping');
    if (typing) {
      var PET_MSGS = [
        '在呢在呢～找我有什么事吗？',
        '代码写累了吧？记得眨眨眼休息一下～',
        '嘿嘿，被你发现了，我其实在摸鱼。',
        '今天的你也很棒哦，继续保持！',
        '再戳我就要罢工啦（才怪）。'
      ];
      var pState = 'working', msgIdx = 0, pTimers = {};
      var inner = typing.querySelector('.char-inner');
      var bubble = typing.querySelector('.pet-bubble');
      function pSet(s) {
        pState = s;
        typing.classList.toggle('working', s === 'working');
        typing.classList.toggle('look', s === 'curious');
        typing.classList.toggle('happy', s === 'happy');
        typing.classList.toggle('talking', s === 'talking');
        typing.classList.toggle('sleeping', s === 'sleeping');
      }
      function pLater(key, fn, ms) {
        if (pTimers[key]) clearTimeout(pTimers[key]);
        pTimers[key] = setTimeout(fn, ms);
      }
      function pClear(key) { if (pTimers[key]) { clearTimeout(pTimers[key]); pTimers[key] = null; } }
      function wakeUp() {
        if (pState === 'sleeping') pSet('working');
        pClear('sleep');
        pLater('sleep', function () {
          if (pState === 'working' || pState === 'curious') {
            if (bubble) bubble.textContent = '';
            pSet('sleeping');
          }
        }, 60000);
      }
      function poke() {
        if (pState === 'happy' || pState === 'talking') return;
        if (reduceMotion) { // 减少动态：直接说话不蹦跳
          pSet('talking');
          if (bubble) bubble.textContent = PET_MSGS[msgIdx++ % PET_MSGS.length];
          pLater('talk', function () { if (bubble) bubble.textContent = ''; pSet('working'); wakeUp(); }, 3000);
          return;
        }
        pClear('talk'); pClear('idle');
        if (bubble) bubble.textContent = '';
        pSet('happy');
        pLater('happy', function () {
          pSet('talking');
          if (bubble) bubble.textContent = PET_MSGS[msgIdx++ % PET_MSGS.length];
          pLater('talk', function () {
            if (bubble) bubble.textContent = '';
            pSet('idle');
            pLater('idle', function () { pSet('working'); wakeUp(); }, 1400);
          }, 3000);
        }, 700);
      }
      typing.addEventListener('mouseenter', function () {
        wakeUp();
        if (pState === 'working') pSet('curious');
      });
      typing.addEventListener('mouseleave', function () {
        if (pState === 'curious') pSet('working');
      });
      /* 点击（区分拖拽）：开心蹦跳 + 说话 */
      var pdx = 0, pdy = 0;
      typing.addEventListener('pointerdown', function (e) { pdx = e.clientX; pdy = e.clientY; wakeUp(); });
      typing.addEventListener('pointerup', function (e) {
        if (Math.hypot(e.clientX - pdx, e.clientY - pdy) < 10) { wakeUp(); poke(); }
      });
      /* 全局活动重置睡觉计时；睡着时任何动静都唤醒 */
      window.addEventListener('pointermove', function () {
        if (pState === 'sleeping') pSet('working');
        pClear('sleep');
        pLater('sleep', function () {
          if (pState === 'working' || pState === 'curious') pSet('sleeping');
        }, 60000);
      }, { passive: true });
      /* ═══ v10 · 瞳孔：闲逛 + 鼠标追踪 ═══ */
      var pupils = typing.querySelectorAll('.face-svg .pupil');
      var eyes = typing.querySelectorAll('.face-svg .eye');
      function setPupils(dx, dy) {
        pupils.forEach(function (p) {
          p.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
        });
      }
      function wanderPupils() {
        if (pState === 'sleeping' || pState === 'curious' || reduceMotion) return;
        setPupils(Math.random() * 12 - 6, Math.random() * 10 - 5);
      }
      setInterval(wanderPupils, 2600);
      wanderPupils();
      function trackEyes(mx, my) {
        var r = typing.getBoundingClientRect();
        if (!r.width) return;
        var sx = r.width / 220, sy = r.height / 200;
        eyes.forEach(function (eye) {
          var ex = r.left + (+eye.getAttribute('data-ex')) * sx;
          var ey = r.top + (+eye.getAttribute('data-ey')) * sy;
          var dx = mx - ex, dy = my - ey, d = Math.hypot(dx, dy) || 1;
          var m = Math.min(d / 45, 1) * 7;
          var p = eye.querySelector('.pupil');
          if (p) p.style.transform = 'translate(' + (dx / d * m).toFixed(1) + 'px,' + (dy / d * m).toFixed(1) + 'px)';
        });
      }
      function nearChar(mx, my, rad) {
        var r = typing.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        return Math.hypot(mx - cx, my - cy) <= rad;
      }
      /* 把眼球追踪接到全局 pointermove（已有睡觉逻辑，追加追踪） */
      window.addEventListener('pointermove', function (e) {
        if (reduceMotion || pState === 'sleeping') return;
        if (pState === 'curious' || nearChar(e.clientX, e.clientY, 340)) trackEyes(e.clientX, e.clientY);
      }, { passive: true });
      pSet('working');
      wakeUp();
    }
    /* 哭泣小人：点击开心笑（用 pointerup 轻点判定，避免拖拽指针捕获吞掉 click） */
    var crying = document.getElementById('charCrying');
    if (crying) {
      var makeHappy = function () {
        if (crying.classList.contains('happy')) return;
        crying.classList.add('happy');
        setTimeout(function () { crying.classList.remove('happy'); }, 2600);
      };
      var cdx = 0, cdy = 0;
      crying.addEventListener('pointerdown', function (e) { cdx = e.clientX; cdy = e.clientY; });
      crying.addEventListener('pointerup', function (e) {
        if (Math.hypot(e.clientX - cdx, e.clientY - cdy) < 10) makeHappy();
      });
      crying.addEventListener('click', makeHappy);
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

    /* Mac 式邻近放大 + v8 流畅抖动 + 悬停音效 */
    if (canHover && !reduceMotion) {
      var scales = icons.map(function () { return 1; });
      var running = false, mx = 0, my = 0, inside = false;

      /* —— 悬停音效：Web Audio 合成的轻"啵"声，无需音频文件 —— */
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
          var f = 540 + i * 45; // 每个图标音高略不同，像上台阶
          o.type = 'sine';
          o.frequency.setValueAtTime(f, t0);
          o.frequency.exponentialRampToValueAtTime(f * 1.6, t0 + 0.07);
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);
          o.connect(g); g.connect(actx.destination);
          o.start(t0); o.stop(t0 + 0.15);
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
        var range = 130;
        if (d > range) return 1;
        var t = 1 - d / range;
        t = t * t * (3 - 2 * t);
        return 1 + 0.5 * t; // ★ 最大放大 50%
      }
      function tick(now) {
        var settled = true;
        icons.forEach(function (el, i) {
          var tg = inside ? targetScale(el) : 1;
          scales[i] += (tg - scales[i]) * 0.2;
          if (Math.abs(tg - scales[i]) > 0.001) settled = false;
          el.style.transform = 'scale(' + scales[i].toFixed(3) + ')';
          /* v8 · 流畅呼吸抖动：放大越多抖得越明显，sine 驱动不卡顿 */
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

/* ═══════════ v8 · 太空宇航员：漫游 / 靠近弹开 / 快速击飞 / 边缘反弹 ═══════════ */
(function(){
  var el=document.getElementById('astro');
  if(!el)return;
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover=window.matchMedia&&matchMedia('(hover: hover)').matches;
  var SIZE=120, M=24, DOCKH=130;
  var vw=function(){return window.innerWidth}, vh=function(){return window.innerHeight};
  var x=vw()*0.7, y=vh()*0.25, tx=x, ty=y;
  var vx=0, vy=0, rot=0, vrot=0, scale=1, op=1;
  var mode='wander', mx=-9999, my=-9999, pmx=-9999, pmy=-9999;
  var mv=document.getElementById('astroModel'), mvOK=false;
  if(mv){
    mv.addEventListener('load',function(){mvOK=true;});
    setTimeout(function(){if(!mvOK)el.style.display='none';},9000);
  }
  function newTarget(){
    tx=M+Math.random()*(vw()-SIZE-M*2);
    ty=M+Math.random()*(vh()-SIZE-DOCKH-M*2);
  }
  function draw(px,py,r,s,o){
    el.style.transform='translate('+px+'px,'+py+'px) rotate('+r+'deg) scale('+s+')';
    el.style.opacity=o;
  }
  function respawn(){
    var edge=Math.floor(Math.random()*4), m=40;
    if(edge===0){x=m; y=M+Math.random()*(vh()-SIZE-DOCKH-M*2);}
    else if(edge===1){x=vw()-SIZE-m; y=M+Math.random()*(vh()-SIZE-DOCKH-M*2);}
    else if(edge===2){x=M+Math.random()*(vw()-SIZE-m*2); y=m;}
    else{x=M+Math.random()*(vw()-SIZE-m*2); y=vh()-SIZE-DOCKH-m;}
    tx=x; ty=y; vx=0; vy=0; rot=0; vrot=0; scale=0.25; op=0;
    mode='back';
  }
  function bounceEdges(){
    var bounced=false;
    if(x<M){x=M; vx=Math.abs(vx)*0.78; bounced=true;}
    else if(x>vw()-SIZE-M){x=vw()-SIZE-M; vx=-Math.abs(vx)*0.78; bounced=true;}
    if(y<M){y=M; vy=Math.abs(vy)*0.78; bounced=true;}
    else if(y>vh()-SIZE-DOCKH-M){y=vh()-SIZE-DOCKH-M; vy=-Math.abs(vy)*0.78; bounced=true;}
    if(bounced){ vrot+=(Math.random()*14+6)*(Math.random()<0.5?-1:1); }
  }
  function loop(t){
    if(document.hidden){requestAnimationFrame(loop);return;}
    if(mode==='wander'){
      var cx=x+SIZE/2, cy=y+SIZE/2;
      /* —— 鼠标速度（每帧位移） —— */
      var mdx=mx-pmx, mdy=my-pmy, mspeed=Math.hypot(mdx,mdy);
      pmx=mx; pmy=my;
      var dx=cx-mx, dy=cy-my, d=Math.hypot(dx,dy);
      if(canHover&&!reduce&&d>1){
        /* ① 靠近弹开：190px 内平滑排斥，还没碰到就躲 */
        var R=190;
        if(d<R){
          var f=1-d/R; f=f*f;
          vx+=(dx/d)*f*2.4; vy+=(dy/d)*f*2.4;
        }
        /* ② 快速击飞：鼠标又快又朝他来，直接拍飞 */
        var toAx=cx-mx, toAy=cy-my;
        if(d<280&&mspeed>26&&(mdx*toAx+mdy*toAy)>0){
          var k=Math.min(mspeed/26,2.6), inv=1/(mspeed||1);
          vx+=mdx*inv*15*k+(toAx/d)*7;
          vy+=mdy*inv*15*k+(toAy/d)*7;
          vrot+=(10+Math.random()*16)*(Math.random()<0.5?-1:1);
        }
      }
      /* ③ 漫游：弱引力漂向随机目标 */
      var gx=tx-x, gy=ty-y;
      if(Math.hypot(gx,gy)<12)newTarget();
      else{vx+=gx*0.00045; vy+=gy*0.00045;}
      /* 阻尼 + 积分 + 边缘反弹 */
      vx*=0.965; vy*=0.965; vrot*=0.97;
      x+=vx; y+=vy; rot+=vrot;
      bounceEdges();
      /* 身体随水平速度倾斜，像真的在飘 */
      var targetRot=Math.max(-28,Math.min(28,vx*2.2));
      rot+=(targetRot-rot)*0.06;
      draw(x, y+Math.sin(t/900)*7, rot, 1, 1);
    }else if(mode==='blown'){
      x+=vx; y+=vy; vx*=0.986; vy*=0.986; rot+=vrot; vrot*=0.992;
      scale=Math.max(0.12,scale*0.991); op=Math.max(0,op-0.014);
      bounceEdges();
      draw(x,y,rot,scale,op);
      if(op<=0){mode='gone'; setTimeout(respawn,1400);}
    }else if(mode==='back'){
      scale+=(1-scale)*0.06; op+=(1-op)*0.06;
      x+=(tx-x)*0.04; y+=(ty-y)*0.04; rot*=0.95;
      draw(x,y,rot,scale,op);
      if(op>0.98&&scale>0.98){mode='wander'; vx=0; vy=0; newTarget();}
    }
    requestAnimationFrame(loop);
  }
  el.addEventListener('click',function(e){
    if(mode==='blown'||mode==='gone'||mode==='back')return;
    var cx=x+SIZE/2, cy=y+SIZE/2;
    var dx=cx-e.clientX, dy=cy-e.clientY, d=Math.hypot(dx,dy)||1;
    vx=dx/d*13; vy=dy/d*13;
    vrot=(12+Math.random()*14)*(Math.random()<0.5?-1:1);
    el.classList.remove('hint');
    mode='blown';
  });
  window.addEventListener('pointermove',function(e){mx=e.clientX; my=e.clientY;},{passive:true});
  window.addEventListener('resize',newTarget);
  if(reduce){
    draw(vw()-SIZE-30, vh()-SIZE-DOCKH-40, 0, 1, 1);
  }else{
    newTarget();
    el.classList.add('hint');
    setTimeout(function(){el.classList.remove('hint');},4500);
    requestAnimationFrame(loop);
  }
})();

/* ═══════════ v8 · 全局背景墙：滚动 crossfade，无分割线 ═══════════ */
(function(){
  var ORDER = ['home','about','projects','blog','picks','contact'];
  var SRC = {
    home:'assets/bg/bg-hero.webp', about:'assets/bg/bg-about.webp',
    projects:'assets/bg/bg-works.webp', blog:'assets/bg/bg-blog.webp',
    picks:'assets/bg/bg-picks.webp', contact:'assets/bg/bg-contact.webp'
  };
  var wall = document.createElement('div');
  wall.id = 'bgwall'; wall.setAttribute('aria-hidden','true');
  var layers = [];
  ORDER.forEach(function(id){
    var d = document.createElement('div');
    d.className = 'bgl'; d.dataset.sec = id;
    layers.push(d); wall.appendChild(d);
  });
  var veil = document.createElement('div');
  veil.className = 'bgveil'; wall.appendChild(veil);
  document.body.insertBefore(wall, document.body.firstChild);
  ORDER.forEach(function(id, i){
    var img = new Image();
    img.onload = function(){ layers[i].style.backgroundImage = 'url("' + SRC[id] + '")'; };
    img.src = SRC[id];
  });
  var secs = ORDER.map(function(id){ return document.getElementById(id); });
  var cur = -1;
  function pick(){
    var vc = window.scrollY + window.innerHeight / 2, best = 0, bd = Infinity;
    secs.forEach(function(s, i){
      if(!s) return;
      var c = s.offsetTop + s.offsetHeight / 2;
      var d = Math.abs(c - vc);
      if(d < bd){ bd = d; best = i; }
    });
    if(best !== cur){
      cur = best;
      layers.forEach(function(l, i){ l.classList.toggle('on', i === cur); });
    }
  }
  var queued = false;
  function onScroll(){
    if(queued) return; queued = true;
    requestAnimationFrame(function(){ queued = false; pick(); });
  }
  window.addEventListener('scroll', onScroll, { passive:true });
  window.addEventListener('resize', onScroll);
  pick();
})();
/* 联系区代码雨 */
(function(){
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sec=document.getElementById('contact');
  if(!sec||reduce)return;
  sec.style.position='relative'; sec.style.overflow='hidden';
  var inner=document.createElement('div'); inner.className='sec-inner';
  while(sec.firstChild)inner.appendChild(sec.firstChild);
  sec.appendChild(inner);
  var cv=document.createElement('canvas'); cv.className='rain-canvas'; cv.setAttribute('aria-hidden','true');
  sec.insertBefore(cv,inner);
  var ctx=cv.getContext('2d'), drops=[], W=0, H=0, running=false;
  function size(){W=cv.width=sec.clientWidth; H=cv.height=sec.clientHeight;}
  function drop(init){return{x:Math.random()*W,y:init?Math.random()*H:-20,l:14+Math.random()*20,v:10+Math.random()*10,o:0.10+Math.random()*0.16};}
  function tick(){
    if(!running)return;
    ctx.clearRect(0,0,W,H);
    ctx.lineWidth=1.3; ctx.lineCap='round';
    for(var i=0;i<drops.length;i++){var d=drops[i];
      ctx.strokeStyle='rgba(105,135,175,'+d.o+')';
      ctx.beginPath(); ctx.moveTo(d.x,d.y); ctx.lineTo(d.x-d.l*0.16,d.y+d.l); ctx.stroke();
      d.y+=d.v; d.x-=d.v*0.16;
      if(d.y>H+24)drops[i]=drop(false);
    }
    requestAnimationFrame(tick);
  }
  function start(){
    if(running)return; size();
    drops=[]; var n=Math.max(40,Math.min(150,Math.floor(W/9)));
    for(var i=0;i<n;i++)drops.push(drop(true));
    running=true; tick();
  }
  function stop(){running=false; if(ctx)ctx.clearRect(0,0,W,H);}
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(es){es.forEach(function(e){e.isIntersecting?start():stop();});},{threshold:0.03}).observe(sec);
  }else{start();}
  window.addEventListener('resize',function(){if(running)size();});
})();

/* ══════════════════════════════════════════
   v12 · 联系区 Lottie 图标 + 微信复制
   ══════════════════════════════════════════ */
(function () {
  // 微信号点我复制
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-copy');
      function done(ok) {
        var label = btn.querySelector('i');
        if (!label) return;
        if (!label.dataset.orig) label.dataset.orig = label.textContent;
        label.textContent = ok ? '已复制 ✓' : '复制失败，长按复制';
        setTimeout(function () { label.textContent = label.dataset.orig; }, 2000);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(id).then(function(){done(true)}, function(){done(false)});
      } else { done(false); }
    });
  });
  // Lottie：无条件循环播放（联系区图标动画是本区核心表现）
  if (typeof lottie === 'undefined') return;
  document.querySelectorAll('.contact-anim[data-src]').forEach(function (el) {
    var src = el.getAttribute('data-src');
    function loadData() {
      if (src.indexOf('|') > -1) {
        var parts = src.split('|');
        return Promise.all(parts.map(function (p) { return fetch(p).then(function (r) { return r.text(); }); }))
          .then(function (texts) { return JSON.parse(texts.join('')); });
      }
      return fetch(src).then(function (r) { return r.json(); });
    }
    loadData().then(function (data) {
      el.classList.add('lottie-loading');
      var anim = lottie.loadAnimation({ container: el, renderer: 'svg', loop: true, autoplay: true, animationData: data });
      anim.addEventListener('DOMLoaded', function () {
        el.classList.remove('lottie-loading');
        anim.play(); // 双保险：确保播放
      });
    }).catch(function(){ el.classList.remove('lottie-loading'); });
  });
})();
