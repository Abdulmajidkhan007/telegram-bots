import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

// Bot shaxsiy chatda beradigan bir martalik dashboard havolasi uchun token.
// Telegram Login Widget'ga muqobil: widget BotFather'dagi domen sozlamasiga
// bog'liq, bu esa yo'q. Bot imzolaydi, API tekshiradi — ikkalasida ham bir xil
// BOT_TOKEN bor, shuning uchun alohida sir kerak emas.
// Toza funksiyalar (I/O yo'q) — bazasiz test qilinadi.

export const LOGIN_LINK_TTL_SECONDS = 10 * 60;

export interface LoginLinkUser {
  id: string;
  firstName: string;
  username?: string;
}

interface Payload {
  v: 1;
  tid: string;
  fn: string;
  un?: string;
  exp: number;
  n: string;
}

// Kalit BOT_TOKEN ning o'zi emas, undan "countlist-login-link" yorlig'i bilan
// olingan alohida kalit: shu token boshqa joyda (Telegram widget imzosi kabi)
// ishlatilsa ham imzolar bir-biriga aralashmasin.
function key(botToken: string): Buffer {
  return createHmac('sha256', 'countlist-login-link').update(botToken).digest();
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

export function signLoginLink(
  user: LoginLinkUser,
  botToken: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): string {
  const payload: Payload = {
    v: 1,
    tid: user.id,
    fn: user.firstName,
    un: user.username,
    exp: nowSeconds + LOGIN_LINK_TTL_SECONDS,
    n: b64url(randomBytes(9)),
  };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(createHmac('sha256', key(botToken)).update(body).digest());
  return `${body}.${sig}`;
}

export type LoginLinkResult =
  | { ok: true; user: LoginLinkUser }
  | { ok: false; reason: string };

export function verifyLoginLink(
  token: unknown,
  botToken: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): LoginLinkResult {
  if (typeof token !== 'string' || token.length > 2048) return { ok: false, reason: "Havola noto'g'ri" };
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: "Havola noto'g'ri" };

  const expected = createHmac('sha256', key(botToken)).update(parts[0]).digest();
  const given = fromB64url(parts[1]);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: 'Havola imzosi mos kelmadi' };
  }

  let p: Payload;
  try {
    p = JSON.parse(fromB64url(parts[0]).toString('utf8'));
  } catch (err) {
    // Imzo to'g'ri, lekin ichi o'qilmadi — bu faqat kod xatosida bo'ladi.
    return { ok: false, reason: `Havola ichi o'qilmadi: ${(err as Error).message}` };
  }
  if (p.v !== 1 || typeof p.tid !== 'string' || !/^\d+$/.test(p.tid)) {
    return { ok: false, reason: "Havola noto'g'ri" };
  }
  if (typeof p.exp !== 'number' || nowSeconds > p.exp) {
    return { ok: false, reason: "Havola eskirgan — botga /login yozib yangisini oling" };
  }

  return { ok: true, user: { id: p.tid, firstName: p.fn || '', username: p.un || undefined } };
}
