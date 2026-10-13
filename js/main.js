/* ══════════════════════════════════════════
   Aven溺心海 · 个人主页交互逻辑
   - 动态星空背景（手机端自动降级为静态）
   - 卡片滚动显现动画
   - 导航滚动效果 / 页脚年份
   ══════════════════════════════════════════ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var smallScreen = window.matchMedia('(max-width: 768px)').matches;

  /* ---------- 1. 星空背景 ---------- */
  var canvas = document.getElementById('stars');
  var hero = document.getElementById('home');

  function rand(a, b) { return a + Math.random() * (b - a); }

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

  /* ---------- 2. 卡片滚动显现 ---------- */
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

  /* ---------- 3. 导航滚动效果 ---------- */
  var nav = document.getElementById('nav');
  window.addEventListener('scroll', function () {
    if (window.scrollY > 30) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }, { passive: true });

  /* ---------- 4. 页脚年份 ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
