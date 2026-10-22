'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { TEMPLATES, SAFETY_RULES, buildTemplate } = require('../src/templates');
const { FREE_STEPS, PAID_PAGES } = require('../src/guide-text');
const { escapeHtml, TG_LIMIT } = require('../src/format');
const { parseCallback } = require('../src/router');

test('har shablonda xavfsizlik qoidalari bor: avtomatik javob, pul, tibbiy, va’da, odamga uzatish', () => {
  assert.ok(TEMPLATES.length >= 6);
  for (const t of TEMPLATES) {
    const text = buildTemplate(t);
    assert.match(text, /avtomatik javob/i, t.key);
    assert.match(text, /PUL, XAYRIYA/, t.key);
    assert.match(text, /TIBBIY/, t.key);
    assert.match(text, /VA'DA BERMA/, t.key);
    assert.match(text, /odamga uzat/i, t.key);
    for (const r of SAFETY_RULES) assert.ok(text.includes(r), `${t.key}: qoida tushib qolgan`);
  }
});

test('xabarlar Telegram chegarasiga (4096) sig‘adi — HTML bo‘linmaydi', () => {
  for (const t of TEMPLATES) {
    const msg = `${t.title}\n\n<pre>${escapeHtml(buildTemplate(t))}</pre>`;
    assert.ok(msg.length < TG_LIMIT - 100, `${t.key}: ${msg.length}`);
  }
  for (const s of [...FREE_STEPS, ...PAID_PAGES]) assert.ok(s.length < TG_LIMIT);
  assert.strictEqual(FREE_STEPS.length, 3);
});

test('shablon kalitlari takrorlanmaydi', () => {
  const keys = TEMPLATES.map((t) => t.key);
  assert.strictEqual(new Set(keys).size, keys.length);
});

test('parseCallback: to‘g‘rilarini taniydi, noto‘g‘ri/zararlisini rad etadi', () => {
  assert.deepStrictEqual(parseCallback('free:2'), { type: 'free', index: 2 });
  assert.deepStrictEqual(parseCallback('pay:ok:15'), { type: 'pay', approve: true, id: 15 });
  assert.deepStrictEqual(parseCallback('tpl:shop'), { type: 'tpl', key: 'shop' });
  assert.deepStrictEqual(parseCallback('adm:price:monthly'), { type: 'adminPrice', key: 'monthly' });
  for (const bad of ['tpl:../etc', 'tpl:yoq', 'pay:ok:1;2', 'adm:price:xyz', 'free:-1', 'free:999', '', null, 'x'.repeat(80)]) {
    assert.strictEqual(parseCallback(bad), null, String(bad));
  }
});
