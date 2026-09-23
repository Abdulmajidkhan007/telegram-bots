'use strict';

// Toza mantiq testlari (tashqi xizmatsiz). Ishga tushirish: npm test
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const { unfilledKeys, validateRegistry, resolveTargets, padWidth } = require('./registry');
const { findFilledEnvSecrets, FORBIDDEN_NAME } = require('./scan-secrets');

const realRegistry = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'bots.json'), 'utf8')
);

function bot(over = {}) {
  return { id: 'a-bot', runtime: 'node', install: [['npm', 'install']], start: [['node', 'i.js']], ...over };
}

test('haqiqiy bots.json tekshiruvdan o\'tadi', () => {
  const bots = validateRegistry(realRegistry);
  assert.ok(bots.length > 0);
});

test('har bir bots.json yozuvi uchun bots/<id> papkasi bor', () => {
  for (const b of realRegistry.bots) {
    const dir = path.join(__dirname, '..', 'bots', b.id);
    assert.ok(fs.existsSync(dir), `bots/${b.id} papkasi yo'q`);
  }
});

test('har bir bot papkasida .env.example bor va .env yo\'q', () => {
  for (const b of realRegistry.bots) {
    const dir = path.join(__dirname, '..', 'bots', b.id);
    assert.ok(fs.existsSync(path.join(dir, '.env.example')), `${b.id}: .env.example yo'q`);
    assert.ok(!fs.existsSync(path.join(dir, '.env')), `${b.id}: .env commit qilingan!`);
  }
});

test('har bir bot papkasida README bor va muallif ko\'rsatilgan', () => {
  for (const b of realRegistry.bots) {
    const readme = path.join(__dirname, '..', 'bots', b.id, 'README.md');
    assert.ok(fs.existsSync(readme), `${b.id}: README.md yo'q`);
    const text = fs.readFileSync(readme, 'utf8');
    assert.ok(text.includes('@Abdulloh_77700'), `${b.id}: README da muallif ko'rsatilmagan`);
  }
});

test('validateRegistry: takrorlangan id ni rad etadi', () => {
  assert.throws(() => validateRegistry({ bots: [bot(), bot()] }), /takrorlangan/);
});

test('validateRegistry: noma\'lum runtime ni rad etadi', () => {
  assert.throws(() => validateRegistry({ bots: [bot({ runtime: 'ruby' })] }), /runtime/);
});

test('validateRegistry: bo\'sh start ni rad etadi', () => {
  assert.throws(() => validateRegistry({ bots: [bot({ start: [] })] }), /start/);
});

test('validateRegistry: noto\'g\'ri shakldagi qadamni rad etadi', () => {
  assert.throws(() => validateRegistry({ bots: [bot({ start: ['node i.js'] })] }), /qadam/);
});

test('validateRegistry: "bots" massivi yo\'qligini rad etadi', () => {
  assert.throws(() => validateRegistry({}), /bots/);
});

test('resolveTargets: id bo\'yicha bitta bot qaytaradi', () => {
  const bots = [bot({ id: 'x' }), bot({ id: 'y' })];
  assert.deepStrictEqual(resolveTargets('y', bots).map((b) => b.id), ['y']);
});

test('resolveTargets: noma\'lum id da tushunarli xato beradi', () => {
  assert.throws(() => resolveTargets('yoq', [bot({ id: 'x' })]), /Mavjudlari: x/);
});

test('resolveTargets: "all" autoStart:false ni o\'tkazib yuboradi', () => {
  const bots = [bot({ id: 'x' }), bot({ id: 'y', autoStart: false })];
  assert.deepStrictEqual(resolveTargets('all', bots).map((b) => b.id), ['x']);
});

test('resolveTargets: includeManual bilan hammasini oladi', () => {
  const bots = [bot({ id: 'x' }), bot({ id: 'y', autoStart: false })];
  assert.strictEqual(resolveTargets('all', bots, { includeManual: true }).length, 2);
});

test('padWidth: eng uzun id uzunligini beradi', () => {
  assert.strictEqual(padWidth([bot({ id: 'ab' }), bot({ id: 'abcd' })]), 4);
});

// --- scan-secrets: regressiya testlari (public repo uchun eng muhim qism) ---

// Skaner O'Z test faylini ham tekshiradi — shuning uchun soxta token
// literal ko'rinishda yozilmaydi, bo'laklardan yig'iladi.
const FAKE_TOKEN = '7712345678' + ':' + 'AAH9kQwErTyUiOpAsDfGhJkLzXcVbNm1234';

