'use strict';

// Tashqi xizmatlar (Telegram fayl serveri, OpenAI) mock qilinadi — test
// internetga chiqmaydi. Ishga tushirish: npm test (apps/bot ichida).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { transcribeVoice, VoiceError } = require('../dist/services/voice.service');

function mockFetch(whisperStatus, whisperBody) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    if (url.startsWith('https://api.telegram.org/')) {
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    }
    return new Response(whisperBody, { status: whisperStatus });
  };
  return { fn, calls };
}

const FILE_URL = 'https://api.telegram.org/file/botX/voice/file_1.oga';

test("ovoz matnga o'giriladi va Whisper'ga to'g'ri so'rov ketadi", async () => {
  const { fn, calls } = mockFetch(200, JSON.stringify({ text: ' taksi 15000 ' }));
  const text = await transcribeVoice(FILE_URL, 'sk-test', fn);

  assert.equal(text, 'taksi 15000');
  assert.equal(calls.length, 2);
  const whisper = calls[1];
  assert.equal(whisper.url, 'https://api.openai.com/v1/audio/transcriptions');
  assert.equal(whisper.init.headers.Authorization, 'Bearer sk-test');
  assert.equal(whisper.init.body.get('model'), 'whisper-1');
  assert.equal(whisper.init.body.get('language'), 'uz');
});

test("noto'g'ri kalit — foydalanuvchiga sababi aytiladi", async () => {
  const { fn } = mockFetch(401, '{"error":"invalid_api_key"}');
  await assert.rejects(transcribeVoice(FILE_URL, 'bad', fn), (err) => {
    assert.ok(err instanceof VoiceError);
    assert.match(err.userMessage, /OPENAI_API_KEY/);
    assert.match(err.message, /401/);
    return true;
  });
});

test('limit tugagan (429) — alohida xabar', async () => {
  const { fn } = mockFetch(429, 'rate limit');
  await assert.rejects(transcribeVoice(FILE_URL, 'k', fn), (err) => {
    assert.match(err.userMessage, /limiti tugagan/);
    return true;
  });
});

test('Telegram fayli yuklanmasa Whisper chaqirilmaydi', async () => {
  const calls = [];
  const fn = async (url) => { calls.push(url); return new Response('', { status: 404 }); };
  await assert.rejects(transcribeVoice(FILE_URL, 'k', fn), (err) => {
    assert.match(err.userMessage, /yuklab bo'lmadi/);
    return true;
  });
  assert.equal(calls.length, 1);
});
