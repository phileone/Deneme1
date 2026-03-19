// Popup JavaScript - Edge Reklam Engelleyici v1.1

document.addEventListener('DOMContentLoaded', () => {
  const masterToggle    = document.getElementById('masterToggle');
  const blockAds        = document.getElementById('blockAds');
  const blockTrackers   = document.getElementById('blockTrackers');
  const blockPopups     = document.getElementById('blockPopups');
  const blockCookieNotices = document.getElementById('blockCookieNotices');
  const blockedCount    = document.getElementById('blockedCount');
  const sessionCount    = document.getElementById('sessionCount');
  const resetStats      = document.getElementById('resetStats');
  const statsCard       = document.getElementById('statsCard');
  const disabledNotice  = document.getElementById('disabledNotice');
  const filtersSection  = document.getElementById('filtersSection');
  const statusText      = document.getElementById('statusText');
  const pickerBtn       = document.getElementById('pickerBtn');
  const customList      = document.getElementById('customList');
  const customEmpty     = document.getElementById('customEmpty');
  const customCount     = document.getElementById('customCount');
  const clearAllCustom  = document.getElementById('clearAllCustom');

  let currentSettings = null;

  // ── Ayarları yükle ───────────────────────────────────────────────────────
  function loadSettings() {
    chrome.runtime.sendMessage({ action: 'getSettings' }, (res) => {
      if (chrome.runtime.lastError) return;
      if (res?.settings) { currentSettings = res.settings; applySettingsToUI(currentSettings); }
    });
  }

  function applySettingsToUI(s) {
    masterToggle.checked        = s.enabled;
    blockAds.checked            = s.blockAds;
    blockTrackers.checked       = s.blockTrackers;
    blockPopups.checked         = s.blockPopups;
    blockCookieNotices.checked  = s.blockCookieNotices;
    blockedCount.textContent    = formatNumber(s.stats?.totalBlocked || 0);
    sessionCount.textContent    = formatNumber(s.stats?.sessionsBlocked || 0);
    updateUIState(s.enabled);
  }

  function updateUIState(enabled) {
    statsCard.style.display     = enabled ? 'flex' : 'none';
    disabledNotice.style.display = enabled ? 'none' : 'flex';
    filtersSection.classList.toggle('disabled', !enabled);
    pickerBtn.disabled          = !enabled;
    statusText.textContent      = enabled ? 'Koruma aktif' : 'Devre dışı';
    statusText.classList.toggle('disabled', !enabled);
  }

  function formatNumber(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toString();
  }

  function saveSettings() {
    if (!currentSettings) return;
    currentSettings.enabled             = masterToggle.checked;
    currentSettings.blockAds            = blockAds.checked;
    currentSettings.blockTrackers       = blockTrackers.checked;
    currentSettings.blockPopups         = blockPopups.checked;
    currentSettings.blockCookieNotices  = blockCookieNotices.checked;
    chrome.runtime.sendMessage({ action: 'updateSettings', settings: currentSettings });
    updateUIState(currentSettings.enabled);
  }

  masterToggle.addEventListener('change', saveSettings);
  blockAds.addEventListener('change', saveSettings);
  blockTrackers.addEventListener('change', saveSettings);
  blockPopups.addEventListener('change', saveSettings);
  blockCookieNotices.addEventListener('change', saveSettings);

  resetStats.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'resetStats' }, (res) => {
      if (res?.success) {
        blockedCount.textContent = '0';
        sessionCount.textContent = '0';
        blockedCount.classList.add('updating');
        setTimeout(() => blockedCount.classList.remove('updating'), 300);
        if (currentSettings) currentSettings.stats = { totalBlocked: 0, sessionsBlocked: 0 };
      }
    });
  });

  // ── Eleman Seçici ─────────────────────────────────────────────────────────
  pickerBtn.addEventListener('click', () => {
    pickerBtn.disabled = true;
    pickerBtn.classList.add('picking');
    pickerBtn.querySelector('span').textContent = 'Seçici aktif...';

    chrome.runtime.sendMessage({ action: 'startPicker' }, (res) => {
      if (chrome.runtime.lastError || !res?.success) {
        pickerBtn.disabled = false;
        pickerBtn.classList.remove('picking');
        pickerBtn.querySelector('span').textContent = 'Sayfadan Eleman Seç';
        return;
      }
      // Popup kapanıyor - picker sayfada aktif olacak
      window.close();
    });
  });

  // ── Özel seçiciler listesi ────────────────────────────────────────────────
  function loadCustomSelectors() {
    chrome.runtime.sendMessage({ action: 'getCustomSelectors' }, (res) => {
      if (chrome.runtime.lastError) return;
      renderCustomList(res?.selectors || []);
    });
  }

  function renderCustomList(selectors) {
    const count = selectors.length;
    customCount.textContent = count;
    customCount.classList.toggle('has-items', count > 0);
    clearAllCustom.style.display = count > 0 ? 'block' : 'none';
    customEmpty.style.display    = count === 0 ? 'flex' : 'none';
    customList.innerHTML = '';

    selectors.forEach(item => {
      const li = document.createElement('li');
      li.className = 'custom-item';
      li.dataset.id = item.id;

      const shortSelector = item.selector.length > 38
        ? item.selector.slice(0, 36) + '…'
        : item.selector;

      li.innerHTML = `
        <div class="custom-item-info">
          <div class="custom-item-selector" title="${escapeHtml(item.selector)}">${escapeHtml(shortSelector)}</div>
          <div class="custom-item-host">${escapeHtml(item.hostname || '*')}</div>
        </div>
        <button class="custom-item-del" title="Sil" data-id="${item.id}">
          <svg viewBox="0 0 24 24" fill="none">
            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      `;
      customList.appendChild(li);
    });

    // Silme butonları
    customList.querySelectorAll('.custom-item-del').forEach(btn => {
      btn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'removeCustomSelector', id: btn.dataset.id }, () => {
          loadCustomSelectors();
        });
      });
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  clearAllCustom.addEventListener('click', () => {
    if (confirm('Tüm manuel engellenen elemanlar silinsin mi?')) {
      chrome.runtime.sendMessage({ action: 'clearCustomSelectors' }, () => loadCustomSelectors());
    }
  });

  // ── Periyodik istatistik güncellemesi ─────────────────────────────────────
  const statsInterval = setInterval(() => {
    if (document.hidden) return;
    chrome.runtime.sendMessage({ action: 'getSettings' }, (res) => {
      if (chrome.runtime.lastError) { clearInterval(statsInterval); return; }
      if (res?.settings?.stats) {
        const newTotal = formatNumber(res.settings.stats.totalBlocked || 0);
        if (blockedCount.textContent !== newTotal) {
          blockedCount.textContent = newTotal;
          blockedCount.classList.add('updating');
          setTimeout(() => blockedCount.classList.remove('updating'), 300);
        }
        sessionCount.textContent = formatNumber(res.settings.stats.sessionsBlocked || 0);
      }
    });
  }, 2000);

  // ── Yeni seçici eklenince listeyi yenile ──────────────────────────────────
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.customSelectors) {
      renderCustomList(changes.customSelectors.newValue || []);
    }
  });

  // ── İlk yükleme ───────────────────────────────────────────────────────────
  loadSettings();
  loadCustomSelectors();
});
