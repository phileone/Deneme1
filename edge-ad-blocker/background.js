// Background Service Worker - Edge Reklam Engelleyici

const DEFAULT_SETTINGS = {
  enabled: true,
  blockAds: true,
  blockTrackers: true,
  blockPopups: true,
  blockCookieNotices: false,
  stats: { totalBlocked: 0, sessionsBlocked: 0 }
};

// ── Kurulum ───────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS, customSelectors: [] });
  } else if (details.reason === 'update') {
    const data = await chrome.storage.local.get(['settings', 'customSelectors']);
    if (!data.settings) await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    if (!data.customSelectors) await chrome.storage.local.set({ customSelectors: [] });
  }
  updateDynamicRules();
});

// ── Engelleme sayacı ──────────────────────────────────────────────────────
chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener(() => {
  incrementBlockCount();
});

async function incrementBlockCount() {
  const data = await chrome.storage.local.get('settings');
  const settings = data.settings || DEFAULT_SETTINGS;
  settings.stats.totalBlocked = (settings.stats.totalBlocked || 0) + 1;
  settings.stats.sessionsBlocked = (settings.stats.sessionsBlocked || 0) + 1;
  await chrome.storage.local.set({ settings });
  updateBadge();
}

async function updateBadge() {
  const data = await chrome.storage.local.get('settings');
  const settings = data.settings || DEFAULT_SETTINGS;
  if (!settings.enabled) {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#999999' });
    return;
  }
  const count = settings.stats.sessionsBlocked || 0;
  if (count > 0) {
    chrome.action.setBadgeText({ text: count > 999 ? '999+' : count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#E63946' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

chrome.tabs.onActivated.addListener(() => updateBadge());

// ── Mesaj dinleyicisi ─────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.action === 'getSettings') {
    chrome.storage.local.get('settings').then(data => {
      sendResponse({ settings: data.settings || DEFAULT_SETTINGS });
    });
    return true;
  }

  if (message.action === 'updateSettings') {
    chrome.storage.local.set({ settings: message.settings }).then(async () => {
      await updateDynamicRules(message.settings);
      await updateBadge();
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'resetStats') {
    chrome.storage.local.get('settings').then(data => {
      const settings = data.settings || DEFAULT_SETTINGS;
      settings.stats = { totalBlocked: 0, sessionsBlocked: 0 };
      chrome.storage.local.set({ settings }).then(() => {
        chrome.action.setBadgeText({ text: '' });
        sendResponse({ success: true });
      });
    });
    return true;
  }

  // ── Eleman Seçici: picker.js'i sekmeye enjekte et ────────────────────────
  if (message.action === 'startPicker') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) { sendResponse({ success: false }); return; }
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['picker.js']
      }).then(() => {
        sendResponse({ success: true });
      }).catch(err => {
        console.error('Picker enjeksiyon hatası:', err);
        sendResponse({ success: false, error: err.message });
      });
    });
    return true;
  }

  // ── Seçilen eleman kaydedildi ─────────────────────────────────────────────
  if (message.action === 'elementPicked') {
    chrome.storage.local.get('customSelectors').then(data => {
      const selectors = data.customSelectors || [];
      const newEntry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        selector: message.selector,
        hostname: message.hostname || '*',
        created: Date.now(),
      };
      selectors.unshift(newEntry);
      chrome.storage.local.set({ customSelectors: selectors }).then(() => {
        // Tüm sekmelerdeki content script'lere bildir
        notifyAllTabs(selectors);
        sendResponse({ success: true });
      });
    });
    return true;
  }

  // ── Özel seçicileri getir ─────────────────────────────────────────────────
  if (message.action === 'getCustomSelectors') {
    chrome.storage.local.get('customSelectors').then(data => {
      sendResponse({ selectors: data.customSelectors || [] });
    });
    return true;
  }

  // ── Özel seçici sil ───────────────────────────────────────────────────────
  if (message.action === 'removeCustomSelector') {
    chrome.storage.local.get('customSelectors').then(data => {
      const selectors = (data.customSelectors || []).filter(s => s.id !== message.id);
      chrome.storage.local.set({ customSelectors: selectors }).then(() => {
        notifyAllTabs(selectors);
        sendResponse({ success: true });
      });
    });
    return true;
  }

  // ── Tüm özel seçicileri temizle ───────────────────────────────────────────
  if (message.action === 'clearCustomSelectors') {
    chrome.storage.local.set({ customSelectors: [] }).then(() => {
      notifyAllTabs([]);
      sendResponse({ success: true });
    });
    return true;
  }
});

// Tüm sekmelere güncel seçici listesini gönder
function notifyAllTabs(selectors) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'applyCustomSelector',
        selectors,
      }).catch(() => {}); // Sekme dinlemiyorsa yoksay
    });
  });
}

// ── Dinamik kuralları güncelle ────────────────────────────────────────────
async function updateDynamicRules(settings) {
  if (!settings) {
    const data = await chrome.storage.local.get('settings');
    settings = data.settings || DEFAULT_SETTINGS;
  }

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const existingIds = existing.map(r => r.id);
  const newRules = [];

  if (settings.enabled && settings.blockPopups) {
    newRules.push({
      id: 10001, priority: 1,
      action: { type: 'block' },
      condition: { urlFilter: '*popup*', resourceTypes: ['sub_frame'] }
    });
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingIds,
    addRules: newRules
  });

  try {
    const enable = [], disable = [];
    if (settings.enabled) {
      (settings.blockAds ? enable : disable).push('ad_rules');
      (settings.blockTrackers ? enable : disable).push('tracker_rules');
    } else {
      disable.push('ad_rules', 'tracker_rules');
    }
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: enable,
      disableRulesetIds: disable,
    });
  } catch (e) {
    console.error('Kural güncelleme hatası:', e);
  }
}

updateBadge();
