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
