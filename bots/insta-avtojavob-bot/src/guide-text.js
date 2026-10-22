'use strict';

// Qo'llanma matnlari. Bepul qismi tayyor (umumiy); pullik qism — NAMUNA matn:
// egasining Chatplace.txt faylidan olinadi va PAID_PAGES shu yerda almashtiriladi.
// Almashtirgach IS_PLACEHOLDER = false qiling (ishga tushganda ogohlantirish yo'qoladi).
// HTML (parse_mode: HTML): faqat <b>, <i>, <code>, <pre> ishlating.

const IS_PLACEHOLDER = true;

const FREE_STEPS = [
  '<b>1/3 — Nima kerak bo‘ladi</b>\n\n' +
    '• Instagram <b>Business</b> yoki <b>Creator</b> akkaunt (shaxsiy akkaunt ishlamaydi).\n' +
    '• Akkaunt Facebook sahifasiga ulangan bo‘lishi kerak.\n' +
    '• Tayyor avto-javob xizmati (masalan, Chatplace yoki ManyChat) — ro‘yxatdan o‘ting.\n\n' +
    '<i>Tugma va bo‘lim nomlari xizmatga qarab biroz farq qilishi mumkin.</i>',
  '<b>2/3 — Instagram’ni xizmatga ulash</b>\n\n' +
    '1. Xizmatda <b>Instagram ulash</b> (Connect Instagram) bo‘limini oching.\n' +
    '2. Facebook orqali kirib, kerakli sahifa va akkauntga ruxsat bering.\n' +
    '3. Ulangach xizmat akkauntingiz nomini ko‘rsatadi — to‘g‘ri akkaunt ekaniga ishonch hosil qiling.\n\n' +
    '🔒 Parolingizni hech kimga bermang — ulash faqat rasmiy Facebook oynasi orqali bajariladi.',
  '<b>3/3 — Birinchi avto-javob</b>\n\n' +
    '1. Yangi <b>avtomatlashtirish</b> (flow) yarating: sabab — «Direct’ga xabar keldi».\n' +
    '2. Salomlashuv matnini yozing va o‘zingizni <b>«avtomatik javob»</b> deb tanishtiring.\n' +
    '3. Pul, tibbiy maslahat va va’da talab qiladigan savollarni odamga yo‘naltiring.\n' +
    '4. O‘zingizga yozib sinab ko‘ring.\n\n' +
    '✅ Bepul qism tugadi. AI «miya», biznes turlari bo‘yicha tayyor shablonlar va ' +
    'to‘liq qo‘llanma — pullik qismda.',
];

const PAID_PAGES = [
  '<b>⚠️ NAMUNA MATN</b> — haqiqiy qo‘llanma tez orada joylanadi.\n\n' +
    '<b>1-bo‘lim. Xizmatni tanlash va tarif</b>\n\n(Chatplace qo‘llanmasi shu yerga qo‘yiladi.)',
  '<b>2-bo‘lim. Instagram’ni ulash (batafsil)</b>\n\n(Namuna — haqiqiy matn keyin.)',
  '<b>3-bo‘lim. AI «miya»ni sozlash</b>\n\n' +
    '(Namuna.) Tayyor shablonlar — «🧠 AI shablonlar» tugmasida.',
  '<b>4-bo‘lim. Sinash va nazorat</b>\n\n(Namuna — haqiqiy matn keyin.)',
];

module.exports = { IS_PLACEHOLDER, FREE_STEPS, PAID_PAGES };
