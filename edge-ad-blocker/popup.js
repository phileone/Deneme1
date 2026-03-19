// Popup JavaScript - Edge Reklam Engelleyici

document.addEventListener('DOMContentLoaded', async () => {
  const masterToggle = document.getElementById('masterToggle');
  const blockAds = document.getElementById('blockAds');
  const blockTrackers = document.getElementById('blockTrackers');
  const blockPopups = document.getElementById('blockPopups');
  const blockCookieNotices = document.getElementById('blockCookieNotices');
  const blockedCount = document.getElementById('blockedCount');
  const sessionCount = document.getElementById('sessionCount');
  const resetStats = document.getElementById('resetStats');
  const statsCard = document.getElementById('statsCard');
  const disabledNotice = document.getElementById('disabledNotice');
  const filtersSection = document.getElementById('filtersSection');
  const statusText = document.getElementById('statusText');

  // Ayarları yükle
  let currentSettings = null;

  function loadSettings() {
    chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
      if (chrome.runtime.lastError) return;
      if (response && response.settings) {
        currentSettings = response.settings;
        applySettingsToUI(currentSettings);
      }
    });
  }

  function applySettingsToUI(settings) {
    masterToggle.checked = settings.enabled;
    blockAds.checked = settings.blockAds;
    blockTrackers.checked = settings.blockTrackers;
    blockPopups.checked = settings.blockPopups;
    blockCookieNotices.checked = settings.blockCookieNotices;

    // İstatistikleri güncelle
    const total = settings.stats?.totalBlocked || 0;
    const session = settings.stats?.sessionsBlocked || 0;

    blockedCount.textContent = formatNumber(total);
    sessionCount.textContent = formatNumber(session);

    // UI durumunu güncelle
    updateUIState(settings.enabled);
  }

  function updateUIState(enabled) {
    if (enabled) {
      statsCard.style.display = 'flex';
      disabledNotice.style.display = 'none';
      filtersSection.classList.remove('disabled');
      statusText.textContent = 'Koruma aktif';
      statusText.classList.remove('disabled');
    } else {
      statsCard.style.display = 'none';
      disabledNotice.style.display = 'flex';
      filtersSection.classList.add('disabled');
      statusText.textContent = 'Devre dışı';
      statusText.classList.add('disabled');
    }
  }

  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  function saveSettings() {
    if (!currentSettings) return;

    currentSettings.enabled = masterToggle.checked;
    currentSettings.blockAds = blockAds.checked;
    currentSettings.blockTrackers = blockTrackers.checked;
    currentSettings.blockPopups = blockPopups.checked;
    currentSettings.blockCookieNotices = blockCookieNotices.checked;

    chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings: currentSettings
    }, (response) => {
      if (chrome.runtime.lastError) return;
    });

    updateUIState(currentSettings.enabled);
  }

  // Event listeners
  masterToggle.addEventListener('change', saveSettings);
  blockAds.addEventListener('change', saveSettings);
  blockTrackers.addEventListener('change', saveSettings);
  blockPopups.addEventListener('change', saveSettings);
  blockCookieNotices.addEventListener('change', saveSettings);

  // İstatistikleri sıfırla
  resetStats.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'resetStats' }, (response) => {
      if (chrome.runtime.lastError) return;
      if (response?.success) {
        blockedCount.textContent = '0';
        sessionCount.textContent = '0';

        // Animasyon
        blockedCount.classList.add('updating');
        setTimeout(() => blockedCount.classList.remove('updating'), 300);

        if (currentSettings) {
          currentSettings.stats = { totalBlocked: 0, sessionsBlocked: 0 };
        }
      }
    });
  });

  // İlk yükleme
  loadSettings();

  // Periyodik istatistik güncellemesi (popup açıkken)
  const statsInterval = setInterval(() => {
    if (document.hidden) return;
    chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
      if (chrome.runtime.lastError) {
        clearInterval(statsInterval);
        return;
      }
      if (response?.settings?.stats) {
        const total = response.settings.stats.totalBlocked || 0;
        const session = response.settings.stats.sessionsBlocked || 0;
        const newTotalText = formatNumber(total);
        const newSessionText = formatNumber(session);

        if (blockedCount.textContent !== newTotalText) {
          blockedCount.textContent = newTotalText;
          blockedCount.classList.add('updating');
          setTimeout(() => blockedCount.classList.remove('updating'), 300);
        }
        sessionCount.textContent = newSessionText;
      }
    });
  }, 2000);
});
