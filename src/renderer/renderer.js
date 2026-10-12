/**
 * renderer/renderer.js
 * منطق الواجهة (Renderer Process).
 *
 *  - تبويبات (WAI-ARIA Tabs): الذهب، الفضة، جنيه الذهب، العملات.
 *  - اختيار العيار/النقاء/الفئة داخل كل تبويب وحساب السعر بالجنيه المصري.
 *  - قائمة إعدادات للتحكم بلون النافذة وحجم الخط.
 *  - إعلانات قارئ الشاشة واختصارات لوحة المفاتيح.
 */

'use strict';

const numberFormatter = new Intl.NumberFormat('ar-EG-u-nu-latn', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function formatPrice(value) {
  if (!Number.isFinite(value)) return 'غير متوفر';
  return numberFormatter.format(value) + ' ج.م';
}

function formatTime(isoString) {
  try {
    return new Date(isoString).toLocaleTimeString('ar-EG-u-nu-latn', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  } catch {
    return '—';
  }
}

const srStatus = document.getElementById('sr-status');
function announce(message) {
  srStatus.textContent = '';
  window.setTimeout(() => { srStatus.textContent = message; }, 60);
}

/** تعبئة عنصر <select> بالخيارات مع الحفاظ على القيمة المختارة إن أمكن. */
function fillSelect(select, options) {
  const desired = select.value;
  select.textContent = '';
  options.forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = String(value);
    opt.textContent = label;
    select.appendChild(opt);
  });
  if (desired && options.some((o) => String(o.value) === desired)) {
    select.value = desired;
  }
}

// ---------------------------------------------------------------------------
// عناصر الواجهة
// ---------------------------------------------------------------------------
const el = {
  sourceBadge: document.getElementById('source-badge'),
  updatedAt: document.getElementById('updated-at'),
  btnRefresh: document.getElementById('btn-refresh'),
  btnAuto: document.getElementById('btn-auto'),
  btnSettings: document.getElementById('btn-settings'),
  btnHelp: document.getElementById('btn-help'),

  tabs: Array.from(document.querySelectorAll('[role="tab"]')),
  panels: Array.from(document.querySelectorAll('[role="tabpanel"]')),

  goldKaratSelect: document.getElementById('gold-karat-select'),
  goldKaratOut: document.getElementById('gold-karat-out'),
  goldPrice: document.getElementById('gold-result-price'),

  silverSelect: document.getElementById('silver-select'),
  silverPurityOut: document.getElementById('silver-purity-out'),
  silverPrice: document.getElementById('silver-result-price'),

  poundDenomSelect: document.getElementById('pound-denom-select'),
  poundKaratSelect: document.getElementById('pound-karat-select'),
  poundResultLabel: document.getElementById('pound-result-label'),
  poundPrice: document.getElementById('pound-result-price'),
  poundMeta: document.getElementById('pound-result-meta'),

  currencySelect: document.getElementById('currency-select'),
  currencyNameOut: document.getElementById('currency-name-out'),
  currencyBuyOut: document.getElementById('currency-buy-out'),
  currencySellOut: document.getElementById('currency-sell-out'),

  settingsOverlay: document.getElementById('settings-overlay'),
  settingsDialog: document.getElementById('settings-dialog'),
  btnCloseSettings: document.getElementById('btn-close-settings'),
  helpOverlay: document.getElementById('help-overlay'),
  helpDialog: document.getElementById('help-dialog'),
  btnCloseHelp: document.getElementById('btn-close-help')
};

// ---------------------------------------------------------------------------
// ثوابت
// ---------------------------------------------------------------------------
const GOLD_POUND_DENOMINATIONS = [
  { value: '8', label: 'جنيه ذهب', grams: 8 },
  { value: '4', label: 'نصف جنيه', grams: 4 },
  { value: '2', label: 'ربع جنيه', grams: 2 }
];

const FONT_SIZES = { small: 16, medium: 18, large: 21, xlarge: 25 };

const THEME_LABELS = {
  light: 'فاتح', dark: 'داكن', blue: 'أزرق داكن', 'high-contrast': 'تباين عالٍ'
};

const state = {
  prices: null,
  settings: { theme: 'light', fontSize: 'medium', autoRefresh: true, refreshIntervalSec: 60 }
};

// ---------------------------------------------------------------------------
// البحث في الأسعار
// ---------------------------------------------------------------------------
function getGoldGram(karat) {
  if (!state.prices) return null;
  const item = state.prices.gold.find((g) => String(g.karat) === String(karat));
  return item ? item.pricePerGram : null;
}

