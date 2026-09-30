import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../../../.env') });

// Repo public: .env.example dagi namuna va kod ichidagi zaxira qiymatlar
// hammaga ma'lum. Production'da ular bilan imzolangan tokenni istalgan
// odam o'zi yasay oladi — shuning uchun bunday kalit bilan ishga tushmaymiz.
const PUBLIC_SECRETS = new Set([
  'fallback_secret_change_this',
  'fallback_refresh_secret',
  'your_super_secret_jwt_key_here',
  'your_super_secret_refresh_key_here',
]);

function secret(key: string, devFallback: string): string {
  const val = process.env[key];
  if (process.env.NODE_ENV === 'production' && (!val || PUBLIC_SECRETS.has(val))) {
    throw new Error(
      `${key} o'rnatilmagan yoki namuna qiymatda. Production'da tasodifiy uzun qiymat qo'ying ` +
      `(masalan: openssl rand -hex 32).`,
    );
  }
  return val || devFallback;
}

export const configuration = () => ({
  port: parseInt(process.env.PORT || process.env.API_PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: 300,
  },
  jwt: {
    secret: secret('JWT_SECRET', 'fallback_secret_change_this'),
    refreshSecret: secret('JWT_REFRESH_SECRET', 'fallback_refresh_secret'),
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  bot: {
    token: process.env.BOT_TOKEN,
  },
});

export type AppConfig = ReturnType<typeof configuration>;
