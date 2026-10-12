/**
 * build-package.mjs
 * يبني تطبيق سطح مكتب رسومي (GUI) قابل للتشغيل كملف .exe مستقل.
 *
 * يستخدم @electron/packager لإنتاج مجلد:
 *   dist/MetalCurrencyPrices-win32-x64/MetalCurrencyPrices.exe
 *
 * هذا الناتج هو تطبيق رسومي حقيقي (subsystem: windows) لا يظهر معه أي نافذة
 * سوداء (console) — بخلاف تشغيل ملف .bat.
 *
 * التشغيل:  node build-package.mjs
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { packager } from '@electron/packager';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const appPaths = await packager({
  // المجلد الجذري للمشروع (يحتوي package.json و main.js)
  dir: __dirname,
  // اسم الملف التنفيذي الناتج
  name: 'MetalCurrencyPrices',
  platform: 'win32',
  arch: 'x64',
  // مجلد الإخراج
  out: path.join(__dirname, 'dist'),
  overwrite: true,
  // دمج ملفات التطبيق في أرشيف واحد
  asar: true,
  // استبعاد حزم التطوير من النسخة النهائية
  prune: true,
  // ملفات لا داعي لنسخها داخل التطبيق النهائي
  ignore: [
    /^\/dist($|\/)/,
    /^\/build($|\/)/,
    /^\/Output($|\/)/,
    /^\/\.git($|\/)/,
    /^\/build-package\.mjs$/,
    /^\/setup\.iss$/,
    /^\/start\.bat$/,
    /^\/README\.md$/
  ],
  win32metadata: {
    CompanyName: 'Metal & Currency',
    FileDescription: 'أسعار المعادن والعملات مقابل الجنيه المصري',
    ProductName: 'MetalCurrencyPrices',
    OriginalFilename: 'MetalCurrencyPrices.exe'
  }
});

console.log('تم بناء التطبيق في:');
for (const p of appPaths) console.log('  ' + p);