// ---------------------------------------------------------------------------
// تحديث النتائج
// ---------------------------------------------------------------------------
function updateGoldResult({ announceChange = false } = {}) {
  const karat = el.goldKaratSelect.value;
  el.goldKaratOut.textContent = karat;
  const price = getGoldGram(karat);
  el.goldPrice.textContent = formatPrice(price);
  if (announceChange) announce(`الذهب عيار ${karat}: ${formatPrice(price)} للجرام.`);
}

function updateSilverResult({ announceChange = false } = {}) {
  const purity = el.silverSelect.value;
  el.silverPurityOut.textContent = purity === '999' ? '999 (نقي)' : purity;
  const item = state.prices
    ? state.prices.silver.find((s) => String(s.purity) === String(purity))
    : null;
  const price = item ? item.pricePerGram : null;
  el.silverPrice.textContent = formatPrice(price);
  if (announceChange) announce(`الفضة ${purity}: ${formatPrice(price)} للجرام.`);
}

function updatePoundResult({ announceChange = false } = {}) {
  const denom = GOLD_POUND_DENOMINATIONS.find((d) => d.value === el.poundDenomSelect.value)
    || GOLD_POUND_DENOMINATIONS[0];
  const karat = el.poundKaratSelect.value;
  const gramPrice = getGoldGram(karat);
  const total = gramPrice != null ? gramPrice * denom.grams : null;

  el.poundResultLabel.textContent = `سعر ${denom.label} (${denom.grams} جرام) عيار ${karat}`;
  el.poundPrice.textContent = formatPrice(total);
  el.poundMeta.textContent = gramPrice != null
    ? `يُحسب حسب سعر الجرام عيار ${karat} × ${denom.grams} جرام. المصدر: تحديث حي من السوق العالمي.`
    : 'المصدر: تحديث حي من السوق العالمي.';

  if (announceChange) announce(`${denom.label} عيار ${karat}: ${formatPrice(total)}.`);
}

function updateCurrencyResult({ announceChange = false } = {}) {
  const code = el.currencySelect.value;
  const item = state.prices ? state.prices.currencies.find((c) => c.code === code) : null;
  el.currencyNameOut.textContent = item ? `${item.flag} ${item.nameAr} (${item.code})` : code;
  el.currencyBuyOut.textContent = formatPrice(item ? item.buyEgp : null);
  el.currencySellOut.textContent = formatPrice(item ? item.sellEgp : null);
  if (announceChange && item) {
    announce(`${item.nameAr}: الشراء ${formatPrice(item.buyEgp)}، البيع ${formatPrice(item.sellEgp)}.`);
  }
}

function refreshAllResults(options = {}) {
  if (!state.prices) return;
  updateGoldResult(options);
  updateSilverResult(options);
  updatePoundResult(options);
  updateCurrencyResult(options);
}

// ---------------------------------------------------------------------------
// تعبئة عناصر الاختيار
// ---------------------------------------------------------------------------
function populateControls(prices) {
  const karats = prices.gold
    .map((g) => g.karat)
    .sort((a, b) => b - a)
    .map((k) => ({ value: k, label: `عيار ${k}` }));
  fillSelect(el.goldKaratSelect, karats);
  if (karats.some((k) => String(k.value) === '21')) el.goldKaratSelect.value = '21';

  const purities = prices.silver
    .map((s) => s.purity)
    .sort((a, b) => b - a)
    .map((p) => ({ value: p, label: p === 999 ? 'فضة 999 (نقي)' : `فضة ${p}` }));
  fillSelect(el.silverSelect, purities);

  fillSelect(el.poundDenomSelect,
    GOLD_POUND_DENOMINATIONS.map((d) => ({ value: d.value, label: `${d.label} (${d.grams} جرام)` })));

  fillSelect(el.poundKaratSelect, karats);
  if (karats.some((k) => String(k.value) === '21')) el.poundKaratSelect.value = '21';

  fillSelect(el.currencySelect,
    prices.currencies.map((c) => ({ value: c.code, label: `${c.flag} ${c.nameAr} (${c.code})` })));
}

// ---------------------------------------------------------------------------
// شريط الحالة
// ---------------------------------------------------------------------------
function renderStatus(data) {
  const isLive = data.source === 'live';
  el.sourceBadge.textContent = isLive
    ? 'مصدر السعر: تحديث حي من السوق والبنوك'
    : 'مصدر السعر: بيانات احتياطية (تعذّر الاتصال مؤقتًا)';
  el.sourceBadge.classList.toggle('badge-live', isLive);
  el.sourceBadge.classList.toggle('badge-fallback', !isLive);
  el.updatedAt.textContent = 'آخر تحديث: ' + formatTime(data.updatedAt);
}

