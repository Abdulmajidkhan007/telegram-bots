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
}


def t(lang: str, key: str, **kw) -> str:
    variant = T[key]
    matn = variant.get(lang) or variant["uz"]
    return matn.format(**kw) if kw else matn


def lang_of(code: str | None) -> str:
    """Telegram language_code → uz/ru. Rus tilida yozuvchilar (ru, uk, be, kk) — ru."""
    return "ru" if (code or "").split("-")[0] in ("ru", "uk", "be", "kk") else "uz"
