// Content Script - Kozmetik Filtreleme + YouTube Reklam Atlama + Özel Seçiciler

(function () {
  'use strict';

  if (window.__adBlockerLoaded) return;
  window.__adBlockerLoaded = true;

  // ── Genel reklam seçicileri ──────────────────────────────────────────────
  const AD_SELECTORS = [
    // Google Ads
    'ins.adsbygoogle', '[data-ad-client]', '[data-adunit]',
    '.GoogleActiveViewClass', '#google_ads_frame',
    'iframe[src*="googleads"]', 'iframe[src*="googlesyndication"]',
    'iframe[src*="doubleclick"]', 'iframe[src*="2mdn.net"]',

    // Yaygın reklam sınıf/id kalıpları
    '[class*="ad-banner"]', '[class*="ad-container"]', '[class*="ad-wrapper"]',
    '[class*="ad-block"]', '[class*="adsbygoogle"]', '[class*="advertisement"]',
    '[class*="advertise"]', '[id*="ad-banner"]', '[id*="ad-container"]',
    '[id*="google-ad"]', '[id*="banner-ad"]',

    // Taboola / Outbrain
    'div[id*="taboola"]', 'div[class*="taboola"]',
    'div[id*="outbrain"]', 'div[class*="outbrain"]',
    '.trc_rbox_container', '#taboola-below-article',

    // Banner boyutları
    '.banner-ads', '.banner-advertisement', '.top-ads',
    '.sidebar-ad', '#sidebar-ad', '.leaderboard-ad', '.mrec-ad',

    // Pop-up / overlay
    '.popup-ad', '.overlay-ad', '[class*="interstitial"]',

    // Sponsorlu içerik
    '[data-sponsored]', '[aria-label*="Sponsored"]', '[aria-label*="Reklam"]',
    '.sponsored-content', '.native-ad',

    // Video reklam wrapper'ları
    '.video-ad-container', '[class*="preroll"]',
    'iframe[src*="ads."]', 'iframe[src*="ad."]',
  ];

  // ── YouTube'a özgü seçiciler ─────────────────────────────────────────────
  const YOUTUBE_SELECTORS = [
    '#masthead-ad',
    '.ytd-display-ad-renderer',
    'ytd-display-ad-renderer',
    '.ytd-promoted-video-renderer',
    'ytd-promoted-video-renderer',
    'ytd-promoted-sparkles-web-renderer',
    '.ytd-companion-slot-renderer',
    'ytd-companion-slot-renderer',
    'ytd-action-companion-ad-renderer',
    '.ytp-ad-overlay-container',
    '.ytp-ad-text-overlay',
    '.ytp-ce-element',
    '.ytp-suggested-action',
    '#player-ads',
    '.video-ads',
  ];

  // ── İzleyici pixel seçicileri ────────────────────────────────────────────
  const TRACKER_SELECTORS = [
    'img[src*="track."]', 'img[src*="pixel."]',
    'img[width="1"][height="1"]', 'img[width="0"][height="0"]',
  ];

  // ── Çerez bildirimleri ───────────────────────────────────────────────────
  const COOKIE_SELECTORS = [
    '#cookie-banner', '#cookieBanner', '.cookie-banner', '.cookie-consent',
    '.cookie-notice', '.cookie-bar', '#cookie-notice', '#gdpr-banner',
    '.gdpr-consent', '[id*="cookie-consent"]', '[class*="cookie-consent"]',
    '[id*="cookie-notice"]', '[class*="cookie-notice"]', '.cc-window',
    '#CybotCookiebotDialog', '.cookieConsent', '#onetrust-banner-sdk',
    '.sp_message_container',
  ];

  let settings = { enabled: true, blockAds: true, blockTrackers: true, blockCookieNotices: false };
  let customSelectors = [];
  let observer = null;
  let ytAdInterval = null;
  const isYouTube = location.hostname.includes('youtube.com');

  // ── Öğe gizleme ──────────────────────────────────────────────────────────
  function hideElement(el) {
    if (!el || el.getAttribute('data-adblocker-hidden')) return;
    el.style.setProperty('display', 'none', 'important');
    el.style.setProperty('visibility', 'hidden', 'important');
    el.style.setProperty('pointer-events', 'none', 'important');
    el.setAttribute('data-adblocker-hidden', 'true');
  }

  function applySelectors(selectors) {
    selectors.forEach(sel => {
      try { document.querySelectorAll(sel).forEach(hideElement); } catch (_) {}
    });
  }

  // ── Boyuta göre iframe tespiti ────────────────────────────────────────────
  function detectAdsBySize() {
    const adSizes = [
      [728, 90], [300, 250], [336, 280], [160, 600],
      [300, 600], [970, 90], [320, 50], [970, 250],
    ];
    document.querySelectorAll('iframe').forEach(el => {
      if (el.getAttribute('data-adblocker-hidden')) return;
      const src = el.src || '';
      if (/ads|doubleclick|googlesyndication|adservice|2mdn/i.test(src)) {
        hideElement(el); return;
      }
      const r = el.getBoundingClientRect();
      const w = Math.round(r.width), h = Math.round(r.height);
      if (adSizes.some(([aw, ah]) => aw === w && ah === h)) hideElement(el);
    });
  }

  // ── YouTube reklam atlama ─────────────────────────────────────────────────
  function handleYouTubeAds() {
    if (!isYouTube) return;

    // Skip butonuna bas
    const skipBtn = document.querySelector(
      '.ytp-skip-ad-button, .ytp-ad-skip-button, [class*="skip-ad"], .ytp-ad-skip-button-modern'
    );
    if (skipBtn) { skipBtn.click(); return; }

    // Atlanamayan reklam varsa video süresini sona atla
    const adBadge = document.querySelector('.ytp-ad-simple-ad-badge, .ytp-ad-duration-remaining');
    if (adBadge) {
      const video = document.querySelector('video');
      if (video && isFinite(video.duration)) {
        video.currentTime = video.duration;
      }
    }

    // Overlay / banner reklamları gizle
    applySelectors(YOUTUBE_SELECTORS);
  }

  // ── Ana filtre fonksiyonu ─────────────────────────────────────────────────
  function applyFilters() {
    if (!settings.enabled) return;
    if (settings.blockAds) {
      applySelectors(AD_SELECTORS);
      if (isYouTube) applySelectors(YOUTUBE_SELECTORS);
      detectAdsBySize();
    }
    if (settings.blockTrackers) applySelectors(TRACKER_SELECTORS);
    if (settings.blockCookieNotices) applySelectors(COOKIE_SELECTORS);
    if (customSelectors.length) applySelectors(customSelectors.map(s => s.selector));
  }

  // ── MutationObserver ──────────────────────────────────────────────────────
  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(() => {
      clearTimeout(window.__adBlockTimer);
      window.__adBlockTimer = setTimeout(applyFilters, 150);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  // ── YouTube interval başlat/durdur ────────────────────────────────────────
  function startYtInterval() {
    if (!isYouTube || ytAdInterval) return;
    ytAdInterval = setInterval(handleYouTubeAds, 500);
  }

  function stopYtInterval() {
    if (ytAdInterval) { clearInterval(ytAdInterval); ytAdInterval = null; }
  }

  // ── Ayarları ve özel seçicileri yükle ────────────────────────────────────
  function loadAll() {
    chrome.runtime.sendMessage({ action: 'getSettings' }, (res) => {
      if (chrome.runtime.lastError) return;
      if (res?.settings) settings = res.settings;
      if (!settings.enabled) return;
      applyFilters();
      startObserver();
      startYtInterval();
    });

    chrome.storage.local.get('customSelectors', (data) => {
      customSelectors = data.customSelectors || [];
      applySelectors(customSelectors.map(s => s.selector));
    });
  }

  // ── Mesaj dinleyici ───────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'applyCustomSelector') {
      customSelectors = msg.selectors || [];
      applySelectors(customSelectors.map(s => s.selector));
    }
  });

  // ── Storage değişikliklerini dinle ────────────────────────────────────────
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.settings) {
      settings = changes.settings.newValue;
      if (settings.enabled) { applyFilters(); startObserver(); startYtInterval(); }
      else { if (observer) { observer.disconnect(); observer = null; } stopYtInterval(); }
    }
    if (changes.customSelectors) {
      customSelectors = changes.customSelectors.newValue || [];
      applySelectors(customSelectors.map(s => s.selector));
    }
  });

  document.addEventListener('DOMContentLoaded', applyFilters);
  window.addEventListener('load', applyFilters);
  loadAll();

})();
