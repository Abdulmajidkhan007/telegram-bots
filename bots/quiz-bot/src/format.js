// ============================================================
//  Toza yordamchilar (I/O yo'q) — test/format.test.js da sinaladi:
//   - "✍️ Boshqa son": foydalanuvchi yozgan savol sonini tekshirish
//   - poll matni: savol qaysi yo'nalish/bo'limdanligini ko'rsatish
// ============================================================

// Bir testda eng ko'pi. Har savol ~vaqt + 3 soniya: 100 x 60s ≈ 1,7 soat —
// undan uzun test amalda oxirigacha ishlanmaydi, xotirada sessiya osilib qoladi.
const MAX_CUSTOM_COUNT = 100;

// Telegram quiz poll savoli ≤ 300 belgi; oshsa sendPoll xato beradi va test to'xtaydi.
const POLL_MAX = 300;

// available — bo'limdagi savollar soni. Ko'prog'i so'ralsa rad etmaymiz,
// borini beramiz va buni aytamiz (Aralash'da 50 so'rab 34 bo'lsa — 34).
function parseCount(text, available) {
  const s = String(text || '').trim();
  if (!/^\d{1,6}$/.test(s)) return { error: "Faqat son yozing, masalan: 34" };
  const n = parseInt(s, 10);
  if (n < 1) return { error: "Kamida 1 ta savol bo'lishi kerak." };
  if (n > MAX_CUSTOM_COUNT) return { error: `Bir testda eng ko'pi ${MAX_CUSTOM_COUNT} ta savol.` };
  if (available > 0 && n > available) {
    return { n: available, note: `Bu bo'limda ${available} ta savol bor — hammasi beriladi.` };
  }
  return { n };
}

function countPrompt(available) {
  const max = available > 0 ? Math.min(MAX_CUSTOM_COUNT, available) : MAX_CUSTOM_COUNT;
  return `✍️ Nechta savol bo'lsin? Son yozib yuboring (1–${max}).\nBu bo'limda jami: ${available} ta.`;
}

function cut(s, max) {
  if (max <= 0) return '';
  return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)) + '…';
}

// "❓ 3/20  •  🎨 Frontend › React\nSavol matni".
// Sig'masa avval bo'lim nomi qisqaradi (savol muhimroq), keyin savolning o'zi.
function pollText(index, total, section, text) {
  const head = `❓ ${index}/${total}`;
  const body = String(text || '');
  if (!section) return cut(`${head}  •  ${body}`, POLL_MAX);
  const room = POLL_MAX - head.length - '  •  '.length - 1 - body.length;
  if (room >= 3) return `${head}  •  ${cut(section, room)}\n${body}`;
  return cut(`${head}  •  ${body}`, POLL_MAX);
}

module.exports = { parseCount, countPrompt, pollText, MAX_CUSTOM_COUNT, POLL_MAX };
