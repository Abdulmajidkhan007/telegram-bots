// ============================================================
//  Yo'nalish va bo'lim tugmalari (yakka test ham, guruh testi ham shu yerdan).
//  Toza funksiyalar: callback_data shablonlari tashqaridan beriladi.
// ============================================================
const { grid } = require('./paging');

// cb: { pick: key => 'dir:'+key, nav: 'dirs' }
function directionsRows(dirs, page, cb) {
  const items = dirs.map(d => ({ text: `${d.emoji} ${d.label}`, callback_data: cb.pick(d.key) }));
  return grid(items, page, cb.nav).rows;
}

// cb: { pick: key => ..., nav: 'dirp:frontend', mix: '...', back: '...' }
function subsRows(subs, page, cb) {
  const items = subs.map(s => ({ text: `${s.label} (${s.count})`, callback_data: cb.pick(s.key) }));
  const { rows } = grid(items, page, cb.nav);
  // Aralash faqat 2+ bo'lim bo'lsa ma'noli; bitta bo'limda u o'sha bo'limning o'zi.
  if (subs.length > 1) {
    const total = subs.reduce((a, s) => a + s.count, 0);
    rows.push([{ text: `🔀 Aralash — hammasidan (${total})`, callback_data: cb.mix }]);
  }
  rows.push([{ text: '⬅️ Orqaga', callback_data: cb.back }]);
  return rows;
}

module.exports = { directionsRows, subsRows };
