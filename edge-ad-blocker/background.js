// Background Service Worker - Edge Reklam Engelleyici

const DEFAULT_SETTINGS = {
  enabled: true,
  blockAds: true,
  blockTrackers: true,
  blockPopups: true,
  blockCookieNotices: false,
  stats: {
    totalBlocked: 0,
    sessionsBlocked: 0
  }
};

// Uzantı yüklendiğinde varsayılan ayarları başlat
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    console.log('Reklam Engelleyici kuruldu!');
  } else if (details.reason === 'update') {
    const existing = await chrome.storage.local.get('settings');
    if (!existing.settings) {
      await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    }
  }
  updateDynamicRules();
});

// Engellenen istek sayısını takip et
chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener((info) => {
  incrementBlockCount();
});

async function incrementBlockCount() {
  const data = await chrome.storage.local.get('settings');
  const settings = data.settings || DEFAULT_SETTINGS;
  settings.stats.totalBlocked = (settings.stats.totalBlocked || 0) + 1;
  settings.stats.sessionsBlocked = (settings.stats.sessionsBlocked || 0) + 1;
  await chrome.storage.local.set({ settings });

  // Aktif sekmedeki badge'i güncelle
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
    const text = count > 999 ? '999+' : count.toString();
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: '#E63946' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Tab değiştiğinde sayacı sıfırla (opsiyonel: per-tab istatistik)
chrome.tabs.onActivated.addListener(async () => {
  await updateBadge();
});

// Mesajları dinle (popup'tan gelen)
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

  if (message.action === 'getTabStats') {
    chrome.storage.local.get('settings').then(data => {
      sendResponse({ stats: data.settings?.stats || { totalBlocked: 0 } });
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
});

async function updateDynamicRules(settings) {
  if (!settings) {
    const data = await chrome.storage.local.get('settings');
    settings = data.settings || DEFAULT_SETTINGS;
  }

  // Mevcut dinamik kuralları temizle
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingRuleIds = existingRules.map(r => r.id);

  const newRules = [];

  // Popup engelleme kuralları
  if (settings.enabled && settings.blockPopups) {
    newRules.push({
      id: 10001,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: '*popup*',
        resourceTypes: ['sub_frame']
      }
    });
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingRuleIds,
    addRules: newRules
  });

  // Statik kural gruplarını etkinleştir/devre dışı bırak
  try {
    const updates = [];

    if (settings.enabled) {
      if (settings.blockAds) {
        updates.push({ rulesetId: 'ad_rules', enabled: true });
      } else {
        updates.push({ rulesetId: 'ad_rules', enabled: false });
      }

      if (settings.blockTrackers) {
        updates.push({ rulesetId: 'tracker_rules', enabled: true });
      } else {
        updates.push({ rulesetId: 'tracker_rules', enabled: false });
      }
    } else {
      updates.push({ rulesetId: 'ad_rules', enabled: false });
      updates.push({ rulesetId: 'tracker_rules', enabled: false });
    }

    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: updates.filter(u => u.enabled).map(u => u.rulesetId),
      disableRulesetIds: updates.filter(u => !u.enabled).map(u => u.rulesetId)
    });
  } catch (e) {
    console.error('Kural güncelleme hatası:', e);
  }
}

// Başlangıçta badge'i güncelle
updateBadge();
