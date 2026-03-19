// Picker Script - Sayfaya enjekte edilir, kullanıcının eleman seçmesini sağlar

(function () {
  'use strict';

  if (document.getElementById('__adpicker_overlay')) return;

  // ── UI Elemanları ─────────────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = '__adpicker_overlay';
  overlay.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
    'z-index:2147483646', 'cursor:crosshair', 'pointer-events:none',
  ].join(';');

  const highlight = document.createElement('div');
  highlight.id = '__adpicker_highlight';
  highlight.style.cssText = [
    'position:fixed', 'pointer-events:none', 'z-index:2147483645',
    'outline:3px solid #4ecdc4', 'outline-offset:2px',
    'background:rgba(78,205,196,0.12)', 'transition:all 0.1s ease',
    'border-radius:3px', 'box-sizing:border-box',
  ].join(';');

  const tooltip = document.createElement('div');
  tooltip.id = '__adpicker_tooltip';
  tooltip.style.cssText = [
    'position:fixed', 'z-index:2147483647', 'background:#0f0f13',
    'color:#4ecdc4', 'font:bold 11px/1.4 monospace', 'padding:5px 9px',
    'border-radius:6px', 'border:1px solid #4ecdc4', 'pointer-events:none',
    'max-width:320px', 'word-break:break-all', 'white-space:normal',
    'box-shadow:0 4px 16px rgba(0,0,0,0.6)',
  ].join(';');

  const banner = document.createElement('div');
  banner.id = '__adpicker_banner';
  banner.innerHTML = `
    <span style="font-size:13px;font-weight:600;color:#fff">Reklam Seç</span>
    <span style="font-size:11px;color:#aaa;margin-left:8px">Engellemek istediğiniz reklamı tıklayın</span>
    <button id="__adpicker_cancel" style="margin-left:auto;background:#333;border:1px solid #555;color:#ccc;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:11px">İptal</button>
  `;
  banner.style.cssText = [
    'position:fixed', 'top:12px', 'left:50%', 'transform:translateX(-50%)',
    'z-index:2147483647', 'background:#1a1a2e', 'border:1px solid #4ecdc4',
    'padding:10px 16px', 'border-radius:10px', 'display:flex',
    'align-items:center', 'gap:6px', 'pointer-events:all',
    'box-shadow:0 4px 24px rgba(78,205,196,0.25)',
    'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
    'min-width:340px',
  ].join(';');

  document.body.appendChild(overlay);
  document.body.appendChild(highlight);
  document.body.appendChild(tooltip);
  document.body.appendChild(banner);

  // ── CSS Seçici Üreteci ────────────────────────────────────────────────────
  function generateSelector(el) {
    const PICKER_IDS = ['__adpicker_overlay', '__adpicker_highlight', '__adpicker_tooltip', '__adpicker_banner'];

    // ID varsa
    if (el.id && !PICKER_IDS.includes(el.id)) {
      return '#' + CSS.escape(el.id);
    }

    const parts = [];
    let current = el;

    for (let depth = 0; depth < 4 && current && current !== document.body; depth++) {
      if (current.id && !PICKER_IDS.includes(current.id)) {
        parts.unshift('#' + CSS.escape(current.id));
        break;
      }

      let part = current.tagName.toLowerCase();

      // Anlamlı sınıfları ekle (utility/state sınıfları dışında)
      const badClass = /^(active|show|hide|open|closed|selected|visible|hidden|hover|focus|first|last|even|odd|d-|col-|row-|mt-|mb-|ml-|mr-|p-|pt-|pb-|pl-|pr-|m-|w-|h-|text-|bg-|border-|flex-|items-|justify-)/.test.bind(/^(active|show|hide|open|closed|selected|visible|hidden|hover|focus|first|last|even|odd)/);
      const meaningful = Array.from(current.classList).filter(c =>
        c.length > 2 && !badClass(c) && !/^(js-|is-|has-)/.test(c)
      ).slice(0, 3);

      if (meaningful.length) {
        part += '.' + meaningful.map(c => CSS.escape(c)).join('.');
      } else {
        // nth-child kullan
        const parent = current.parentElement;
        if (parent) {
          const idx = Array.from(parent.children).indexOf(current) + 1;
          part += `:nth-child(${idx})`;
        }
      }

      parts.unshift(part);
      current = current.parentElement;
    }

    const selector = parts.join(' > ');

    // Seçicinin var olmayan bir şeyi hedeflemediğini doğrula
    try {
      if (document.querySelector(selector)) return selector;
    } catch (_) {}

    // Fallback: sınıf tabanlı basit seçici
    if (el.classList.length > 0) {
      const cls = Array.from(el.classList)[0];
      const s = el.tagName.toLowerCase() + '.' + CSS.escape(cls);
      try { if (document.querySelector(s)) return s; } catch (_) {}
    }

    return el.tagName.toLowerCase();
  }

  // ── Fare hareketini izle ──────────────────────────────────────────────────
  const PICKER_NODES = new Set(['__adpicker_overlay', '__adpicker_highlight', '__adpicker_tooltip', '__adpicker_banner', '__adpicker_cancel']);

  let currentTarget = null;

  function getElementAt(x, y) {
    overlay.style.pointerEvents = 'none';
    highlight.style.pointerEvents = 'none';
    tooltip.style.pointerEvents = 'none';
    banner.style.pointerEvents = 'none';
    const el = document.elementFromPoint(x, y);
    overlay.style.pointerEvents = 'none';
    return el;
  }

  document.addEventListener('mousemove', (e) => {
    const el = getElementAt(e.clientX, e.clientY);
    if (!el || PICKER_NODES.has(el.id) || el.closest('#__adpicker_banner')) return;

    currentTarget = el;
    const rect = el.getBoundingClientRect();

    highlight.style.top = rect.top + 'px';
    highlight.style.left = rect.left + 'px';
    highlight.style.width = rect.width + 'px';
    highlight.style.height = rect.height + 'px';
    highlight.style.display = 'block';

    const sel = generateSelector(el);
    tooltip.textContent = sel;

    // Tooltip pozisyonu
    let tx = e.clientX + 12, ty = e.clientY + 12;
    if (tx + 330 > window.innerWidth) tx = e.clientX - 340;
    if (ty + 60 > window.innerHeight) ty = e.clientY - 50;
    tooltip.style.left = tx + 'px';
    tooltip.style.top = ty + 'px';
    tooltip.style.display = 'block';
  }, true);

  // ── Tıklama - elemanı seç ─────────────────────────────────────────────────
  document.addEventListener('click', (e) => {
    const el = getElementAt(e.clientX, e.clientY);
    if (!el || PICKER_NODES.has(el.id) || el.closest('#__adpicker_banner')) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const selector = generateSelector(el);
    const hostname = location.hostname;

    // Elemanı hemen gizle
    el.style.setProperty('display', 'none', 'important');
    el.style.setProperty('visibility', 'hidden', 'important');
    el.setAttribute('data-adblocker-hidden', 'true');

    // Seçiciyi kaydet
    chrome.runtime.sendMessage({
      action: 'elementPicked',
      selector,
      hostname,
    }, () => {
      cleanup();
      showConfirmToast(selector);
    });
  }, true);

  // ── İptal ─────────────────────────────────────────────────────────────────
  document.getElementById('__adpicker_cancel').addEventListener('click', (e) => {
    e.stopPropagation();
    cleanup();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cleanup();
  }, true);

  function cleanup() {
    overlay.remove();
    highlight.remove();
    tooltip.remove();
    banner.remove();
  }

  // ── Onay tostu ────────────────────────────────────────────────────────────
  function showConfirmToast(selector) {
    const toast = document.createElement('div');
    toast.style.cssText = [
      'position:fixed', 'bottom:24px', 'right:24px', 'z-index:2147483647',
      'background:#1a1a2e', 'color:#4ecdc4', 'border:1px solid #4ecdc4',
      'padding:12px 18px', 'border-radius:10px', 'font:13px/1.4 sans-serif',
      'box-shadow:0 4px 20px rgba(0,0,0,0.5)', 'max-width:300px',
    ].join(';');
    toast.innerHTML = `<b>Engellendi!</b><br><span style="color:#aaa;font-size:11px">${selector}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

})();