test('scan: to\'ldirilgan tokenni topadi', () => {
  const hits = findFilledEnvSecrets(`BOT_TOKEN=${FAKE_TOKEN}`);
  assert.deepStrictEqual(hits.map((h) => h.key), ['BOT_TOKEN']);
});

test('scan: bo\'sh va namuna qiymatlarni xavf deb hisoblamaydi', () => {
  const text = [
    'BOT_TOKEN=',
    'API_HASH=your_api_hash_here',
    'GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    'ADMIN_PASSWORD=bu_yerga_yozing',
    `# BOT_TOKEN=${FAKE_TOKEN}`,
  ].join('\n');
  assert.deepStrictEqual(findFilledEnvSecrets(text), []);
});

test('scan: sir bo\'lmagan o\'zgaruvchilarga tegmaydi', () => {
  const text = 'DATA_DIR=/var/lib/some/very/long/path\nLOG_LEVEL=debugverbose';
  assert.deepStrictEqual(findFilledEnvSecrets(text), []);
});

test('scan: sessiya va kalit fayl nomlarini taqiqlaydi', () => {
  for (const name of ['atoyo_admin_session.session', 'a.session-journal', 'id_rsa', 'cert.pem', 'store.p12']) {
    assert.ok(FORBIDDEN_NAME.test(name), `${name} taqiqlanishi kerak edi`);
  }
});

test('scan: oddiy fayl nomlariga tegmaydi', () => {
  for (const name of ['main.py', 'session_helper.py', 'README.md', 'package.json']) {
    assert.ok(!FORBIDDEN_NAME.test(name), `${name} taqiqlanmasligi kerak edi`);
  }
});

// Bug: `doctor` faqat .env FAYLI borligini tekshirardi. `setup` uni
// .env.example dan nusxalagani uchun fayl darrov paydo bo'lardi, ichida esa
// "BU_YERGA_YOZING" turardi — bot 401 Unauthorized berardi va sababi
// hech qayerda ko'rinmasdi.
test('unfilledKeys: namunadan o\'zgarmagan tokenni ushlaydi', () => {
  // idfinder-bot dagi haqiqiy holat: .env.example da soxta, lekin haqiqiyga
  // o'xshash token turadi. Nusxa olingan .env "to'ldirilgan"dek ko'rinardi.
  const example = 'BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11\nDATA_DIR=/app/data';
  const env = 'BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11\nDATA_DIR=/app/data';

  // DATA_DIR maxfiy emas — u o'zgarmagani normal.
  assert.deepStrictEqual(unfilledKeys(env, example), ['BOT_TOKEN']);
});

test('unfilledKeys: token almashtirilgan bo\'lsa ogohlantirmaydi', () => {
  const example = 'BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
  const env = 'BOT_TOKEN=8199999999:AAH-menikiHaqiqiyToken_xyz';
  assert.deepStrictEqual(unfilledKeys(env, example), []);
});

test("unfilledKeys: to'ldirilmagan qiymatlarni topadi", () => {
  const env = [
    'BOT_TOKEN=BU_YERGA_YOZING',
    'API_HASH=your_api_hash_here',
    'ADMIN_ID=',
    '# izoh qatori',
    '',
    'GEMINI_API_KEY=AIzaHaqiqiyKalit123',
  ].join('\n');

  assert.deepStrictEqual(unfilledKeys(env), ['BOT_TOKEN', 'API_HASH', 'ADMIN_ID']);
});

test("unfilledKeys: to'liq to'ldirilgan .env da bo'sh ro'yxat", () => {
  const env = 'BOT_TOKEN=123456:AAH_haqiqiy\nADMIN_ID=777\n';
  assert.deepStrictEqual(unfilledKeys(env), []);
});

test('unfilledKeys: qo\'shtirnoqli qiymatlar ham tekshiriladi', () => {
  assert.deepStrictEqual(unfilledKeys('API_HASH="BU_YERGA_YOZING"'), ['API_HASH']);
  assert.deepStrictEqual(unfilledKeys("TOKEN='haqiqiy-qiymat'"), []);
});

test('unfilledKeys: izoh va buzuq qatorlar yiqitmaydi', () => {
  assert.deepStrictEqual(unfilledKeys('# BOT_TOKEN=BU_YERGA_YOZING\nchala qator\n=qiymat'), []);
});
