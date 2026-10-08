// ============================================================
//  Inline tugmalarni sahifalash: 2 qator x 3 ustun = 6 ta tugma,
//  pastda ⬅️ 1/3 ➡️. Yo'nalish va bo'limlar ko'payganda (40+) bitta
//  ustunli uzun ro'yxat ekrandan chiqib ketardi.
//  Toza funksiya (I/O yo'q) — test/paging.test.js da sinaladi.
// ============================================================
// Egasi so'ragan joylashuv: 6 ta tugma 2 qatorda. Uzun nomlar telefonda
// "…" bilan qisqarsa — PER_ROW = 2 qilish kifoya (3 qator bo'ladi).
const PER_ROW = 3;
const PER_PAGE = 6;

// items: [{ text, callback_data }]; navPrefix: "dirs" -> "dirs:2"
function grid(items, page, navPrefix) {
  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const p = Math.min(Math.max(parseInt(page, 10) || 0, 0), pages - 1);
  const chunk = items.slice(p * PER_PAGE, (p + 1) * PER_PAGE);

  const rows = [];
  for (let i = 0; i < chunk.length; i += PER_ROW) rows.push(chunk.slice(i, i + PER_ROW));

  if (pages > 1) {
    const nav = [];
    if (p > 0) nav.push({ text: '⬅️', callback_data: `${navPrefix}:${p - 1}` });
    nav.push({ text: `${p + 1}/${pages}`, callback_data: 'noop' });
    if (p < pages - 1) nav.push({ text: '➡️', callback_data: `${navPrefix}:${p + 1}` });
    rows.push(nav);
  }
  return { rows, page: p, pages };
}

module.exports = { grid, PER_PAGE, PER_ROW };
