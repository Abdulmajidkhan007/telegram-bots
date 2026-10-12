"""Barcha foydalanuvchi matnlari (uz/ru). Kodda matn yozilmaydi — shu lug'atdan olinadi."""

T: dict[str, dict[str, str]] = {
    "start": {
        "uz": "👋 <b>HR bot</b> — CV qabul qiladi, AI bilan saralaydi va <b>har bir</b> nomzodga javob beradi.\n\nKimsiz?",
        "ru": "👋 <b>HR бот</b> — принимает резюме, сортирует с помощью ИИ и отвечает <b>каждому</b> кандидату.\n\nКто вы?",
    },
    "role_owner": {"uz": "🏢 Kompaniya egasi", "ru": "🏢 Владелец компании"},
    "role_hr": {"uz": "👔 HR", "ru": "👔 HR"},
    "role_candidate": {"uz": "🙋 Nomzod", "ru": "🙋 Кандидат"},
    "lang_btn": {"uz": "🇷🇺 Русский", "ru": "🇺🇿 O'zbekcha"},
    "candidate_help": {
        "uz": "Nomzod sifatida kompaniya e'lonidagi havola orqali kiring — u to'g'ridan-to'g'ri vakansiyaga olib keladi.",
        "ru": "Кандидатам: перейдите по ссылке из объявления компании — она ведёт сразу к вакансии.",
    },
    "hr_help": {
        "uz": "HR sifatida kompaniya egasidan taklif havolasini oling. Mavjud kompaniyalaringiz: /panel",
        "ru": "HR: получите ссылку-приглашение у владельца компании. Ваши компании: /panel",
    },
    "ask_company_name": {"uz": "Kompaniya nomini yozing:", "ru": "Напишите название компании:"},
    "company_created": {
        "uz": "✅ «{name}» ro'yxatga olindi. Platforma admini faollashtirgach xabar beramiz (pilot — bepul).",
        "ru": "✅ «{name}» зарегистрирована. Сообщим, когда администратор платформы активирует (пилот — бесплатно).",
    },
    "company_activated": {"uz": "🎉 «{name}» faollashtirildi. /panel", "ru": "🎉 «{name}» активирована. /panel"},
    "no_companies": {"uz": "Sizda hali kompaniya yo'q. /start", "ru": "У вас пока нет компаний. /start"},
    "panel": {"uz": "🏢 <b>{name}</b> ({status})", "ru": "🏢 <b>{name}</b> ({status})"},
    "btn_new_vacancy": {"uz": "➕ Vakansiya", "ru": "➕ Вакансия"},
    "btn_invite": {"uz": "👥 HR taklif qilish", "ru": "👥 Пригласить HR"},
    "btn_vacancies": {"uz": "📋 Vakansiyalar", "ru": "📋 Вакансии"},
    "invite_link": {
        "uz": "HR uchun bir martalik havola (7 kun):\n{link}",
        "ru": "Одноразовая ссылка для HR (7 дней):\n{link}",
    },
    "invite_ok": {"uz": "✅ Siz «{name}» kompaniyasiga HR sifatida qo'shildingiz. /panel", "ru": "✅ Вы добавлены в «{name}» как HR. /panel"},
    "invite_invalid": {"uz": "❌ Taklif havolasi eskirgan yoki ishlatilgan.", "ru": "❌ Ссылка-приглашение устарела или уже использована."},
    "ask_vac_title": {"uz": "Vakansiya nomi:", "ru": "Название вакансии:"},
    "ask_vac_req": {"uz": "Talablar (ko'nikmalar, tajriba):", "ru": "Требования (навыки, опыт):"},
    "ask_vac_days": {"uz": "Necha kun ariza qabul qilinadi? (1–90)", "ru": "Сколько дней принимать заявки? (1–90)"},
    "ask_vac_reject": {
        "uz": "Rad xati matni (nomzodlarga ketadi). Standart matn uchun «-» yozing.",
        "ru": "Текст отказа (уйдёт кандидатам). Для стандартного текста напишите «-».",
    },
    "vac_created": {
        "uz": "✅ Vakansiya ochildi: <b>{title}</b>\nMuddat: {deadline}\n\nE'longa shu havolani qo'ying:\n{link}",
        "ru": "✅ Вакансия открыта: <b>{title}</b>\nСрок: {deadline}\n\nДобавьте эту ссылку в объявление:\n{link}",
    },
    "bad_days": {"uz": "1 dan 90 gacha son yozing.", "ru": "Напишите число от 1 до 90."},
    "too_long": {"uz": "Juda uzun ({n} belgigacha).", "ru": "Слишком длинно (до {n} символов)."},
    "company_not_active": {
        "uz": "⏳ Kompaniya hali faollashtirilmagan — vakansiya ochib bo'lmaydi.",
        "ru": "⏳ Компания ещё не активирована — нельзя открыть вакансию.",
    },
    "vacancy_card": {
        "uz": "💼 <b>{title}</b>\n🏢 {company}\n⏳ Ariza muddati: {deadline}\n\n{requirements}",
        "ru": "💼 <b>{title}</b>\n🏢 {company}\n⏳ Приём заявок до: {deadline}\n\n{requirements}",
    },
    "consent": {
        "uz": "CV faqat shu kompaniyaga ko'rsatiladi, AI talablar bilan solishtiradi va vakansiya yopilgach {days} kunda o'chiriladi. Rozimisiz?",
        "ru": "Резюме увидит только эта компания, ИИ сравнит его с требованиями, через {days} дн. после закрытия вакансии оно удаляется. Согласны?",
    },
    "btn_agree": {"uz": "✅ Roziman", "ru": "✅ Согласен"},
    "send_cv": {"uz": "📄 CV'ni PDF fayl qilib yuboring (≤ 10 MB, ≤ 10 sahifa).", "ru": "📄 Отправьте резюме PDF-файлом (≤ 10 МБ, ≤ 10 стр.)."},
    "ask_links": {
        "uz": "Portfolio/GitHub/LinkedIn havolalari bo'lsa yozing (yoki tugmani bosing).",
        "ru": "Если есть ссылки на портфолио/GitHub/LinkedIn — напишите (или нажмите кнопку).",
    },
    "btn_no_links": {"uz": "Havola yo'q", "ru": "Ссылок нет"},
    "applied": {
        "uz": "✅ Arizangiz qabul qilindi. Natija {deadline} gacha — bot o'zi xabar beradi.",
        "ru": "✅ Заявка принята. Результат до {deadline} — бот сам сообщит.",
    },
    "reapplied": {"uz": "🔄 CV yangilandi. Natija {deadline} gacha.", "ru": "🔄 Резюме обновлено. Результат до {deadline}."},
    "vacancy_closed": {"uz": "⛔️ Bu vakansiya bo'yicha ariza qabul qilinmaydi.", "ru": "⛔️ Приём заявок по этой вакансии закрыт."},
    "vacancy_not_found": {"uz": "❌ Vakansiya topilmadi. Havolani tekshiring.", "ru": "❌ Вакансия не найдена. Проверьте ссылку."},
    "already_decided": {"uz": "Bu ariza bo'yicha qaror allaqachon qabul qilingan.", "ru": "По этой заявке решение уже принято."},
    "cv_not_pdf": {"uz": "❌ Faqat PDF fayl qabul qilinadi.", "ru": "❌ Принимается только PDF."},
    "cv_empty": {"uz": "❌ Fayl bo'sh.", "ru": "❌ Файл пустой."},
    "cv_too_big": {"uz": "❌ Fayl 10 MB dan katta.", "ru": "❌ Файл больше 10 МБ."},
    "cv_too_many_pages": {"uz": "❌ PDF 10 sahifadan ko'p.", "ru": "❌ В PDF больше 10 страниц."},
    "cv_encrypted": {"uz": "❌ PDF parol bilan himoyalangan.", "ru": "❌ PDF защищён паролем."},
    "cv_broken": {"uz": "❌ PDF ochilmadi (fayl buzilgan).", "ru": "❌ PDF не открывается (файл повреждён)."},
    "cv_download_failed": {"uz": "❌ Faylni Telegram'dan yuklab bo'lmadi, qayta yuboring.", "ru": "❌ Не удалось скачать файл из Telegram, отправьте снова."},
    "vac_list_empty": {"uz": "Vakansiyalar yo'q.", "ru": "Вакансий нет."},
    "vac_line": {"uz": "{icon} {title} — {n} ariza", "ru": "{icon} {title} — {n} заявок"},
    "apps_header": {"uz": "<b>{title}</b>: {n} ariza (AI ball bo'yicha)", "ru": "<b>{title}</b>: {n} заявок (по баллу ИИ)"},
    "btn_close_vac": {"uz": "🔒 Vakansiyani yopish", "ru": "🔒 Закрыть вакансию"},
    "app_card": {
        "uz": "👤 {name}\n📊 AI ball: {score}\n📌 Holat: {status}\n{summary}{links}",
        "ru": "👤 {name}\n📊 Балл ИИ: {score}\n📌 Статус: {status}\n{summary}{links}",
    },
    "score_none": {"uz": "hisoblanmadi", "ru": "не рассчитан"},
    "no_text": {"uz": "⚠️ PDF'da matn topilmadi (skaner?) — faylni o'zingiz ko'ring.", "ru": "⚠️ В PDF нет текста (скан?) — посмотрите файл сами."},
    "cv_deleted": {"uz": "🗑 CV saqlash muddati tugagani uchun o'chirilgan.", "ru": "🗑 Резюме удалено по истечении срока хранения."},
    "btn_invite_app": {"uz": "✅ Suhbatga", "ru": "✅ На собеседование"},
    "btn_reject_app": {"uz": "❌ Rad etish", "ru": "❌ Отказать"},
    "btn_later": {"uz": "⏸ Keyinroq", "ru": "⏸ Позже"},
    "done": {"uz": "✅ Bajarildi.", "ru": "✅ Готово."},
    "close_confirm": {
        "uz": "Vakansiya yopiladi va qaror qilinmagan <b>{n}</b> nomzodga rad xati ketadi. Tasdiqlaysizmi?",
        "ru": "Вакансия будет закрыта, <b>{n}</b> кандидатам без решения уйдёт отказ. Подтверждаете?",
    },
    "btn_yes": {"uz": "Ha, yopish", "ru": "Да, закрыть"},
    "already_closed": {"uz": "Vakansiya allaqachon yopilgan.", "ru": "Вакансия уже закрыта."},
    "closed_report": {
        "uz": "🔒 Yopildi. Rad xati: {ok} ta yetkazildi, {fail} ta yetkazilmadi (botni bloklagan).",
        "ru": "🔒 Закрыто. Отказ доставлен: {ok}, не доставлен: {fail} (бот заблокирован).",
    },
    "msg_invited": {
        "uz": "🎉 Tabriklaymiz! «{company}» sizni <b>{title}</b> vakansiyasi bo'yicha suhbatga taklif qiladi. Tez orada siz bilan bog'lanishadi.",
        "ru": "🎉 Поздравляем! «{company}» приглашает вас на собеседование по вакансии <b>{title}</b>. С вами скоро свяжутся.",
    },
    "msg_rejected_default": {
        "uz": "Assalomu alaykum! «{company}» ga <b>{title}</b> vakansiyasi bo'yicha ariza yuborganingiz uchun rahmat. Afsuski, bu safar boshqa nomzod tanlandi. Sizga omad tilaymiz!",
        "ru": "Здравствуйте! Спасибо за отклик на вакансию <b>{title}</b> в «{company}». К сожалению, в этот раз выбран другой кандидат. Желаем удачи!",
    },
    "access_denied": {"uz": "⛔️ Bu ma'lumotga huquqingiz yo'q.", "ru": "⛔️ Нет доступа к этим данным."},
    "not_found": {"uz": "Topilmadi.", "ru": "Не найдено."},
    "admin_pending": {"uz": "Kutilayotgan kompaniyalar:", "ru": "Ожидающие компании:"},
    "admin_none": {"uz": "Kutilayotgan kompaniya yo'q.", "ru": "Нет ожидающих компаний."},
    "admin_stats": {
        "uz": "Kompaniyalar: {companies} (faol {active})\nVakansiyalar: {vacancies}\nArizalar: {applications}",
        "ru": "Компании: {companies} (активных {active})\nВакансии: {vacancies}\nЗаявки: {applications}",
    },
    "admin_new_company": {"uz": "🆕 Yangi kompaniya: {name} (id {id})", "ru": "🆕 Новая компания: {name} (id {id})"},
    "btn_activate": {"uz": "✅ Faollashtirish", "ru": "✅ Активировать"},
    "btn_block": {"uz": "⛔️ Bloklash", "ru": "⛔️ Заблокировать"},
    "status_new": {"uz": "yangi", "ru": "новая"},
    "status_shortlisted": {"uz": "keyinroq", "ru": "позже"},
    "status_invited": {"uz": "suhbatga chaqirilgan", "ru": "приглашён"},
    "status_rejected": {"uz": "rad etilgan", "ru": "отказ"},
    "deadline_passed": {
        "uz": "⏰ «{title}» muddati tugadi: {n} nomzod qaror kutmoqda. Yopish: /panel",
        "ru": "⏰ Срок «{title}» истёк: {n} кандидатов ждут решения. Закрыть: /panel",
    },
    # --- to'lov (4-faza) ---
    "company_created_paid": {
        "uz": "✅ «{name}» ro'yxatga olindi. Faollashtirish: /panel → «💳 To'lov» (yoki platforma admini tasdiqlashini kuting).",
        "ru": "✅ «{name}» зарегистрирована. Активация: /panel → «💳 Оплата» (или дождитесь администратора платформы).",
    },
    "panel_until": {"uz": "⏳ Faol: {date} gacha", "ru": "⏳ Активна до {date}"},
    "panel_expired": {"uz": "⛔️ Obuna {date} da tugagan", "ru": "⛔️ Подписка истекла {date}"},
    "btn_pay": {"uz": "💳 To'lov", "ru": "💳 Оплата"},
    "pay_menu": {
        "uz": "💳 «{name}» — 30 kunlik obuna. To'lov usulini tanlang:",
        "ru": "💳 «{name}» — подписка на 30 дней. Выберите способ оплаты:",
    },
    "btn_pay_stars": {"uz": "⭐ {price} Stars / 30 kun", "ru": "⭐ {price} Stars / 30 дней"},
    "btn_pay_card": {"uz": "💳 Karta orqali — {price} so'm", "ru": "💳 Картой — {price} сум"},
    "pay_disabled": {
        "uz": "To'lov hozircha yoqilmagan — kompaniyani platforma admini faollashtiradi.",
        "ru": "Оплата пока не включена — компанию активирует администратор платформы.",
    },
    "pay_stars_title": {"uz": "HR bot — 30 kun", "ru": "HR бот — 30 дней"},
    "pay_stars_desc": {
        "uz": "«{name}»: vakansiyalar, AI saralash va har nomzodga javob — 30 kunlik obuna.",
        "ru": "«{name}»: вакансии, ИИ-сортировка и ответ каждому кандидату — подписка на 30 дней.",
    },
    "pay_stars_link": {
        "uz": "⭐ Obuna har 30 kunda avtomatik yangilanadi; Telegram sozlamalarida bekor qilish mumkin.",
        "ru": "⭐ Подписка продлевается каждые 30 дней; отменить можно в настройках Telegram.",
    },
    "btn_pay_open": {"uz": "⭐ To'lash", "ru": "⭐ Оплатить"},
    "pay_link_failed": {
        "uz": "❌ Telegram to'lov havolasini bermadi. Birozdan keyin qayta urinib ko'ring.",
        "ru": "❌ Telegram не выдал ссылку на оплату. Попробуйте чуть позже.",
    },
    "pay_card_info": {
        "uz": "💳 Karta: <code>{card}</code>{holder}\nSumma: <b>{price} so'm</b> (30 kun)\n\nTo'lovdan keyin chekni <b>rasm yoki PDF</b> qilib shu yerga yuboring.",
        "ru": "💳 Карта: <code>{card}</code>{holder}\nСумма: <b>{price} сум</b> (30 дней)\n\nПосле оплаты отправьте чек сюда <b>фото или PDF</b>.",
    },
    "pay_receipt_bad": {"uz": "❌ Chekni rasm yoki PDF qilib yuboring.", "ru": "❌ Отправьте чек фото или PDF."},
    "pay_receipt_sent": {
        "uz": "✅ Chek qabul qilindi. Admin tekshirgach xabar beramiz.",
        "ru": "✅ Чек получен. Сообщим после проверки администратором.",
    },
    "pay_pending_exists": {"uz": "⏳ Oldingi chekingiz hali tekshirilmoqda.", "ru": "⏳ Предыдущий чек ещё проверяется."},
    "admin_receipt": {
        "uz": "🧾 Chek: «{name}» (kompaniya {id}), {price} so'm, to'lov #{pid}",
        "ru": "🧾 Чек: «{name}» (компания {id}), {price} сум, платёж #{pid}",
    },
    "btn_pay_approve": {"uz": "✅ Tasdiqlash", "ru": "✅ Подтвердить"},
    "btn_pay_reject": {"uz": "❌ Rad etish", "ru": "❌ Отклонить"},
    "pay_approved": {
        "uz": "✅ To'lov tasdiqlandi. «{name}» {date} gacha faol. /panel",
        "ru": "✅ Оплата подтверждена. «{name}» активна до {date}. /panel",
    },
    "pay_rejected": {
        "uz": "❌ «{name}» uchun chek tasdiqlanmadi. Savol bo'lsa platforma admini bilan bog'laning.",
        "ru": "❌ Чек для «{name}» не подтверждён. По вопросам — к администратору платформы.",
    },
    "pay_already_decided": {"uz": "Bu to'lov bo'yicha qaror allaqachon qabul qilingan.", "ru": "По этому платежу решение уже принято."},
    "pay_done_stars": {
        "uz": "⭐ To'lov qabul qilindi. «{name}» {date} gacha faol. /panel",
        "ru": "⭐ Оплата получена. «{name}» активна до {date}. /panel",
    },
    "admin_stars": {
        "uz": "⭐ Stars: «{name}» (kompaniya {id}), {amount} XTR{recurring}, to'lov #{pid}",
        "ru": "⭐ Stars: «{name}» (компания {id}), {amount} XTR{recurring}, платёж #{pid}",
    },
    "admin_unknown_payment": {
        "uz": "⚠️ Noma'lum Stars to'lov: user {uid}, {amount} XTR, charge <code>{charge}</code> — tekshiring.",
        "ru": "⚠️ Неизвестный платёж Stars: user {uid}, {amount} XTR, charge <code>{charge}</code> — проверьте.",
    },
    "recurring": {"uz": " (obuna yangilandi)", "ru": " (продление подписки)"},
    "btn_refund": {"uz": "↩️ Pulni qaytarish", "ru": "↩️ Вернуть деньги"},
    "pay_refunded": {
        "uz": "↩️ «{name}» uchun {amount} Stars qaytarildi, obuna bekor qilindi.",
        "ru": "↩️ Для «{name}» возвращено {amount} Stars, подписка отменена.",
    },
    "pay_already_refunded": {"uz": "Bu to'lov allaqachon qaytarilgan.", "ru": "Этот платёж уже возвращён."},
    "refund_failed": {"uz": "❌ Telegram pulni qaytarmadi: {err}", "ru": "❌ Telegram не вернул деньги: {err}"},
    "pay_bad_invoice": {"uz": "To'lov havolasi noto'g'ri. /panel dan yangisini oling.", "ru": "Неверная ссылка на оплату. Получите новую в /panel."},
    "pay_price_changed": {"uz": "Narx o'zgargan. /panel dan yangi havola oling.", "ru": "Цена изменилась. Получите новую ссылку в /panel."},
    "pay_not_owner": {"uz": "Faqat kompaniya egasi to'lay oladi.", "ru": "Оплатить может только владелец компании."},
    "pay_error": {"uz": "To'lovni hozir tekshirib bo'lmadi, birozdan keyin urinib ko'ring.", "ru": "Не удалось проверить платёж, попробуйте позже."},
    "company_blocked": {"uz": "⛔️ Kompaniya bloklangan.", "ru": "⛔️ Компания заблокирована."},
    "subscription_expired": {
        "uz": "⛔️ Obuna muddati tugagan — yangi vakansiya ochib bo'lmaydi. /panel → «💳 To'lov»",
        "ru": "⛔️ Подписка истекла — новую вакансию открыть нельзя. /panel → «💳 Оплата»",
    },
    "expiry_soon": {
        "uz": "⏳ «{name}» obunasi {date} da tugaydi. Uzaytirish: /panel → «💳 To'lov»",
        "ru": "⏳ Подписка «{name}» заканчивается {date}. Продлить: /panel → «💳 Оплата»",
    },
    "expiry_expired": {
        "uz": "⛔️ «{name}» obunasi tugadi: yangi vakansiya ochilmaydi (eskilari ko'rinadi). Uzaytirish: /panel",
        "ru": "⛔️ Подписка «{name}» истекла: новые вакансии не открываются (старые доступны). Продлить: /panel",
    },
    # --- Telegram Business (5-faza) ---
    "biz_connected": {
        "uz": "🔗 Telegram Business ulandi. Nomzod sizga yozsa, bot «{name}» ochiq vakansiyalari havolalarini yuboradi ({hours} soatda bir marta).",
        "ru": "🔗 Telegram Business подключён. Когда кандидат напишет вам, бот отправит ссылки на открытые вакансии «{name}» (раз в {hours} ч).",
    },
    "biz_choose": {
        "uz": "🔗 Telegram Business ulandi. Qaysi kompaniya vakansiyalarini ko'rsatay?",
        "ru": "🔗 Telegram Business подключён. Вакансии какой компании показывать?",
    },
    "biz_no_company": {
        "uz": "🔗 Business ulandi, lekin siz hech bir kompaniyaga a'zo emassiz — bot javob bermaydi. Avval /start yoki HR taklif havolasi.",
        "ru": "🔗 Business подключён, но вы не состоите ни в одной компании — бот не будет отвечать. Сначала /start или ссылка-приглашение HR.",
    },
    "biz_no_reply_right": {
        "uz": "⚠️ Botga «xabarlarga javob berish» huquqi berilmagan — Settings → Telegram Business → Chatbots da yoqing.",
        "ru": "⚠️ Боту не выдано право отвечать на сообщения — включите в Настройки → Telegram для бизнеса → Чат-боты.",
    },
    "biz_disabled": {"uz": "🔌 Telegram Business uzildi — bot sizning chatlaringizga javob bermaydi.", "ru": "🔌 Telegram Business отключён — бот больше не отвечает в ваших чатах."},
    "biz_vacancies": {
        "uz": "Assalomu alaykum! «{company}» ochiq vakansiyalari:\n\n{lines}\n\nAriza — havola orqali: bot CV'ni qabul qiladi va natijani o'zi yozadi.",
        "ru": "Здравствуйте! Открытые вакансии «{company}»:\n\n{lines}\n\nОтклик — по ссылке: бот примет резюме и сам сообщит результат.",
    },
    "biz_line": {"uz": "• <b>{title}</b> ({deadline} gacha)\n{link}", "ru": "• <b>{title}</b> (до {deadline})\n{link}"},
}


def t(lang: str, key: str, **kw) -> str:
    variant = T[key]
    matn = variant.get(lang) or variant["uz"]
    return matn.format(**kw) if kw else matn


def lang_of(code: str | None) -> str:
    """Telegram language_code → uz/ru. Rus tilida yozuvchilar (ru, uk, be, kk) — ru."""
    return "ru" if (code or "").split("-")[0] in ("ru", "uk", "be", "kk") else "uz"
