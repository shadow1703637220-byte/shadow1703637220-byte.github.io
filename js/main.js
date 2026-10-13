/* ══════════════════════════════════════════
   Aven溺心海 · 个人主页交互逻辑（致敬版 v2）
   - 动态星空背景（手机端自动降级为静态）
   - 滚动叙事：进度条 + 首屏视差
   - Dock 式项目卡片放大（mac 程序坞手感）
   - 卡片滚动显现 / 导航效果 / 页脚年份
   性能原则：只用 transform 和 opacity（GPU 合成），
   不触发布局重排，保证 60fps。
   ══════════════════════════════════════════ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var smallScreen = window.matchMedia('(max-width: 768px)').matches;
  var canHover = window.matchMedia('(hover: hover)').matches;

  function rand(a, b) { return a + Math.random() * (b - a); }

  /* ---------- 1. 星空背景 ---------- */
  var canvas = document.getElementById('stars');
  var hero = document.getElementById('home');
  var heroInner = document.querySelector('.hero-inner');

  function sizeCanvas() {
    canvas.width = hero.offsetWidth;
    canvas.height = hero.offsetHeight;
  }

  var stars = [];
  function initStars() {
    stars = [];
    // ★ 在这里改：星星数量（手机少、电脑多）
    var count = smallScreen ? 70 : 170;
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: rand(0.4, 1.7),
        phase: rand(0, Math.PI * 2),
        speed: rand(0.008, 0.03),
        vx: rand(-0.06, 0.06)
      });
    }
  }

  function drawStars(t) {
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var tw = 0.4 + 0.6 * Math.abs(Math.sin(s.phase + t * s.speed));
      ctx.globalAlpha = tw;
      ctx.fillStyle = '#cfe9ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      s.x += s.vx;
      if (s.x < 0) s.x = canvas.width;
      if (s.x > canvas.width) s.x = 0;
    }
    ctx.globalAlpha = 1;
  }

  // 流星（仅电脑端）
  var meteors = [];
  function maybeSpawnMeteor() {
    if (smallScreen || reduceMotion) return;
    if (Math.random() < 0.006 && meteors.length < 2) {
      meteors.push({ x: rand(0, canvas.width), y: rand(0, canvas.height * 0.4),
                     vx: rand(-7, -4), vy: rand(2.5, 4), life: 1 });
    }
  }
  function drawMeteors() {
    var ctx = canvas.getContext('2d');
    for (var i = meteors.length - 1; i >= 0; i--) {
      var m = meteors[i];
      m.x += m.vx; m.y += m.vy; m.life -= 0.02;
      if (m.life <= 0) { meteors.splice(i, 1); continue; }
      var grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 12, m.y - m.vy * 12);
      grad.addColorStop(0, 'rgba(255,255,255,' + (0.9 * m.life) + ')');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - m.vx * 12, m.y - m.vy * 12);
      ctx.stroke();
    }
  }

  if (canvas && hero) {
    sizeCanvas();
    initStars();
    if (reduceMotion || smallScreen) {
      drawStars(1); // 手机 / 减少动态：只画一帧静态星空
    } else {
      (function loop(t) {
        drawStars(t || 0);
        maybeSpawnMeteor();
        drawMeteors();
        requestAnimationFrame(loop);
      })();
    }
    window.addEventListener('resize', function () {
      sizeCanvas();
      initStars();
      if (reduceMotion || smallScreen) drawStars(1);
    });
  }

  /* ---------- 2. 滚动叙事：进度条 + 首屏视差 ---------- */
  var progress = document.getElementById('progress');
  var scrollTicking = false;
  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      // 顶部进度条（scaleX，GPU 友好）
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
      // 首屏视差：文字比背景走得快，营造"下潜"感
      if (!reduceMotion && heroInner && canvas && y < window.innerHeight * 1.2) {
        heroInner.style.transform = 'translateY(' + (y * 0.28) + 'px)';
        heroInner.style.opacity = Math.max(0, 1 - y / (window.innerHeight * 0.85));
        canvas.style.transform = 'translateY(' + (y * 0.12) + 'px)';
      }
      scrollTicking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- 3. Dock 式项目卡片放大 ---------- */
  // 像 mac 程序坞：鼠标靠近的卡片平滑放大，邻居跟着起伏
  // 只用 transform，无重排；阻尼跟随带来果冻般的顺滑
  var grid = document.querySelector('#projects .grid');
  if (grid && canHover && !reduceMotion && !smallScreen) {
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
      // 接管 transform：去掉 CSS 的 transform 过渡，避免和逐帧驱动打架
      cards.forEach(function (c) { c.style.transitionProperty = 'border-color, box-shadow'; });
    });
    grid.addEventListener('mousemove', function (e) {
      px = e.clientX; py = e.clientY; inside = true; kick();
    });
    grid.addEventListener('mouseleave', function () { inside = false; kick(); });
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
