'use strict';

// Tashqi xizmatlar (Telegram fayl serveri, Gemini, OpenAI) mock qilinadi —
// test internetga chiqmaydi. Ishga tushirish: npm test (apps/bot ichida).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { transcribeVoice, pickVoiceProvider, VoiceError } = require('../dist/services/voice.service');

function mockFetch(apiStatus, apiBody) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    if (url.startsWith('https://api.telegram.org/')) {
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    }
    return new Response(apiBody, { status: apiStatus });
  };
  return { fn, calls };
}

const FILE_URL = 'https://api.telegram.org/file/botX/voice/file_1.oga';
const GEMINI = { name: 'gemini', apiKey: 'g-test', model: 'gemini-2.5-flash' };
const OPENAI = { name: 'openai', apiKey: 'sk-test' };

test('provayder tanlash: Gemini ustun, keyin OpenAI, hech biri — null', () => {
  assert.deepEqual(pickVoiceProvider({ GEMINI_API_KEY: 'g', OPENAI_API_KEY: 'o' }),
    { name: 'gemini', apiKey: 'g', model: 'gemini-2.5-flash' });
  assert.equal(pickVoiceProvider({ GEMINI_API_KEY: 'g', GEMINI_MODEL: 'gemini-3.5-flash' }).model, 'gemini-3.5-flash');
  assert.deepEqual(pickVoiceProvider({ OPENAI_API_KEY: 'o' }), { name: 'openai', apiKey: 'o' });
  assert.equal(pickVoiceProvider({}), null);
  assert.equal(pickVoiceProvider({ GEMINI_API_KEY: '', OPENAI_API_KEY: '' }), null);
});

test("Gemini: audio base64 bilan yuboriladi, javob matni yig'iladi", async () => {
  const body = JSON.stringify({ candidates: [{ content: { parts: [{ text: 'benzin ' }, { text: '200 ming ' }] } }] });
  const { fn, calls } = mockFetch(200, body);
  const text = await transcribeVoice(FILE_URL, GEMINI, fn);

  assert.equal(text, 'benzin 200 ming');
  const req = calls[1];
  assert.equal(req.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
  assert.equal(req.init.headers['x-goog-api-key'], 'g-test');
  const sent = JSON.parse(req.init.body);
  const audio = sent.contents[0].parts[1].inline_data;
  assert.equal(audio.mime_type, 'audio/ogg');
  assert.equal(audio.data, Buffer.from([1, 2, 3]).toString('base64'));
});

test("Gemini: bo'sh javob (filtr) xato emas — bo'sh matn", async () => {
  const { fn } = mockFetch(200, JSON.stringify({ candidates: [] }));
  assert.equal(await transcribeVoice(FILE_URL, GEMINI, fn), '');
});

test("Gemini: noto'g'ri kalit — GEMINI_API_KEY nomi aytiladi", async () => {
  const { fn } = mockFetch(403, '{"error":"API key not valid"}');
  await assert.rejects(transcribeVoice(FILE_URL, GEMINI, fn), (err) => {
    assert.ok(err instanceof VoiceError);
    assert.match(err.userMessage, /GEMINI_API_KEY/);
    assert.match(err.message, /gemini HTTP 403/);
    return true;
  });
});

test("OpenAI: Whisper'ga to'g'ri so'rov ketadi", async () => {
  const { fn, calls } = mockFetch(200, JSON.stringify({ text: ' taksi 15000 ' }));
  assert.equal(await transcribeVoice(FILE_URL, OPENAI, fn), 'taksi 15000');
  const whisper = calls[1];
  assert.equal(whisper.url, 'https://api.openai.com/v1/audio/transcriptions');
  assert.equal(whisper.init.headers.Authorization, 'Bearer sk-test');
  assert.equal(whisper.init.body.get('model'), 'whisper-1');
});

test("OpenAI: noto'g'ri kalit va limit — alohida xabarlar", async () => {
  await assert.rejects(transcribeVoice(FILE_URL, OPENAI, mockFetch(401, 'x').fn),
    (err) => /OPENAI_API_KEY/.test(err.userMessage));
  await assert.rejects(transcribeVoice(FILE_URL, OPENAI, mockFetch(429, 'x').fn),
    (err) => /limiti tugagan/.test(err.userMessage));
});

test('Telegram fayli yuklanmasa API chaqirilmaydi', async () => {
  const calls = [];
  const fn = async (url) => { calls.push(url); return new Response('', { status: 404 }); };
  await assert.rejects(transcribeVoice(FILE_URL, GEMINI, fn), (err) => /yuklab bo'lmadi/.test(err.userMessage));
  assert.equal(calls.length, 1);
});
