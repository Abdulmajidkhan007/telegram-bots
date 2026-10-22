'use strict';

// Kichik, toza yordamchilar: HTML escape va pul formati.

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// 49000 -> "49 000 so'm" (oddiy bo'sh joy: Telegram'da har joyda bir xil ko'rinadi).
function formatSom(amount) {
  return String(Math.trunc(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + " so'm";
}

// Telegram xabari chegarasi 4096; HTML teglar bo'linib qolmasligi uchun
// kontent chegaradan oldin tekshiriladi (test), bu yerda faqat o'lchov.
const TG_LIMIT = 4096;

module.exports = { escapeHtml, formatSom, TG_LIMIT };
