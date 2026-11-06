// 由旧站平移（2026-11-06）：联系卡片 Lottie 图标 + 微信复制 + 咖啡收款弹窗。
// 素材全部取自本站 public/assets（lottie / pay / dock），与旧站线上文件逐字节一致。
// 注：太空宇航员曾一并平移，同日按用户要求撤下（标记、脚本、样式与 model-viewer 引用均已移除）。
(function () {
  // 微信号点我复制
  document.querySelectorAll('.aven-cc-item[data-copy]').forEach(function (btn) {
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
        navigator.clipboard.writeText(id).then(function () { done(true); }, function () { done(false); });
      } else { done(false); }
    });
  });
  // Lottie：无条件循环播放（联系区图标动画是本区核心表现）
  if (typeof lottie === 'undefined' && typeof bodymovin === 'undefined') return;
  var lottieLib = (typeof lottie !== 'undefined') ? lottie : bodymovin;
  document.querySelectorAll('.aven-cc-anim').forEach(function (el) {
    var path = el.getAttribute('data-path');
    var src = el.getAttribute('data-src'); // twitter 拆分包
    el.classList.add('lottie-loading');
    function onReady(anim) {
      anim.addEventListener('DOMLoaded', function () {
        el.classList.remove('lottie-loading');
        anim.goToAndPlay(0, true);
      });
    }
    if (path) {
      onReady(lottieLib.loadAnimation({ container: el, renderer: 'svg', loop: true, autoplay: true, path: path }));
    } else if (src) {
      var parts = src.split('|');
      Promise.all(parts.map(function (p) { return fetch(p).then(function (r) { return r.text(); }); }))
        .then(function (texts) {
          onReady(lottieLib.loadAnimation({ container: el, renderer: 'svg', loop: true, autoplay: true,
            animationData: JSON.parse(texts.join('')) }));
        }).catch(function () { el.classList.remove('lottie-loading'); });
    }
  });
})();

/* ═══ 请我喝杯咖啡：收款弹窗开关（旧站 v46 平移） ═══ */
(function () {
  var card = document.getElementById('coffeeCard');
  var modal = document.getElementById('coffeeModal');
  if (!card || !modal) return;
  function open() {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    var btn = modal.querySelector('.coffee-close');
    if (btn) btn.focus();
  }
  function close() {
    modal.hidden = true;
    document.body.style.overflow = '';
    card.focus();
  }
  card.addEventListener('click', open);
  modal.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });
})();