function buildSummary(data) {
  const gold21 = data.gold.find((g) => g.karat === 21) || data.gold[0];
  const usd = data.currencies.find((c) => c.code === 'USD');
  const parts = ['تم تحديث الأسعار.'];
  if (gold21) parts.push(`الذهب عيار ${gold21.karat}: ${formatPrice(gold21.pricePerGram)} للجرام.`);
  if (data.silver[0]) parts.push(`الفضة: ${formatPrice(data.silver[0].pricePerGram)} للجرام.`);
  if (usd && usd.sellEgp) parts.push(`الدولار: ${formatPrice(usd.sellEgp)}.`);
  if (data.source !== 'live') parts.push('تنبيه: بعض البيانات احتياطية.');
  return parts.join(' ');
}

function applyPrices(data) {
  state.prices = data;
  populateControls(data);
  renderStatus(data);
  refreshAllResults({ announceChange: false });
}

// ---------------------------------------------------------------------------
// جلب الأسعار
// ---------------------------------------------------------------------------
async function loadPrices() {
  try {
    const data = await window.api.getPrices();
    if (data) applyPrices(data);
  } catch {
    announce('تعذّر تحديث الأسعار. حاول مرة أخرى.');
  }
}

async function refreshNow() {
  el.btnRefresh.disabled = true;
  announce('جارٍ تحديث الأسعار…');
  try {
    const data = await window.api.refreshPrices();
    if (data) { applyPrices(data); announce(buildSummary(data)); }
  } catch {
    announce('فشل تحديث الأسعار. تحقق من اتصال الإنترنت.');
  } finally {
    el.btnRefresh.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// التبويبات
// ---------------------------------------------------------------------------
function selectTab(index, { focus = false } = {}) {
  el.tabs.forEach((tab, i) => {
    const selected = i === index;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  el.panels.forEach((panel, i) => { panel.hidden = i !== index; });
  if (focus) el.tabs[index].focus();
}

function setupTabs() {
  el.tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(index));
    tab.addEventListener('keydown', (event) => {
      const isRtl = document.documentElement.dir === 'rtl';
      let target = null;
      if (event.key === 'ArrowLeft') target = isRtl ? index + 1 : index - 1;
      else if (event.key === 'ArrowRight') target = isRtl ? index - 1 : index + 1;
      else if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = el.tabs.length - 1;
      if (target !== null) {
        event.preventDefault();
        selectTab((target + el.tabs.length) % el.tabs.length, { focus: true });
      }
    });
  });
}

function openTabById(tabId) {
  const index = el.tabs.findIndex((t) => t.id === tabId);
  if (index >= 0) {
    selectTab(index, { focus: true });
    el.panels[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    announce(el.tabs[index].textContent.trim() + ' — تم فتح التبويب.');
  }
}

// ---------------------------------------------------------------------------
// الإعدادات
// ---------------------------------------------------------------------------
function applyTheme(theme) {
  Array.from(document.body.classList)
    .filter((c) => c.startsWith('theme-'))
    .forEach((c) => document.body.classList.remove(c));
  document.body.classList.add('theme-' + theme);
}

function applyFontSize(fontSize) {
  document.documentElement.style.fontSize = (FONT_SIZES[fontSize] || FONT_SIZES.medium) + 'px';
}

function syncSettingsInputs() {
  const themeInput = document.querySelector(`input[name="theme"][value="${state.settings.theme}"]`);
  if (themeInput) themeInput.checked = true;
  const fontInput = document.querySelector(`input[name="fontSize"][value="${state.settings.fontSize}"]`);
  if (fontInput) fontInput.checked = true;
}

async function persistSettings(partial, applyFn) {
  state.settings = await window.api.setSettings(partial);
  if (applyFn) applyFn();
}

function setupSettingsControls() {
  document.querySelectorAll('input[name="theme"]').forEach((input) => {
    input.addEventListener('change', async () => {
      if (!input.checked) return;
      await persistSettings({ theme: input.value }, () => applyTheme(input.value));
      announce('تم تغيير لون النافذة إلى ' + (THEME_LABELS[input.value] || input.value) + '.');
    });
  });

  document.querySelectorAll('input[name="fontSize"]').forEach((input) => {
    input.addEventListener('change', async () => {
      if (!input.checked) return;
      await persistSettings({ fontSize: input.value }, () => applyFontSize(input.value));
      announce('تم تغيير حجم الخط.');
    });
  });
}

// ---------------------------------------------------------------------------
// النوافذ المنبثقة
// ---------------------------------------------------------------------------
let lastFocusedBeforeDialog = null;
let activeOverlay = null;

function getFocusable(container) {
  return Array.from(container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )).filter((node) => !node.disabled && node.offsetParent !== null);
}

function openOverlay(overlay) {
  lastFocusedBeforeDialog = document.activeElement;
  overlay.hidden = false;
  activeOverlay = overlay;
  const focusables = getFocusable(overlay.querySelector('[role="dialog"]'));
  if (focusables.length) focusables[0].focus();
}

function closeOverlay() {
  if (!activeOverlay) return;
  activeOverlay.hidden = true;
  activeOverlay = null;
  if (lastFocusedBeforeDialog) lastFocusedBeforeDialog.focus();
}

function trapFocus(event) {
  if (!activeOverlay) return;
  const focusables = getFocusable(activeOverlay.querySelector('[role="dialog"]'));
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

// ---------------------------------------------------------------------------
// التحديث التلقائي والتباين العالي
// ---------------------------------------------------------------------------
function renderAutoButton(enabled) {
  el.btnAuto.setAttribute('aria-pressed', String(enabled));
  el.btnAuto.textContent = '';
  el.btnAuto.append(
    document.createTextNode(enabled ? 'التحديث التلقائي: مُفعّل ' : 'التحديث التلقائي: مُتوقف '),
    Object.assign(document.createElement('span'), {
      className: 'kbd-hint', textContent: '(Alt+A)', ariaHidden: 'true'
    })
  );
}

async function toggleAutoRefresh() {
  const next = !state.settings.autoRefresh;
  await persistSettings({ autoRefresh: next }, () => renderAutoButton(next));
  announce(next ? 'تم تفعيل التحديث التلقائي.' : 'تم إيقاف التحديث التلقائي.');
}

async function toggleHighContrast() {
  const nextTheme = state.settings.theme === 'high-contrast' ? 'light' : 'high-contrast';
  await persistSettings({ theme: nextTheme }, () => {
    applyTheme(nextTheme);
    syncSettingsInputs();
  });
  announce(nextTheme === 'high-contrast' ? 'تم تفعيل وضع التباين العالي.' : 'تم إيقاف وضع التباين العالي.');
}

// ---------------------------------------------------------------------------
// الاختصارات والأزرار
// ---------------------------------------------------------------------------
function setupShortcuts() {
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && activeOverlay) { event.preventDefault(); closeOverlay(); return; }
    if (event.key === 'Tab' && activeOverlay) { trapFocus(event); return; }
    if (!event.altKey) return;

    switch (event.key.toLowerCase()) {
      case 'g': event.preventDefault(); openTabById('tab-gold'); break;
      case 's': event.preventDefault(); openTabById('tab-silver'); break;
      case 'j': event.preventDefault(); openTabById('tab-pound'); break;
      case 'c': event.preventDefault(); openTabById('tab-currencies'); break;
      case 'r': event.preventDefault(); refreshNow(); break;
      case 'a': event.preventDefault(); toggleAutoRefresh(); break;
      case 'p': event.preventDefault(); openOverlay(el.settingsOverlay); break;
      case 'k': event.preventDefault(); openOverlay(el.helpOverlay); break;
      case 'h': event.preventDefault(); toggleHighContrast(); break;
      default: break;
    }
  });
}

