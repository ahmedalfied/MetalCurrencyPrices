/**
 * build-installer.mjs
 * يجمّع ملف التثبيت (Installer) من ملف setup.iss باستخدام Inno Setup.
 *
 * يتطلب أن يكون التطبيق قد بُني مسبقًا عبر:  npm run package
 * الناتج:  Output/MetalCurrencyPrices-Setup.exe
 *
 * التشغيل:  node build-installer.mjs
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// البحث عن مجمّع Inno Setup في المسارات الشائعة
const candidates = [
  'C:/Program Files/Inno Setup 7/ISCC.exe',
  'C:/Program Files (x86)/Inno Setup 7/ISCC.exe',
  'C:/Program Files/Inno Setup 6/ISCC.exe',
  'C:/Program Files (x86)/Inno Setup 6/ISCC.exe'
];

const iscc = candidates.find((p) => existsSync(p));

if (!iscc) {
  console.error('[ERROR] لم يتم العثور على مجمّع Inno Setup (ISCC.exe).');
  console.error('        ثبّت Inno Setup من https://jrsoftware.org/isdl.php');
  process.exit(1);
}

const appDir = path.join(__dirname, 'dist', 'MetalCurrencyPrices-win32-x64');
if (!existsSync(appDir)) {
  console.error('[ERROR] لم يُبنَ التطبيق بعد. شغّل أولًا:  npm run package');
  process.exit(1);
}

console.log('[INFO] استخدام المجمّع: ' + iscc);
execFileSync(iscc, [path.join(__dirname, 'setup.iss')], { stdio: 'inherit' });
console.log('[INFO] تم إنشاء المثبّت في مجلد Output.');
