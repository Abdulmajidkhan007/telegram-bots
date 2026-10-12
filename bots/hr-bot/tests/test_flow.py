"""To'liq oqim: haqiqiy Dispatcher + soxta Telegram sessiyasi (tarmoqsiz).

Handler'lar, middleware (lang), DI (sessionmaker/cfg/scorer), FSM va
callback_data birga ishlashini tekshiradi — "ishlashi kerak" emas, ishlaydi.
"""
from aiogram.methods import SendDocument
from sim import ADMIN, CAND, OWNER, Sim

from conftest import run


def test_toliq_oqim(sm):
    s = Sim(sm)

    async def body():
        # Ega kompaniya ochadi, admin faollashtiradi
        await s.msg(OWNER, "/start")
        await s.press(OWNER, "r:owner")
        await s.msg(OWNER, "Turkish Baby")
        assert "ro'yxatga olindi" in s.texts(OWNER)[-1]
        activate = [d for d in s.last_markup(ADMIN) if d.startswith("ad:activate")][0]
        await s.press(OWNER, activate)  # admin bo'lmagan bosa — hech narsa o'zgarmaydi
        await s.msg(OWNER, "/panel")
        assert "(pending)" in s.texts(OWNER)[-1]
        await s.press(ADMIN, activate)
        assert "faollashtirildi" in s.texts(OWNER)[-1]

        # Vakansiya
        await s.msg(OWNER, "/panel")
        new = [d for d in s.last_markup(OWNER) if d.startswith("c:new")][0]
        await s.press(OWNER, new)
        await s.msg(OWNER, "AI muhandis")
        await s.msg(OWNER, "/panel")  # buyruq FSM matni sifatida yutilmasligi kerak
        await s.press(OWNER, new)
        for javob in ("AI muhandis", "Python, LLM", "abc", "7", "-"):
            await s.msg(OWNER, javob)
        assert "1 dan 90 gacha" in "\n".join(s.texts(OWNER))
        link = s.texts(OWNER)[-1]
        assert "https://t.me/hr_ai_007_bot?start=v_turkishbaby_aimuhandis" in link

        # Nomzod
        await s.msg(CAND, "/start v_turkishbaby_aimuhandis")
        assert "AI muhandis" in s.texts(CAND)[-2]
        await s.press(CAND, s.last_markup(CAND)[0])
        await s.msg(CAND, "salom")  # PDF o'rniga matn — qayta so'raladi
        assert "PDF" in s.texts(CAND)[-1]
        doc = {"file_id": "FILE1", "file_unique_id": "u1", "file_name": "cv.pdf", "mime_type": "application/pdf",
               "file_size": 1000}
        await s.msg(CAND, document=doc)
        await s.press(CAND, s.last_markup(CAND)[0])  # havola yo'q
        assert "qabul qilindi" in s.texts(CAND)[-1]

        # HR ko'radi va yopadi
        await s.msg(OWNER, "/panel")
        await s.press(OWNER, [d for d in s.last_markup(OWNER) if d.startswith("c:vac")][0])
        await s.press(OWNER, s.last_markup(OWNER)[0])
        app_btn, close_btn = s.last_markup(OWNER)
        await s.press(OWNER, app_btn)
        assert any(isinstance(m, SendDocument) and m.document == "FILE1" for m in s.session.sent)
        await s.press(OWNER, close_btn)
        await s.press(OWNER, s.last_markup(OWNER)[0])
        assert "Afsuski" in s.texts(CAND)[-1]
        assert "1 ta yetkazildi, 0 ta yetkazilmadi" in s.texts(OWNER)[-1]

        # Soxta deep link va yopilgan vakansiya
        await s.msg(CAND, "/start v_turkishbaby_aimuhandis")
        assert "qabul qilinmaydi" in s.texts(CAND)[-1]
        await s.msg(CAND, "/start v_../../etc")
        assert "Kimsiz?" in s.texts(CAND)[-1]
    run(body())
