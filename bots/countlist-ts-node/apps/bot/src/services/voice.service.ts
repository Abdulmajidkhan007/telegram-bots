// Ovozli xabarni matnga o'girish: Google Gemini yoki OpenAI Whisper.
// countlist-python dagi bot/services/voice.py dan ko'chirilgan, Gemini keyin qo'shildi.
// config.ts ni import qilmaydi: kalit parametr bilan keladi, shuning uchun
// servisni BOT_TOKEN/DATABASE_URL siz test qilish mumkin.

const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Ikkala xizmat ham hajmga qarab pul oladi. Uzun ovozli xabar xarajat emas,
// suhbat — uni yuborib pul sarflashning ma'nosi yo'q.
export const MAX_VOICE_SECONDS = 60;

// Gemini butun so'zni yozib yuborsa ("ikki yuz ming") parser uni tanimaydi —
// shuning uchun summani raqam bilan yozishni aniq so'raymiz.
const GEMINI_PROMPT =
  "Bu Telegram guruhidagi ovozli xabar (o'zbek yoki rus tilida). Uni so'zma-so'z matnga o'gir. " +
  "Summalarni raqam bilan yoz: \"200 ming\", \"1,5 mln\", \"45000\". " +
  "Faqat matnning o'zini qaytar, izoh qo'shma.";

export type VoiceProvider =
  | { name: 'gemini'; apiKey: string; model: string }
  | { name: 'openai'; apiKey: string };

/**
 * Qaysi kalit bo'lsa o'shani tanlaydi. Ikkalasi bo'lsa Gemini: u boshqa
 * botlarda ham ishlatiladi va bepul limiti bor. Hech biri bo'lmasa null.
 */
export function pickVoiceProvider(env: {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  OPENAI_API_KEY?: string;
}): VoiceProvider | null {
  if (env.GEMINI_API_KEY) {
    return { name: 'gemini', apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL || 'gemini-2.5-flash' };
  }
  if (env.OPENAI_API_KEY) return { name: 'openai', apiKey: env.OPENAI_API_KEY };
  return null;
}

export class VoiceError extends Error {
  constructor(message: string, readonly userMessage: string) {
    super(message);
    this.name = 'VoiceError';
  }
}

const KEY_NAME = { gemini: 'GEMINI_API_KEY', openai: 'OPENAI_API_KEY' } as const;

async function failure(provider: VoiceProvider, res: Response): Promise<VoiceError> {
  // Javob matnini log uchun olamiz: kalit xatosi va limit tugashini
  // shusiz farqlab bo'lmaydi.
  const body = (await res.text()).slice(0, 300);
  const userMessage = res.status === 401 || res.status === 403
    ? `Ovozni tanish sozlanmagan: ${KEY_NAME[provider.name]} noto'g'ri.`
    : res.status === 429
      ? 'Ovozni tanish limiti tugagan. Keyinroq urinib ko\'ring yoki matn bilan yozing.'
      : 'Ovozni tanish xizmati javob bermadi. Matn bilan yozib yuboring.';
  return new VoiceError(`${provider.name} HTTP ${res.status}: ${body}`, userMessage);
}

export async function transcribeVoice(
  fileUrl: string,
  provider: VoiceProvider,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const audio = await fetchFn(fileUrl);
  if (!audio.ok) {
    throw new VoiceError(
      `Telegram fayl yuklanmadi: HTTP ${audio.status}`,
      "Ovozli xabarni Telegram'dan yuklab bo'lmadi.",
    );
  }
  const bytes = await audio.arrayBuffer();

  if (provider.name === 'gemini') {
    const res = await fetchFn(`${GEMINI_URL}/${provider.model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': provider.apiKey },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: GEMINI_PROMPT },
            { inline_data: { mime_type: 'audio/ogg', data: Buffer.from(bytes).toString('base64') } },
          ],
        }],
      }),
    });
    if (!res.ok) throw await failure(provider, res);

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    // Javob xavfsizlik filtri tufayli bo'sh kelishi mumkin — bu xato emas,
    // shunchaki xarajat topilmaydi.
    const parts = data.candidates?.[0]?.content?.parts || [];
    return parts.map((p) => p.text || '').join('').trim();
  }

  const form = new FormData();
  form.append('file', new Blob([bytes], { type: 'audio/ogg' }), 'voice.ogg');
  form.append('model', 'whisper-1');
  form.append('language', 'uz');

  const res = await fetchFn(WHISPER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${provider.apiKey}` },
    body: form,
  });
  if (!res.ok) throw await failure(provider, res);

  const data = (await res.json()) as { text?: string };
  return (data.text || '').trim();
}
