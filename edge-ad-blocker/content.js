// Content Script — Kozmetik Filtreleme + YouTube Reklam Atlama + Video Ses Durdurma
// ISOLATED world (Chrome extension sandbox) — DOM manipülasyonu yapar.
// Sayfa context'i işlemleri (fetch/XHR intercept) scriptlet.js (MAIN world) tarafından yapılır.

(function () {
  'use strict';

  if (window.__adBlockerLoaded) return;
  window.__adBlockerLoaded = true;

  // ── Türk bahis siteleri marka listesi ───────────────────────────────────
  const TR_BET_BRANDS = [
    'bets10','jojobet','casibom','nakitbahis','superbahis','mobilbahis',
    'marsbahis','tipobet','tempobet','pinbahis','sultanbet','bahsegel',
    'betpark','betist','mariobet','betgaranti','betlike','vdcasino',
    'queenbet','goldenbahis','makrobet','retrobet','limanbet','atlantisbahis',
    'casinoper','hiperwin','cratosslot','betturkey','kibrisbet','sahabet',
    'fixbet','verabet','interbahis','hipercasino','celtabet','milobet',
    'matbet','betmatik','ngsbahis','rokubet','casinolevant','baywin',
    'onwin','holiganbet','asyabahis','galabet','gorabet','elexbet',
    'padisahbet','imajbet','betboo','discountcasino','casinomaxi',
    'artemisbet','milanobet','betorder','rexbet','betpas','bahigo',
    'betnano','youwin','betandyou','parimatch','betwinner','mostbet',
    'melbet','1xbet','betsson','bahiscom','betcio','anadolucasino',
    'betoffice','casinovale','betpublic','redwin','trbet','betturca',
    'bahistr','jetbahis','casinometropol','grandpashabet','vegaslot',
    'piabet','turkbet','scorbet','hiltonbet','22bet','hovarda','intobet',
    'jackburst','betroad','davegas','neataffiliates','facesbet','betlox',
    'kingredirect','kingyonlendir','ukbet','trbetmedia','perabetads',
    'betendads','adbetnet','betzeplinreklam','cmsbetconstruct',
  ];

  // ── Genel reklam seçicileri ─────────────────────────────────────────────
  const AD_SELECTORS = [
    'ins.adsbygoogle', '[data-ad-client]', '[data-adunit]',
    '.GoogleActiveViewClass', '#google_ads_frame',
    'iframe[src*="googleads"]', 'iframe[src*="googlesyndication"]',
    'iframe[src*="doubleclick"]', 'iframe[src*="2mdn.net"]',
    '[class*="ad-banner"]', '[class*="ad-container"]', '[class*="ad-wrapper"]',
    '[class*="ad-block"]', '[class*="adsbygoogle"]', '[class*="advertisement"]',
    '[class*="advertise"]', '[id*="ad-banner"]', '[id*="ad-container"]',
    '[id*="google-ad"]', '[id*="banner-ad"]',
    'div[id*="taboola"]', 'div[class*="taboola"]',
    'div[id*="outbrain"]', 'div[class*="outbrain"]',
    '.trc_rbox_container', '#taboola-below-article',
    '.banner-ads', '.banner-advertisement', '.top-ads',
    '.sidebar-ad', '#sidebar-ad', '.leaderboard-ad', '.mrec-ad',
    '.popup-ad', '.overlay-ad', '[class*="interstitial"]',
    '[data-sponsored]', '[aria-label*="Sponsored"]', '[aria-label*="Reklam"]',
    '.sponsored-content', '.native-ad',
    '.video-ad-container', '[class*="preroll"]', '[id*="preroll"]',
    'iframe[src*="ads."]', 'iframe[src*="ad."]',
    // :has() seçicileri — container'ı iç elemana göre tespit et (uBlock yaklaşımı)
    'div:has(> iframe[src*="doubleclick"])',
    'div:has(> iframe[src*="googlesyndication"])',
    'div:has(> ins.adsbygoogle)',
  ];

  // ── YouTube'a özgü seçiciler ────────────────────────────────────────────
  const YOUTUBE_SELECTORS = [
    '#masthead-ad', '.ytd-display-ad-renderer', 'ytd-display-ad-renderer',
    '.ytd-promoted-video-renderer', 'ytd-promoted-video-renderer',
    'ytd-promoted-sparkles-web-renderer', '.ytd-companion-slot-renderer',
    'ytd-companion-slot-renderer', 'ytd-action-companion-ad-renderer',
    '.ytp-ad-overlay-container', '.ytp-ad-text-overlay', '.ytp-ce-element',
    '.ytp-suggested-action', '#player-ads', '.video-ads',
    'ytd-banner-promo-renderer', 'tp-yt-paper-dialog',
    '.ytd-ad-slot-renderer', 'ytd-ad-slot-renderer',
    '#cinematics', '.ytd-in-feed-ad-layout-renderer',
  ];

  // ── İzleyici seçicileri ──────────────────────────────────────────────────
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

  let settings = {
    enabled: true, blockAds: true, blockTrackers: true,
    blockCookieNotices: false, blockBetting: true,
  };
  let customSelectors = [];
  let observer = null;
  let ytAdInterval = null;
  const isYouTube = location.hostname.includes('youtube.com');

  // ── Öğe gizleme — içindeki videolar varsa durdur ────────────────────────
  function hideElement(el) {
    if (!el || el.getAttribute('data-adblocker-hidden')) return;

    // İçindeki tüm video elementlerini durdur (arka plan ses sorununu çözer)
    el.querySelectorAll('video').forEach(pauseAdVideo);

    el.style.setProperty('display', 'none', 'important');
    el.style.setProperty('visibility', 'hidden', 'important');
    el.style.setProperty('pointer-events', 'none', 'important');
    el.setAttribute('data-adblocker-hidden', 'true');
  }

  // ── Reklam videosu durdurma ─────────────────────────────────────────────
  function pauseAdVideo(video) {
    if (!video || video.__adPaused) return;
    video.__adPaused = true;
    try {
      video.pause();
      video.muted = true;
      video.volume = 0;
      // Gerçek içerik videosu değilse src'yi temizle
      const src = video.src || video.currentSrc || '';
      const isMainPlayer = video.closest('.html5-main-video, [class*="main-player"], [id*="main-player"]');
      if (!isMainPlayer && src.length > 0) {
        video.src = '';
        try { video.load(); } catch (_) {}
      }
    } catch (_) {}
  }

  // ── Seçicileri uygula ───────────────────────────────────────────────────
  function applySelectors(selectors) {
    selectors.forEach(sel => {
      try { document.querySelectorAll(sel).forEach(hideElement); } catch (_) {}
    });
  }

  // ── Türk bahis içeriği DOM taraması ────────────────────────────────────
  function blockTurkishBettingContent() {
    if (!settings.blockBetting) return;

    // iframe src
    document.querySelectorAll('iframe[src]').forEach(el => {
      const src = el.src.toLowerCase();
      if (TR_BET_BRANDS.some(b => src.includes(b))) hideElement(el);
    });

    // img src → en yakın link/container'ı gizle
    document.querySelectorAll('img[src]').forEach(el => {
      const src = el.src.toLowerCase();
      if (TR_BET_BRANDS.some(b => src.includes(b)))
        hideElement(el.closest('a,div,article,aside,section,li') || el);
    });

    // a href — bahis bağlantıları
    document.querySelectorAll('a[href]').forEach(el => {
      const href = el.href.toLowerCase();
      if (TR_BET_BRANDS.some(b => href.includes(b))) {
        hideElement(el.closest('div,article,aside,section,li') || el);
      }
    });

    // Metin içeriği kontrolü
    document.querySelectorAll(
      'h1,h2,h3,h4,h5,span,button,div[class*="banner"],div[class*="promo"],div[class*="sponsor"]'
    ).forEach(el => {
      if (el.getAttribute('data-adblocker-hidden') || el.children.length > 5) return;
      const text = el.textContent.toLowerCase();
      const isBet = TR_BET_BRANDS.some(b => text.includes(b)) ||
        /bahis|casino|kumar|bet bonus|free spin|para yatır|yatırım bonusu|hoşgeldin bonusu/.test(text);
      if (isBet)
        hideElement(el.closest('[class*="ad"],[class*="banner"],[class*="promo"],[class*="sponsor"]') || el);
    });

    // class/id adında bahis markası geçenler
    const brandSelectors = TR_BET_BRANDS.flatMap(b => [
      `[class*="${b}"]`, `[id*="${b}"]`,
      `iframe[src*="${b}"]`, `a[href*="${b}"]`,
    ]);
    applySelectors(brandSelectors);
  }

  // ── Boyuta göre iframe tespiti ──────────────────────────────────────────
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

  // ── Video overlay / pre-roll tespiti ────────────────────────────────────
  // uBlock'un yaklaşımı: ana video dışındaki overlay video elementlerini tespit et
  function detectVideoAds() {
    const videos = Array.from(document.querySelectorAll('video'));
    if (videos.length < 2) return; // Tek video varsa dokunma (muhtemelen ana içerik)

    videos.forEach(v => {
      if (v.__adPaused) return;
      const src = v.src || v.currentSrc || '';
      // Bahis markası veya bilinen ad sunucusu içeriyorsa durdur
      const isBetVideo = TR_BET_BRANDS.some(b => src.toLowerCase().includes(b));
      const isAdSrc = /doubleclick|googlesyndication|2mdn|adserver|preroll|spotxcdn|teads/i.test(src);
      // Overlay tarzı video: z-index yüksek, konumlanmış, üst üste
      const style = window.getComputedStyle(v);
      const isOverlay = style.position === 'absolute' || style.position === 'fixed';
      const zIdx = parseInt(style.zIndex, 10);
      const isHighZ = !isNaN(zIdx) && zIdx > 100;
      const parent = v.parentElement;
      const parentClass = (parent ? (parent.className + ' ' + parent.id) : '').toLowerCase();
      const isAdContainer = /preroll|ad-|overlay|betting|promo|sponsor/.test(parentClass) ||
        TR_BET_BRANDS.some(b => parentClass.includes(b));

      if (isBetVideo || isAdSrc || (isOverlay && isHighZ && isAdContainer)) {
        pauseAdVideo(v);
        hideElement(parent || v);
      }
    });
  }

  // ── YouTube reklam atlama ───────────────────────────────────────────────
  function handleYouTubeAds() {
    if (!isYouTube) return;

    // Skip butonu varsa tıkla
    const skipBtn = document.querySelector(
      '.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, [class*="skip-ad"]'
    );
    if (skipBtn) { skipBtn.click(); return; }

    // Atlanamayan reklamda videoyu sona atla
    const adBadge = document.querySelector(
      '.ytp-ad-simple-ad-badge, .ytp-ad-duration-remaining, .ytp-ad-player-overlay, .ytp-ad-persistent-progress-bar-container'
    );
    if (adBadge) {
      const video = document.querySelector('video');
      if (video && isFinite(video.duration) && video.duration > 0) {
        video.currentTime = video.duration;
        video.muted = false;
      }
    }

    applySelectors(YOUTUBE_SELECTORS);
  }

  // ── IntersectionObserver: gizlenen video elementlerini durdur ──────────
  // "Manuel kapatınca ses arka planda çalmaya devam ediyor" sorununu çözer
  function setupVideoIntersectionObserver() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) {
          const v = entry.target;
          // Görünürlüğü sıfırsa ve kısa bir videoysa (reklam), durdur
          // Ana içerik videosu (uzun, tam ekran) için dokunma
          if (v.duration < 60 || (v.parentElement &&
              /ad|preroll|overlay|promo|sponsor/i.test(
                (v.parentElement.className || '') + (v.parentElement.id || '')
              ))) {
            pauseAdVideo(v);
          }
        }
      });
    }, { threshold: 0.01 });

    // Mevcut ve gelecekteki video elementlerini izle
    function observeVideos() {
      document.querySelectorAll('video').forEach(v => {
        if (!v.__ioObserved) {
          v.__ioObserved = true;
          io.observe(v);
        }
      });
    }
    observeVideos();
    return observeVideos; // MutationObserver çağırabilsin diye
  }

  // ── Ana filtre ──────────────────────────────────────────────────────────
  let observeNewVideos = null;

  function applyFilters() {
    if (!settings.enabled) return;
    if (settings.blockAds) {
      applySelectors(AD_SELECTORS);
      if (isYouTube) applySelectors(YOUTUBE_SELECTORS);
      detectAdsBySize();
    }
    if (settings.blockTrackers) applySelectors(TRACKER_SELECTORS);
    if (settings.blockCookieNotices) applySelectors(COOKIE_SELECTORS);
    if (settings.blockBetting) {
      blockTurkishBettingContent();
      detectVideoAds();
    }
    if (customSelectors.length) applySelectors(customSelectors.map(s => s.selector));
    // Yeni eklenen video elementlerini IntersectionObserver'a kaydet
    if (observeNewVideos) observeNewVideos();
  }

  // ── CSS injection: betting brands için sıfır gecikme gizleme ───────────
  // uBlock'un "cosmetic filter at document_start" yaklaşımı
  function injectBettingCSS() {
    if (!settings.blockBetting) return;
    if (document.getElementById('__adBlockerBettingCSS')) return;

    const brandRules = TR_BET_BRANDS.flatMap(b => [
      `[class*="${b}"]`, `[id*="${b}"]`,
      `iframe[src*="${b}"]`, `a[href*="${b}"]`,
    ]).join(',\n');

    // :has() ile container tespiti (uBlock yöntemi)
    const hasRules = TR_BET_BRANDS.map(b =>
      `div:has(> a[href*="${b}"]), div:has(> iframe[src*="${b}"])`
    ).join(',\n');

    const style = document.createElement('style');
    style.id = '__adBlockerBettingCSS';
    style.textContent = `
${brandRules},
${hasRules},
[class*="preroll"], [id*="preroll"],
[class*="video-ad"], [id*="video-ad"],
div:has(> iframe[src*="doubleclick"]),
div:has(> iframe[src*="googlesyndication"]),
div:has(> ins.adsbygoogle) {
  display: none !important;
  visibility: hidden !important;
}`;
    (document.head || document.documentElement).appendChild(style);
  }

  // ── MutationObserver ────────────────────────────────────────────────────
  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(() => {
      clearTimeout(window.__adBlockTimer);
      window.__adBlockTimer = setTimeout(applyFilters, 100); // 150→100ms daha hızlı
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      // Attribute değişikliklerini de izle (class/style toggle ile gizlenen reklamlar)
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'src'],
    });
  }

  function startYtInterval() {
    if (!isYouTube || ytAdInterval) return;
    ytAdInterval = setInterval(handleYouTubeAds, 300); // 500→300ms daha agresif
  }

  function stopYtInterval() {
    if (ytAdInterval) { clearInterval(ytAdInterval); ytAdInterval = null; }
  }

  // ── Sayfa üzerinde video play'e basılınca pre-roll tespiti ─────────────
  // "Video play tuşuna basınca bet videoları dönüyor" sorununu çözer
  document.addEventListener('play', function (e) {
    if (e.target && e.target.tagName === 'VIDEO') {
      // Kısa süre bekle — pre-roll yüklenmesi için
      setTimeout(detectVideoAds, 200);
      setTimeout(detectVideoAds, 800);
      setTimeout(detectVideoAds, 1500);
    }
  }, true);

  // ── Yükleme ─────────────────────────────────────────────────────────────
  function loadAll() {
    chrome.runtime.sendMessage({ action: 'getSettings' }, (res) => {
      if (chrome.runtime.lastError) return;
      if (res?.settings) settings = res.settings;
      if (!settings.enabled) return;
      injectBettingCSS();
      applyFilters();
      startObserver();
      startYtInterval();
      observeNewVideos = setupVideoIntersectionObserver();
    });

    chrome.storage.local.get('customSelectors', (data) => {
      customSelectors = data.customSelectors || [];
      applySelectors(customSelectors.map(s => s.selector));
    });
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'applyCustomSelector') {
      customSelectors = msg.selectors || [];
      applySelectors(customSelectors.map(s => s.selector));
    }
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.settings) {
      const prev = settings;
      settings = changes.settings.newValue;
      if (settings.enabled) {
        if (settings.blockBetting && !prev.blockBetting) injectBettingCSS();
        applyFilters(); startObserver(); startYtInterval();
      } else {
        if (observer) { observer.disconnect(); observer = null; }
        stopYtInterval();
      }
    }
    if (changes.customSelectors) {
      customSelectors = changes.customSelectors.newValue || [];
      applySelectors(customSelectors.map(s => s.selector));
    }
  });

  // Sayfa yüklenirken hemen çalıştır (document_start)
  injectBettingCSS();
  document.addEventListener('DOMContentLoaded', applyFilters);
  window.addEventListener('load', applyFilters);
  loadAll();

})();
