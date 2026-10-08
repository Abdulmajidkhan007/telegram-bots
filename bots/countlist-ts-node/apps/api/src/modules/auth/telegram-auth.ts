import { createHash, createHmac, timingSafeEqual } from 'crypto';

// Telegram Login Widget ma'lumotini tekshirish.
// Hujjat: https://core.telegram.org/widgets/login#checking-authorization
// Toza funksiya (I/O yo'q) — test bazasiz va internetsiz ishlaydi.

export interface TelegramLoginUser {
  id: string;
  firstName: string;
  lastName?: string;
  username?: string;
}

export type TelegramAuthResult =
  | { ok: true; user: TelegramLoginUser }
  | { ok: false; reason: string };

// Imzo shu vaqtdan eski bo'lsa qabul qilinmaydi: aks holda bir marta
// ushlab qolingan widget javobi bilan istalgan payt qayta kirish mumkin bo'lardi.
export const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

// Server va brauzer soatlari biroz farq qilishi mumkin.
const CLOCK_SKEW_SECONDS = 60;

export function verifyTelegramLogin(
  data: Record<string, unknown>,
  botToken: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): TelegramAuthResult {
  if (!data || typeof data !== 'object') return { ok: false, reason: "Ma'lumot yo'q" };

  const { hash, ...fields } = data;
  if (typeof hash !== 'string' || !/^[0-9a-f]{64}$/.test(hash)) {
    return { ok: false, reason: "Telegram imzosi (hash) yo'q yoki noto'g'ri formatda" };
  }

  // Imzo Telegram yuborgan HAMMA maydonlardan hisoblanadi — shuning uchun
  // bu endpointda DTO-whitelist ishlatilmaydi: yangi maydon qo'shilsa ham
  // u tashlab yuborilmasin, aks holda imzo mos kelmay qoladi.
  const dataCheckString = Object.keys(fields)
    .filter((k) => fields[k] !== undefined && fields[k] !== null)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join('\n');

  const secret = createHash('sha256').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(dataCheckString).digest();
  const given = Buffer.from(hash, 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: "Telegram imzosi mos kelmadi" };
  }

  const authDate = Number(fields.auth_date);
  if (!Number.isInteger(authDate)) return { ok: false, reason: "auth_date noto'g'ri" };
  if (authDate > nowSeconds + CLOCK_SKEW_SECONDS) return { ok: false, reason: 'auth_date kelajakda' };
  if (nowSeconds - authDate > MAX_AUTH_AGE_SECONDS) {
    return { ok: false, reason: "Kirish ma'lumoti eskirgan, qaytadan kiring" };
  }

  const id = String(fields.id ?? '');
  if (!/^\d+$/.test(id)) return { ok: false, reason: "Telegram ID noto'g'ri" };

  return {
    ok: true,
    user: {
      id,
      firstName: String(fields.first_name ?? ''),
      lastName: fields.last_name ? String(fields.last_name) : undefined,
      username: fields.username ? String(fields.username) : undefined,
    },
  };
}

// Telegram Mini App (menyu tugmasi orqali ochilgan web) — initData tekshiruvi.
// Hujjat: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// Widget'dan farqi: kalit = HMAC("WebAppData", token), maydonlar query-string
// ko'rinishida keladi, user esa JSON. BotFather /setdomain talab qilinmaydi.
// Brauzerdagi initDataUnsafe.user ga ISHONILMAYDI — faqat shu imzo tekshiruvi.
export function verifyTelegramWebApp(
  initData: unknown,
  botToken: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): TelegramAuthResult {
  if (typeof initData !== 'string' || !initData || initData.length > 4096) {
    return { ok: false, reason: "initData yo'q yoki noto'g'ri" };
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) {
    return { ok: false, reason: "Telegram imzosi (hash) yo'q yoki noto'g'ri formatda" };
  }
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(dataCheckString).digest();
  const given = Buffer.from(hash, 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: 'Telegram imzosi mos kelmadi' };
  }

  const authDate = Number(params.get('auth_date'));
  if (!Number.isInteger(authDate)) return { ok: false, reason: "auth_date noto'g'ri" };
  if (authDate > nowSeconds + CLOCK_SKEW_SECONDS) return { ok: false, reason: 'auth_date kelajakda' };
  if (nowSeconds - authDate > MAX_AUTH_AGE_SECONDS) {
    return { ok: false, reason: "Kirish ma'lumoti eskirgan, ilovani qayta oching" };
  }

  let user: Record<string, unknown>;
  try {
    user = JSON.parse(params.get('user') || '');
  } catch (e) {
    return { ok: false, reason: `user maydoni JSON emas: ${(e as Error).message}` };
  }
  const id = String(user?.id ?? '');
  if (!/^\d+$/.test(id)) return { ok: false, reason: "Telegram ID noto'g'ri" };

  return {
    ok: true,
    user: {
      id,
      firstName: String(user.first_name ?? ''),
      lastName: user.last_name ? String(user.last_name) : undefined,
      username: user.username ? String(user.username) : undefined,
    },
  };
}
