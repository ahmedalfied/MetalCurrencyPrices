/**
 * main.js
 * عملية Electron الرئيسية (Main Process).
 *
 * المسؤوليات:
 *  - إنشاء نافذة التطبيق وإظهارها بشكل صحيح (بدون شاشة سوداء).
 *  - جلب الأسعار وتحديثها دوريًا.
 *  - تمرير الأسعار إلى الواجهة عبر قنوات IPC آمنة.
 *  - حفظ الإعدادات محليًا.
 */

const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const pricesService = require('./src/services/pricesService');

// ---------------------------------------------------------------------------
// الإعدادات (تُحفظ في مجلد بيانات المستخدم)
// ---------------------------------------------------------------------------
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');

const DEFAULT_SETTINGS = {
  theme: 'light',
  fontSize: 'medium',
  refreshIntervalSec: 60,
  autoRefresh: true
};

const DARK_THEMES = ['dark', 'blue', 'high-contrast'];

function loadSettings() {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch (err) {
    console.error('تعذّر حفظ الإعدادات:', err.message);
  }
}

// ---------------------------------------------------------------------------
// متغيرات عامة
// ---------------------------------------------------------------------------
let mainWindow = null;
let settings = DEFAULT_SETTINGS;
let refreshTimer = null;
let lastPrices = null;
let isFetching = false;

// ---------------------------------------------------------------------------
// إنشاء النافذة
// ---------------------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 820,
    minWidth: 720,
    minHeight: 600,
    // لون خلفية مبدئي فاتح/داكن حسب الثيم لمنع وميض أسود أثناء التحميل
    backgroundColor: DARK_THEMES.includes(settings.theme) ? '#12151c' : '#f4f6fb',
    title: 'أسعار المعادن والعملات مقابل الجنيه المصري',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // إظهار النافذة فقط بعد أن يصبح المحتوى جاهزًا للعرض (يمنع الشاشة السوداء)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ---------------------------------------------------------------------------
// جلب الأسعار وبثّها
// ---------------------------------------------------------------------------
async function refreshPrices() {
  if (isFetching) return lastPrices;
  isFetching = true;
  try {
    const data = await pricesService.getAllPrices();
    lastPrices = data;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('prices:update', data);
    }
    return data;
  } catch (err) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('prices:error', err.message);
    }
    return lastPrices;
  } finally {
    isFetching = false;
  }
}

function restartTimer() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = null;
  if (settings.autoRefresh && settings.refreshIntervalSec > 0) {
    refreshTimer = setInterval(() => refreshPrices(), settings.refreshIntervalSec * 1000);
  }
}

function applyTheme() {
  nativeTheme.themeSource = DARK_THEMES.includes(settings.theme) ? 'dark' : 'light';
}

// ---------------------------------------------------------------------------
// قنوات IPC
// ---------------------------------------------------------------------------
ipcMain.handle('prices:get', async () => lastPrices || refreshPrices());
ipcMain.handle('prices:refresh', async () => refreshPrices());
ipcMain.handle('settings:get', () => settings);
ipcMain.handle('settings:set', (_event, partial) => {
  settings = { ...settings, ...partial };
  saveSettings(settings);
  applyTheme();
  restartTimer();
  return settings;
});

// ---------------------------------------------------------------------------
// دورة حياة التطبيق
// ---------------------------------------------------------------------------
app.whenReady().then(() => {
  settings = loadSettings();
  applyTheme();
  createWindow();

  refreshPrices();
  restartTimer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (refreshTimer) clearInterval(refreshTimer);
  if (process.platform !== 'darwin') app.quit();
});
