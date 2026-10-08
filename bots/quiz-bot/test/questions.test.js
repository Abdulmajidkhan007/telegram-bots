'use strict';
// Repo'dagi BARCHA savol fayllari Telegram quiz poll chegaralariga sig'adimi.
// Chegaradan oshgan savolni Telegram rad etadi va test o'rtada to'xtab qoladi.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'questions');
// format.pollText savolga "❓ 100/100  •  " (18 belgi) qo'shadi; Telegram: savol ≤ 300, variant ≤ 100.
// Bo'lim nomi sig'masa qisqaradi, lekin savolning o'zi butun qolishi kerak.
const MAX_Q = 300 - 18 - 1;
const MAX_OPT = 100;
const KEY_RE = /^[a-z0-9-]{1,30}$/;

function files() {
  const out = [];
  for (const dir of fs.readdirSync(ROOT)) {
    const d = path.join(ROOT, dir);
    if (!fs.statSync(d).isDirectory()) continue;
    for (const f of fs.readdirSync(d)) if (f.endsWith('.json')) out.push(path.join(d, f));
  }
  return out;
}

test("savol fayllari: tuzilma, Telegram chegaralari, takrorlar", () => {
  const seenKeys = new Set();
  const dirMeta = {};
  let total = 0;
  for (const file of files()) {
    const rel = path.relative(ROOT, file);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const dir = path.basename(path.dirname(file));
    assert.strictEqual(data.direction, dir, `${rel}: direction papka nomiga mos emas`);
    assert.strictEqual(data.key, path.basename(file, '.json'), `${rel}: key fayl nomiga mos emas`);
    assert.ok(KEY_RE.test(data.key) && KEY_RE.test(dir), `${rel}: key faqat a-z 0-9 - (callback_data uchun)`);
    // Eng uzun callback: handlers.js dagi "tm:<dir>:<sub>:<soni>:<soniya>" — Telegram chegarasi 64 bayt.
    // Soni "✍️ Boshqa son" orqali 100 gacha (3 xona).
    assert.ok(Buffer.byteLength(`tm:${dir}:${data.key}:100:60`) <= 64, `${rel}: kalitlar juda uzun (callback_data > 64)`);
    assert.ok(!seenKeys.has(`${dir}/${data.key}`));
    seenKeys.add(`${dir}/${data.key}`);
    // Bitta yo'nalishdagi fayllar bir xil nom/emoji bersin — aks holda menyu tasodifiy birini oladi.
    const meta = `${data.directionLabel}|${data.directionEmoji || ''}|${data.directionOrder ?? ''}`;
    if (dirMeta[dir] && data.directionEmoji) assert.strictEqual(dirMeta[dir], meta, `${rel}: yo'nalish ma'lumoti boshqa fayldan farq qiladi`);
    if (data.directionEmoji) dirMeta[dir] = meta;

    const seenQ = new Set();
    data.questions.forEach((q, i) => {
      const at = `${rel} #${i + 1}`;
      assert.ok(typeof q.q === 'string' && q.q.trim(), `${at}: savol matni yo'q`);
      assert.ok(q.q.length <= MAX_Q, `${at}: savol ${q.q.length} belgi (> ${MAX_Q})`);
      assert.ok(Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 10, `${at}: variantlar soni`);
      for (const o of q.options) {
        assert.ok(typeof o === 'string' && o.trim(), `${at}: bo'sh variant`);
        assert.ok(o.length <= MAX_OPT, `${at}: variant ${o.length} belgi: ${o}`);
      }
      assert.strictEqual(new Set(q.options.map(o => o.trim().toLowerCase())).size, q.options.length, `${at}: takroriy variant`);
      assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length, `${at}: correct indeksi`);
      if (q.explanation) assert.ok(q.explanation.length <= 200, `${at}: izoh > 200`);
      const norm = q.q.trim().toLowerCase();
      assert.ok(!seenQ.has(norm), `${at}: takroriy savol`);
      seenQ.add(norm);
      total++;
    });
  }
  assert.ok(total > 0);
});