function setupButtons() {
  el.btnRefresh.addEventListener('click', refreshNow);
  el.btnAuto.addEventListener('click', toggleAutoRefresh);
  el.btnSettings.addEventListener('click', () => openOverlay(el.settingsOverlay));
  el.btnHelp.addEventListener('click', () => openOverlay(el.helpOverlay));
  el.btnCloseSettings.addEventListener('click', closeOverlay);
  el.btnCloseHelp.addEventListener('click', closeOverlay);

  [el.settingsOverlay, el.helpOverlay].forEach((overlay) => {
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeOverlay();
    });
  });
}

function setupSelectionEvents() {
  el.goldKaratSelect.addEventListener('change', () => updateGoldResult({ announceChange: true }));
  el.silverSelect.addEventListener('change', () => updateSilverResult({ announceChange: true }));
  el.poundDenomSelect.addEventListener('change', () => updatePoundResult({ announceChange: true }));
  el.poundKaratSelect.addEventListener('change', () => updatePoundResult({ announceChange: true }));
  el.currencySelect.addEventListener('change', () => updateCurrencyResult({ announceChange: true }));
}

// ---------------------------------------------------------------------------
// التهيئة
// ---------------------------------------------------------------------------
async function init() {
  state.settings = await window.api.getSettings();
  applyTheme(state.settings.theme || 'light');
  applyFontSize(state.settings.fontSize || 'medium');
  renderAutoButton(state.settings.autoRefresh !== false);
  syncSettingsInputs();

  setupTabs();
  setupSettingsControls();
  setupButtons();
  setupShortcuts();
  setupSelectionEvents();

  selectTab(0);

  window.api.onPricesUpdate((data) => { applyPrices(data); });
  window.api.onPricesError((message) => { announce('تعذّر جلب الأسعار: ' + message); });

  await loadPrices();
  announce('تم فتح التطبيق. استخدم Alt ثم G للذهب، S للفضة، J لجنيه الذهب، C للعملات، أو Alt+K للمساعدة.');
}

window.addEventListener('DOMContentLoaded', init);
