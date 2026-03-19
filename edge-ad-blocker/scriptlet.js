// scriptlet.js — MAIN world (sayfa context'i) — uBlock Origin yaklaşımı
// Content script sandbox'ın dışında, doğrudan sayfanın JS ortamında çalışır.
// fetch, XHR, window.open, IMA SDK ve video elementlerini yakalar.

(function () {
  'use strict';

  // ── Engellenecek URL desenleri ──────────────────────────────────────────
  // VAST/VPAID ad manifest, IMA SDK, ve Türk bahis reklam sunucuları
  const BLOCKED_PATTERNS = [
    // Google Video/Display Ad altyapısı
    'imasdk.googleapis.com',
    'doubleclick.net/gampad',
    'doubleclick.net/pfadx',
    'securepubads.g.doubleclick.net',
    'pagead2.googlesyndication.com/pagead/lvz',
    '2mdn.net',
    // VAST/VPAID ad manifest URL desenleri
    '/vast', '/vpaid', 'adtag', 'preroll', '/ad/vast', 'adsmanager',
    // SpotX, Teads, JW Player ad sunucuları
    'spotxcdn.com', 'spotxchange.com',
    'teads.tv', 'teads.net',
    'jwpcdn.com/player/v/*/jwplayer.vast',
    // Türk bahis reklam ağları (araştırma raporundan)
    'trbetmedia.com', 'perabetads.com', 'betendads.com',
    'adbetnet.com', 'adbetnetwork.com', 'adbetclickin.pink',
    'betzeplinreklam.com', 'betlox.com', 'betcdn.biz',
    'kingredirect.com', 'kingyonlendir.link',
    'erosaffiliates.com', 'neataffiliates.com', 'facesbet.com',
    'cmsbetconstruct.com', 'trkwinaff13.com', 'magicclick.partners',
    'betwinnerpromo.com', 'axbetb.com', 'axbetb2.com',
    'ilbetaff.com', 'modabetaff.com', 'winaffiliates.com',
  ];

  function isBlocked(url) {
    if (!url) return false;
    const u = String(url).toLowerCase();
    return BLOCKED_PATTERNS.some(p => u.includes(p));
  }

  // ── 1. fetch durdurma ──────────────────────────────────────────────────
  const _fetch = window.fetch;
  window.fetch = function (resource, init) {
    try {
      const url = resource instanceof Request ? resource.url : String(resource || '');
      if (isBlocked(url)) {
        // VAST için boş XML döndür (player hata vermez, sadece reklam olmaz)
        const body = (url.includes('vast') || url.includes('vpaid'))
          ? '<VAST version="3.0"/>'
          : '';
        return Promise.resolve(new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        }));
      }
    } catch (_) {}
    return _fetch.apply(this, arguments);
  };

  // ── 2. XMLHttpRequest durdurma ─────────────────────────────────────────
  const _xhrOpen = XMLHttpRequest.prototype.open;
  const _xhrSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    try {
      if (isBlocked(url)) {
        this.__adBlocked = true;
        return; // open() çağrısını atla
      }
    } catch (_) {}
    return _xhrOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    if (this.__adBlocked) {
      // Sahte başarılı yanıt — player hata yakalamaz, reklam gelmez
      const self = this;
      setTimeout(() => {
        try {
          Object.defineProperty(self, 'readyState',   { value: 4, configurable: true });
          Object.defineProperty(self, 'status',       { value: 200, configurable: true });
          Object.defineProperty(self, 'responseText', { value: '', configurable: true });
          Object.defineProperty(self, 'response',     { value: '', configurable: true });
          if (typeof self.onload === 'function')
            self.onload(new Event('load'));
          if (typeof self.onreadystatechange === 'function')
            self.onreadystatechange(new Event('readystatechange'));
        } catch (_) {}
      }, 0);
      return;
    }
    return _xhrSend.apply(this, args);
  };

  // ── 3. Google IMA SDK stub ─────────────────────────────────────────────
  // Eğer IMA SDK bir şekilde yüklenirse (cache, CDN vb.), stub ile etkisiz kıl.
  // uBlock Origin'in googleimapatch scriptlet'i ile aynı fikir.
  function stubIMA() {
    if (window.google && window.google.ima && window.google.ima.__stubbed) return;
    const noop = function () {};
    const noopObj = { addEventListener: noop, removeEventListener: noop };

    const imaStub = {
      __stubbed: true,
      AdDisplayContainer: function () { return { initialize: noop, destroy: noop }; },
      AdsLoader: function () {
        return {
          addEventListener: noop,
          removeEventListener: noop,
          requestAds: noop,
          destroy: noop,
          contentComplete: noop,
        };
      },
      AdsRequest: function () { return {}; },
      AdsManagerLoadedEvent: { Type: { ADS_MANAGER_LOADED: '' } },
      AdErrorEvent:          { Type: { AD_ERROR: '' } },
      AdEvent: {
        Type: {
          ALL_ADS_COMPLETED: '', CLICK: '', COMPLETE: '', CONTENT_PAUSE_REQUESTED: '',
          CONTENT_RESUME_REQUESTED: '', LOADED: '', STARTED: '', SKIPPED: '',
        },
      },
      ViewMode: { FULLSCREEN: 'fullscreen', NORMAL: 'normal' },
      settings: { setDisableCustomPlaybackForIOS10Plus: noop, setVpaidMode: noop },
      ImaSdkSettings: { VpaidMode: { DISABLED: 0, ENABLED: 1, INSECURE: 2 } },
    };

    window.google = window.google || {};
    window.google.ima = imaStub;
  }

  // IMA yüklenmeden önce stub'u hazırla
  stubIMA();
  // IMA sonradan inject edilebilir — script yükleme olayını izle
  document.addEventListener('load', function (e) {
    if (e.target && e.target.tagName === 'SCRIPT') {
      const src = (e.target.src || '').toLowerCase();
      if (src.includes('imasdk') || src.includes('ima3')) stubIMA();
    }
  }, true);

  // ── 4. window.open — bahis/kumar popup engelleyici ─────────────────────
  const TR_BET_POPUP = [
    'bahis', 'casino', 'kumar', 'jojobet', 'casibom', 'bets10',
    'nakitbahis', 'superbahis', 'marsbahis', 'tipobet', 'tempobet',
    'holiganbet', 'onwin', 'betboo', 'grandpashabet', 'mostbet',
    'melbet', '1xbet', 'betwinner', 'mobilbahis', 'betgaranti',
    'trbet', 'vdcasino', 'sultanbet', 'bahsegel', 'betpark',
  ];
  const _winOpen = window.open;
  window.open = function (url, ...rest) {
    try {
      if (url) {
        const u = String(url).toLowerCase();
        if (TR_BET_POPUP.some(b => u.includes(b))) return null;
      }
    } catch (_) {}
    return _winOpen.apply(this, arguments);
  };

  // ── 5. Reklam video tespiti ve durdurma ───────────────────────────────
  // uBlock'un approach'u: video src'si bir ad sunucusuna işaret ediyorsa durdur.
  const AD_VIDEO_SRC_PATTERNS = [
    'doubleclick', 'googlesyndication', 'googleads', 'imasdk',
    '2mdn.net', 'adserver', '/ad/', 'preroll', 'spotxcdn',
    'teads', 'jwplayer/vast',
    // Türk bahis video ad sunucuları
    'trbetmedia', 'perabetads', 'betendads', 'adbetnet', 'betlox', 'betcdn',
  ];

  function isAdVideoSrc(src) {
    const s = (src || '').toLowerCase();
    return s.length > 4 && AD_VIDEO_SRC_PATTERNS.some(p => s.includes(p));
  }

  function killAdVideo(v) {
    if (v.__adKilled) return;
    v.__adKilled = true;
    try {
      v.pause();
      v.muted = true;
      v.volume = 0;
      v.src = '';
      v.srcObject = null;
      v.load();
    } catch (_) {}
    // Reklam container'ını gizle
    const container = v.closest(
      '[class*="preroll"],[class*="ad-"],[class*="-ad"],[class*="overlay"],' +
      '[id*="preroll"],[id*="ad-player"],[class*="video-ad"]'
    ) || v.parentElement;
    if (container && container !== document.body) {
      container.style.setProperty('display', 'none', 'important');
    }
  }

  function scanAllVideos() {
    document.querySelectorAll('video').forEach(function (v) {
      if (v.__adKilled) return;
      const src = v.src || v.currentSrc || '';
      if (isAdVideoSrc(src)) { killAdVideo(v); return; }
      // src henüz bilinmiyorsa — yüklenince kontrol et
      if (!v.__adWatched) {
        v.__adWatched = true;
        v.addEventListener('loadstart', function () {
          if (!v.__adKilled && isAdVideoSrc(v.currentSrc || v.src)) killAdVideo(v);
        });
      }
    });
  }

  // ── 6. Dinamik eklenen elementleri izle ───────────────────────────────
  const mo = new MutationObserver(function () { scanAllVideos(); });

  function startMO() {
    if (document.body) {
      mo.observe(document.body, { childList: true, subtree: true });
      scanAllVideos();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startMO);
  } else {
    startMO();
  }

  // ── 7. YouTube özel: ad verilerini JSON yanıtlarından sil ─────────────
  if (location.hostname.includes('youtube.com')) {
    const _jsonParse = JSON.parse;
    JSON.parse = function (text) {
      let r;
      try { r = _jsonParse.apply(this, arguments); } catch (e) { throw e; }
      if (r && typeof r === 'object') {
        try {
          if (r.adPlacements)             r.adPlacements = [];
          if (r.playerAds)                r.playerAds = [];
          if (r.adSlots)                  r.adSlots = [];
          if (r.adBreakHeartbeatParams)   delete r.adBreakHeartbeatParams;
          // YouTube Shorts ad injections
          if (r.reelPlayerOverlayRenderer) {
            const o = r.reelPlayerOverlayRenderer;
            if (o.adBadgeRenderer)   delete o.adBadgeRenderer;
            if (o.reelAdSequenceRenderer) delete o.reelAdSequenceRenderer;
          }
        } catch (_) {}
      }
      return r;
    };
  }

})();
