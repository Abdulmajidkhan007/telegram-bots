'use strict';

// Qo'llanma matnlari. Bepul qismi — umumiy; pullik qism — egasining Chatplace.txt
// faylidan (ChatPlace interfeysiga aniq). Matn yana namunaga qaytsa IS_PLACEHOLDER = true
// (ishga tushganda ogohlantirish chiqadi).
// HTML (parse_mode: HTML): faqat <b>, <i>, <code>, <pre> ishlating.

const IS_PLACEHOLDER = false;

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

// Manba: egasining Chatplace.txt (2026-10-25). Menyu nomlari ChatPlace'ning ruscha
// interfeysidan; mavjud bo'lmagan qadam o'ylab topilmagan (AI bloki nomi — 5-bo'lim).
const PAID_PAGES = [
  '<b>1/7 — ChatPlace nima va qanday ishlaydi</b>\n\n' +
    'ChatPlace (ManyChat kabi) — Meta’ning <b>rasmiy API</b>si orqali ishlaydigan avtomatlashtirish xizmati. ' +
    'Parolingiz unga berilmaydi — ruxsat Facebook oynasi orqali beriladi.\n\n' +
    '<b>Zanjir:</b>\n' +
    '1. Mijoz Reels/post ostiga kalit so‘z yozadi (masalan, «narx») yoki Direct’ga xabar yuboradi.\n' +
    '2. Instagram bu voqeani darhol ChatPlace’ga yuboradi (webhook).\n' +
    '3. ChatPlace mantiq yoki AI bilan Direct’ga javob qaytaradi: havola, savol-javob, AI javobi.\n' +
    '4. Mijoz ism/telefon qoldirsa — ma’lumot Telegram guruhingizga (yoki CRM, Google Sheets) yuboriladi.\n\n' +
    'Keyingi bo‘limlarda shu zanjirni qadamlab yig‘amiz.',
  '<b>2/7 — Instagram akkauntni tayyorlash</b>\n\n' +
    'Oddiy shaxsiy akkaunt avtomatlashtirishga ulanmaydi (Meta cheklovi).\n\n' +
    '1. <b>Professional akkaunt:</b> Instagram → Sozlamalar (Settings) → Akkaunt turi (Account type) → ' +
    '<b>Business</b> yoki <b>Creator</b>.\n' +
    '2. <b>Facebook sahifa:</b> profilingizni o‘zingizga tegishli Facebook Page bilan bog‘lang ' +
    '(sahifa bo‘lmasa — Facebook’da yangisini oching).\n' +
    '3. <b>Xabarlarga ruxsat:</b> Sozlamalar → Messages and story replies → Message controls → ' +
    '<b>«Allow access to messages»</b>ni yoqing. Yoqilmasa xizmat Direct xabarlarni ko‘rmaydi.\n\n' +
    '<i>Bo‘lim nomlari Instagram versiyasiga qarab biroz farq qilishi mumkin.</i>',
  '<b>3/7 — ChatPlace’ga ulash</b>\n\n' +
    '1. Brauzerda <code>app.chatplace.io</code> ga kiring va ro‘yxatdan o‘ting.\n' +
    '2. Chap panel pastida: <b>Настройки</b> (Sozlamalar) → <b>Аккаунты</b> (Akkauntlar).\n' +
    '3. <b>«Подключить Instagram»</b> (yoki «Обновить») tugmasini bosing.\n' +
    '4. Meta (Facebook) oynasida profilingizni tanlang va so‘ralgan ruxsatlarni tasdiqlang: ' +
    'Direct xabarlarni o‘qish/yozish, izohlarni ko‘rish.\n' +
    '5. Ulangach ChatPlace akkauntingiz nomini ko‘rsatadi — to‘g‘ri akkaunt ekanini tekshiring.\n\n' +
    '🔒 Instagram parolini hech qayerga yozmang — ulash faqat rasmiy Facebook oynasida.',
  '<b>4/7 — Birinchi avtomatizatsiya: kalit so‘z boti</b>\n\n' +
    '1. Chap menyu: <b>Автоматизации</b> → <b>Создать</b>.\n' +
    '2. Shablon: <b>«Чат-бот на кодовое слово»</b> (kalit so‘zga javob beruvchi bot).\n' +
    '3. <b>Trigger</b> — qayerda ishlaydi: Direct xabarlari yoki Reels/post izohlari.\n' +
    '4. <b>Kalit so‘z</b> — masalan: <code>narx</code>, <code>kurs</code>, <code>alo</code>.\n' +
    '5. <b>«Проверить подписку»</b> (ixtiyoriy) — bot faqat obunachilaringizga javob beradi.\n' +
    '6. <b>Javob xabari</b> — masalan: «Assalomu alaykum! Bu avtomatik javob. Telefon raqamingizni ' +
    'qoldiring, mutaxassisimiz siz bilan bog‘lanadi.»\n' +
    '7. Kerak bo‘lsa — <b>raqam so‘rash</b> qadamini qo‘shing (lead yig‘ish uchun, 6-bo‘lim).\n\n' +
    '💡 Javobda o‘zingizni «avtomatik javob» deb tanishtiring — mijoz aldanmasin.',
  '<b>5/7 — AI «miya»: erkin savollarga javob</b>\n\n' +
    'Kalit so‘z boti faqat belgilangan so‘zga javob beradi. Har qanday savolga javob berish uchun ' +
    'ChatPlace’da avtomatizatsiyaga <b>AI javob</b> qadamini qo‘shasiz va unga ko‘rsatma (prompt) yozasiz.\n\n' +
    '1. «🧠 AI shablonlar» tugmasidan biznes turingizni tanlang.\n' +
    '2. <code>{…}</code> joylarni o‘z ma’lumotingiz bilan to‘ldiring: narxlar, manzil, ish vaqti, yetkazish.\n' +
    '3. Matnni ChatPlace’dagi AI qadamining ko‘rsatma maydoniga qo‘ying.\n\n' +
    '<b>Muhim:</b> shablondagi xavfsizlik qoidalarini o‘chirmang — AI pul, tibbiy maslahat va va’da ' +
    'talab qiladigan savollarni sizga uzatadi.\n\n' +
    '<i>AI qadamining aniq nomi va joyi ChatPlace interfeysida farq qilishi mumkin; ' +
    'topilmasa «O‘zim sozlab beraman» xizmatidan foydalaning.</i>',
  '<b>6/7 — Leadlarni Telegram guruhga yuborish</b>\n\n' +
    'Mijoz ism va telefon qoldirganda guruhingizga shunday xabar kelsin:\n' +
    '<i>Ism: Temur · Telefon: +998 90 123 45 67 · Qiziqishi: kurs</i>\n\n' +
    '<b>Qanday ulanadi:</b> ChatPlace’da <b>Webhook (HTTP Request)</b> bloki bor. Raqam so‘rash ' +
    'qadamidan keyin shu blokni qo‘yasiz — u ma’lumotni POST so‘rov qilib yuboradi.\n\n' +
    '<b>Eng oddiy yo‘l</b> — to‘g‘ridan-to‘g‘ri Telegram Bot API’ga:\n' +
    '<code>https://api.telegram.org/bot&lt;TOKEN&gt;/sendMessage</code>\n' +
    'parametrlar: <code>chat_id</code> = guruh ID, <code>text</code> = ism, telefon, qiziqish.\n\n' +
    '1. @BotFather’da <b>shu ish uchun alohida</b> bot oching, uni guruhga qo‘shing.\n' +
    '2. Guruh ID’sini ID topuvchi bot bilan aniqlang (odatda <code>-100…</code> bilan boshlanadi).\n\n' +
    '🔒 Token — bot kaliti: faqat ChatPlace blokiga yozing; skrinshot, chat va guruhga tashlamang. ' +
    'Oqib ketsa — @BotFather’da darhol yangilang.\n\n' +
    'Guruhda «Bog‘lanildi ✅ / Rad etildi ❌» tugmali boshqaruv kerak bo‘lsa — bu alohida server ' +
    'talab qiladi: «O‘zim sozlab beraman» xizmatida qilib beriladi.',
  '<b>7/7 — Sinash va nazorat</b>\n\n' +
    '1. Avtomatizatsiyani <b>«Активировать / Запустить»</b> tugmasi bilan yoqing.\n' +
    '2. <b>Boshqa</b> Instagram akkauntdan (o‘zingiznikidan emas) profilingizga kiring.\n' +
    '3. Reels ostiga yoki Direct’ga kalit so‘zni yozing.\n' +
    '4. Bir necha soniyada avtomatik javob kelishini tekshiring; lead ulangan bo‘lsa — guruhga xabar kelganini ham.\n\n' +
    '<b>Kelmasa tekshiring:</b> akkaunt Professional’mi, Facebook sahifaga ulanganmi, ' +
    '«Allow access to messages» yoqilganmi, avtomatizatsiya faolmi, kalit so‘z to‘g‘ri yozilganmi.\n\n' +
    '<b>Nazorat:</b> birinchi haftada har kuni AI javoblarini o‘qib chiqing; noto‘g‘ri javob bo‘lsa — ' +
    'ko‘rsatmaga qoida yoki ma’lumot qo‘shing.\n\n' +
    '✅ Qo‘llanma tugadi. Savol bo‘lsa — «O‘zim sozlab beraman» orqali yozing.',
];

module.exports = { IS_PLACEHOLDER, FREE_STEPS, PAID_PAGES };
