// Ovozli xabarni matnga o'girish (OpenAI Whisper).
// countlist-python dagi bot/services/voice.py dan ko'chirilgan.
// config.ts ni import qilmaydi: kalit parametr bilan keladi, shuning uchun
// servisni BOT_TOKEN/DATABASE_URL siz test qilish mumkin.

const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';

// Whisper daqiqasiga pul oladi. Uzun ovozli xabar xarajat emas, suhbat —
// uni yuborib pul sarflashning ma'nosi yo'q.
export const MAX_VOICE_SECONDS = 60;

export class VoiceError extends Error {
  constructor(message: string, readonly userMessage: string) {
    super(message);
    this.name = 'VoiceError';
  }
}

export async function transcribeVoice(
  fileUrl: string,
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const audio = await fetchFn(fileUrl);
  if (!audio.ok) {
    throw new VoiceError(
      `Telegram fayl yuklanmadi: HTTP ${audio.status}`,
      "Ovozli xabarni Telegram'dan yuklab bo'lmadi.",
    );
  }

  const form = new FormData();
  form.append('file', new Blob([await audio.arrayBuffer()], { type: 'audio/ogg' }), 'voice.ogg');
  form.append('model', 'whisper-1');
  form.append('language', 'uz');

  const res = await fetchFn(WHISPER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    // Javob matnini log uchun olamiz: 401 (kalit noto'g'ri) va 429 (limit
    // tugagan) ni farqlash shusiz imkonsiz.
    const body = (await res.text()).slice(0, 300);
    const userMessage = res.status === 401
      ? "Ovozni tanish sozlanmagan: OPENAI_API_KEY noto'g'ri."
      : res.status === 429
        ? 'Ovozni tanish limiti tugagan. Keyinroq urinib ko\'ring yoki matn bilan yozing.'
        : 'Ovozni tanish xizmati javob bermadi. Matn bilan yozib yuboring.';
    throw new VoiceError(`Whisper HTTP ${res.status}: ${body}`, userMessage);
  }

  const data = (await res.json()) as { text?: string };
  return (data.text || '').trim();
}
