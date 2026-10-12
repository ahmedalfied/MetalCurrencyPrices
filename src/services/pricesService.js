/**
 * services/pricesService.js
 * خدمة جلب أسعار المعادن (الذهب والفضة) والعملات الأجنبية مقابل الجنيه المصري.
 *
 * مصادر البيانات:
 *  - المعادن: https://api.gold-api.com  (مجاني، بدون مفتاح، سعر الأونصة بالدولار)
 *  - العملات: https://open.er-api.com  (مجاني، بدون مفتاح، أسعار صرف دولية)
 *
 * عند فشل الاتصال بالإنترنت تعود الخدمة إلى بيانات احتياطية (fallback).
 */

const axios = require('axios');

// عدد الجرامات في الأونصة الواحدة (Troy Ounce)
const GRAMS_PER_TROY_OUNCE = 31.1034768;

// أعيرة الذهب المدعومة
const GOLD_KARATS = [24, 22, 21, 18, 14, 12, 10, 9, 8];

// العملات الأجنبية المطلوبة مقابل الجنيه المصري
const FOREIGN_CURRENCIES = [
  { code: 'USD', nameAr: 'الدولار الأمريكي', flag: '🇺🇸' },
  { code: 'EUR', nameAr: 'اليورو', flag: '🇪🇺' },
  { code: 'GBP', nameAr: 'الجنيه الإسترليني', flag: '🇬🇧' },
  { code: 'SAR', nameAr: 'الريال السعودي', flag: '🇸🇦' },
  { code: 'AED', nameAr: 'الدرهم الإماراتي', flag: '🇦🇪' },
  { code: 'KWD', nameAr: 'الدينار الكويتي', flag: '🇰🇼' },
  { code: 'QAR', nameAr: 'الريال القطري', flag: '🇶🇦' },
  { code: 'JOD', nameAr: 'الدينار الأردني', flag: '🇯🇴' },
  { code: 'CHF', nameAr: 'الفرنك السويسري', flag: '🇨🇭' }
];

const REQUEST_TIMEOUT = 12000;

// بيانات احتياطية تقديرية عند تعذّر الاتصال
const FALLBACK = {
  goldUsdPerOunce: 2650,
  silverUsdPerOunce: 31,
  usdToEgp: 48.5,
  ratesPerEgp: {
    USD: 0.0206, EUR: 0.0191, GBP: 0.0162, SAR: 0.0773, AED: 0.0757,
    KWD: 0.00634, QAR: 0.0751, JOD: 0.0146, CHF: 0.0181
  }
};

/** طلب HTTP عبر axios مع مهلة زمنية. */
async function fetchJson(url) {
  const response = await axios.get(url, {
    timeout: REQUEST_TIMEOUT,
    headers: { 'User-Agent': 'MetalCurrencyPrices/1.0' }
  });
  return response.data;
}

/** جلب سعر أونصة معدن بالدولار. */
async function fetchMetalUsdPerOunce(symbol) {
  const data = await fetchJson(`https://api.gold-api.com/price/${symbol}`);
  const price = Number(data && data.price);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`سعر غير صالح للمعدن ${symbol}`);
  }
  return price;
}

/** جلب أسعار الصرف مقابل الجنيه المصري (1 EGP = rates[CODE]). */
async function fetchEgpRates() {
  const data = await fetchJson('https://open.er-api.com/v6/latest/EGP');
  if (!data || data.result !== 'success' || !data.rates) {
    throw new Error('تعذّر جلب أسعار الصرف');
  }
  const ratesPerEgp = {};
  let usdToEgp = null;
  for (const { code } of FOREIGN_CURRENCIES) {
    const rate = Number(data.rates[code]);
    if (Number.isFinite(rate) && rate > 0) {
      ratesPerEgp[code] = rate;
      if (code === 'USD') usdToEgp = 1 / rate;
    }
  }
  if (!usdToEgp) throw new Error('تعذّر تحديد سعر الدولار مقابل الجنيه');
  return { usdToEgp, ratesPerEgp };
}

/** حساب سعر جرام الذهب بالجنيه المصري لكل عيار. */
function computeGoldPerGram(goldUsdPerOunce, usdToEgp) {
  const pureGramEgp = (goldUsdPerOunce / GRAMS_PER_TROY_OUNCE) * usdToEgp;
  return GOLD_KARATS.map((karat) => ({
    karat,
    pricePerGram: pureGramEgp * (karat / 24)
  }));
}

/** حساب سعر جرام الفضة بالجنيه المصري حسب النقاء. */
function computeSilverPerGram(silverUsdPerOunce, usdToEgp) {
  const pureGramEgp = (silverUsdPerOunce / GRAMS_PER_TROY_OUNCE) * usdToEgp;
  return [
    { purity: 999, pricePerGram: pureGramEgp },
    { purity: 925, pricePerGram: pureGramEgp * 0.925 },
    { purity: 900, pricePerGram: pureGramEgp * 0.9 }
  ];
}

/** حساب سعر العملة الواحدة مقابل الجنيه (1 CODE = X EGP). */
function computeCurrencyPrices(ratesPerEgp) {
  return FOREIGN_CURRENCIES.map(({ code, nameAr, flag }) => {
    const rate = ratesPerEgp[code];
    const mid = Number.isFinite(rate) && rate > 0 ? 1 / rate : null;
    const spread = mid ? mid * 0.005 : 0;
    return {
      code, nameAr, flag,
      buyEgp: mid ? mid - spread : null,
      sellEgp: mid ? mid + spread : null
    };
  });
}

/** الدالة الرئيسية: جلب كل الأسعار وبناء كائن موحّد. */
async function getAllPrices() {
  const errors = [];
  let goldUsdPerOunce = FALLBACK.goldUsdPerOunce;
  let silverUsdPerOunce = FALLBACK.silverUsdPerOunce;
  let usdToEgp = FALLBACK.usdToEgp;
  let ratesPerEgp = FALLBACK.ratesPerEgp;
  let source = 'live';

  const [goldResult, silverResult, fxResult] = await Promise.allSettled([
    fetchMetalUsdPerOunce('XAU'),
    fetchMetalUsdPerOunce('XAG'),
    fetchEgpRates()
  ]);

  if (goldResult.status === 'fulfilled') goldUsdPerOunce = goldResult.value;
  else errors.push('gold: ' + goldResult.reason.message);

  if (silverResult.status === 'fulfilled') silverUsdPerOunce = silverResult.value;
  else errors.push('silver: ' + silverResult.reason.message);

  if (fxResult.status === 'fulfilled') {
    usdToEgp = fxResult.value.usdToEgp;
    ratesPerEgp = fxResult.value.ratesPerEgp;
  } else {
    errors.push('fx: ' + fxResult.reason.message);
  }

  if (errors.length > 0) source = 'fallback';

  return {
    source,
    errors,
    updatedAt: new Date().toISOString(),
    goldUsdPerOunce,
    silverUsdPerOunce,
    usdToEgp,
    gold: computeGoldPerGram(goldUsdPerOunce, usdToEgp),
    silver: computeSilverPerGram(silverUsdPerOunce, usdToEgp),
    currencies: computeCurrencyPrices(ratesPerEgp)
  };
}

module.exports = { getAllPrices, GOLD_KARATS, FOREIGN_CURRENCIES };
