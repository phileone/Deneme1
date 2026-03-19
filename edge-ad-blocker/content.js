// Content Script - Kozmetik Filtreleme (DOM tabanlı reklam gizleme)

(function () {
  'use strict';

  // Reklam seçicileri - yaygın reklam öğeleri
  const AD_SELECTORS = [
    // Genel reklam sınıfları
    '[class*="ad-banner"]',
    '[class*="ad-container"]',
    '[class*="ad-wrapper"]',
    '[class*="ad-block"]',
    '[class*="adsbygoogle"]',
    '[class*="advertisement"]',
    '[class*="advertise"]',
    '[id*="ad-banner"]',
    '[id*="ad-container"]',
    '[id*="google-ad"]',
    '[id*="banner-ad"]',

    // Google Ads
    'ins.adsbygoogle',
    '[data-ad-client]',
    '[data-adunit]',
    '.GoogleActiveViewClass',
    '#google_ads_frame',
    'iframe[src*="googleads"]',
    'iframe[src*="googlesyndication"]',
    'iframe[src*="doubleclick"]',

    // Yaygın reklam sağlayıcıları
    'iframe[src*="ads."]',
    'iframe[src*="ad."]',
    'div[id*="taboola"]',
    'div[class*="taboola"]',
    'div[id*="outbrain"]',
    'div[class*="outbrain"]',
    '.trc_rbox_container',
    '#taboola-below-article',

    // Banner reklamlar
    '.banner-ads',
    '.banner-advertisement',
    '.top-ads',
    '.sidebar-ad',
    '#sidebar-ad',
    '.leaderboard-ad',
    '.mrec-ad',

    // Pop-up ve overlay reklamlar
    '.popup-ad',
    '.overlay-ad',
    '[class*="interstitial"]',

    // Sponsor içerikler
    '[data-sponsored]',
    '[aria-label*="Sponsored"]',
    '[aria-label*="Reklam"]',
    '.sponsored-content',
    '.native-ad',

    // Video reklamlar (bazı wrapper'lar)
    '.video-ad-container',
    '[class*="preroll"]',

    // Çerez bildirimleri (opsiyonel)
    // '#cookie-banner',
    // '.cookie-consent',
  ];

  // İzleyici pixel'ler ve gizli takip öğeleri
  const TRACKER_SELECTORS = [
    'img[src*="track."]',
    'img[src*="pixel."]',
    'img[width="1"][height="1"]',
    'img[width="0"][height="0"]',
  ];

  let settings = { enabled: true, blockAds: true, blockTrackers: true, blockCookieNotices: false };
  let observer = null;
  let hiddenCount = 0;

  // Ayarları yükle
  function loadSettings() {
    chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
      if (chrome.runtime.lastError) return;
      if (response && response.settings) {
        settings = response.settings;
        if (settings.enabled) {
          applyFilters();
          startObserver();
        }
      }
    });
  }

  // Tek bir öğeyi gizle
  function hideElement(el) {
    if (el && el.style) {
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('opacity', '0', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
      el.setAttribute('data-adblocker-hidden', 'true');
      hiddenCount++;
    }
  }

  // Seçicilere göre öğeleri gizle
  function applySelectors(selectors) {
    selectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(el => {
          if (!el.getAttribute('data-adblocker-hidden')) {
            hideElement(el);
          }
        });
      } catch (e) {
        // Geçersiz seçici - atla
      }
    });
  }

  // Boyuta göre reklam tespiti (sayfadaki büyük banner'lar)
  function detectAdsBySize() {
    const commonAdSizes = [
      { w: 728, h: 90 },   // Leaderboard
      { w: 300, h: 250 },  // Medium Rectangle
      { w: 336, h: 280 },  // Large Rectangle
      { w: 160, h: 600 },  // Wide Skyscraper
      { w: 300, h: 600 },  // Half Page
      { w: 970, h: 90 },   // Large Leaderboard
      { w: 320, h: 50 },   // Mobile Banner
    ];

    document.querySelectorAll('iframe, div[style*="width"]').forEach(el => {
      if (el.getAttribute('data-adblocker-hidden')) return;

      const src = el.src || '';
      const isAdSrc = src.includes('ads') || src.includes('doubleclick') ||
        src.includes('googlesyndication') || src.includes('adservice');

      if (isAdSrc) {
        hideElement(el);
        return;
      }

      // Boyut kontrolü
      const rect = el.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);

      if (commonAdSizes.some(size => size.w === w && size.h === h)) {
        // Sadece iframe ve görsel içermeyen div'leri gizle
        if (el.tagName === 'IFRAME') {
          hideElement(el);
        }
      }
    });
  }

  // Tüm filtreleri uygula
  function applyFilters() {
    if (!settings.enabled) return;

    if (settings.blockAds) {
      applySelectors(AD_SELECTORS);
      detectAdsBySize();
    }

    if (settings.blockTrackers) {
      applySelectors(TRACKER_SELECTORS);
    }

    if (settings.blockCookieNotices) {
      applySelectors(COOKIE_SELECTORS);
    }
  }

  // Çerez bildirimleri seçicileri
  const COOKIE_SELECTORS = [
    '#cookie-banner',
    '#cookieBanner',
    '.cookie-banner',
    '.cookie-consent',
    '.cookie-notice',
    '.cookie-bar',
    '#cookie-notice',
    '#gdpr-banner',
    '.gdpr-consent',
    '[id*="cookie-consent"]',
    '[class*="cookie-consent"]',
    '[id*="cookie-notice"]',
    '[class*="cookie-notice"]',
    '.cc-window',
    '#CybotCookiebotDialog',
    '.cookieConsent',
    '#onetrust-banner-sdk',
    '.sp_message_container',
  ];

  // DOM değişikliklerini izle (dinamik içerik için)
  function startObserver() {
    if (observer) return;

    observer = new MutationObserver((mutations) => {
      let needsCheck = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          needsCheck = true;
          break;
        }
      }
      if (needsCheck) {
        // Throttle: çok sık çalışmasını önle
        clearTimeout(window._adBlockerTimer);
        window._adBlockerTimer = setTimeout(applyFilters, 200);
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // Sayfa yüklendiğinde de çalıştır
  document.addEventListener('DOMContentLoaded', applyFilters);
  window.addEventListener('load', applyFilters);

  // Ayarları yükle ve başlat
  loadSettings();

  // Ayar değişikliklerini dinle
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.settings) {
      settings = changes.settings.newValue;
      if (settings.enabled) {
        applyFilters();
        startObserver();
      } else if (observer) {
        observer.disconnect();
        observer = null;
      }
    }
  });

})();
