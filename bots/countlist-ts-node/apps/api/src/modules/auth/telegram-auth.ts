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
