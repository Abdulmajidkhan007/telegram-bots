'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { TEMPLATES, SAFETY_RULES, buildTemplate } = require('../src/templates');
const { FREE_STEPS, PAID_PAGES, IS_PLACEHOLDER } = require('../src/guide-text');
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

test('pullik qo‘llanma haqiqiy matn: namuna emas, faqat ruxsat etilgan HTML teglar', () => {
  assert.strictEqual(IS_PLACEHOLDER, false);
  assert.ok(PAID_PAGES.length >= 4 && PAID_PAGES.length <= 99); // guide:<1-2 raqam>
  for (const [i, page] of PAID_PAGES.entries()) {
    assert.doesNotMatch(page, /NAMUNA|Namuna/, `bo‘lim ${i}`);
    // Telegram HTML: noma'lum teg yoki ochiq qolgan "<" xabarni butunlay rad ettiradi.
    const tags = page.match(/<[^>]*>/g) || [];
    for (const t of tags) assert.match(t, /^<\/?(b|i|code|pre)>$/, `bo‘lim ${i}: ${t}`);
    for (const tag of ['b', 'i', 'code', 'pre']) {
      const open = (page.match(new RegExp(`<${tag}>`, 'g')) || []).length;
      const close = (page.match(new RegExp(`</${tag}>`, 'g')) || []).length;
      assert.strictEqual(open, close, `bo‘lim ${i}: <${tag}> yopilmagan`);
    }
    assert.ok(!/<(?![/a-z])/.test(page), `bo‘lim ${i}: ochiq "<"`);
  }
});
