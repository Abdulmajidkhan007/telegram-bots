"""To'liq oqim: haqiqiy Dispatcher + soxta Telegram sessiyasi (tarmoqsiz).

Handler'lar, middleware (lang), DI (sessionmaker/cfg/scorer), FSM va
callback_data birga ishlashini tekshiradi — "ishlashi kerak" emas, ishlaydi.
"""
import io
from datetime import datetime
from types import SimpleNamespace

from aiogram import Bot
from aiogram.client.session.base import BaseSession
from aiogram.methods import GetMe, SendDocument, SendMessage, TelegramMethod
from aiogram.types import Chat, Message, Update, User
from conftest import dispatcher, run
from pypdf import PdfWriter


ADMIN, OWNER, CAND = 1, 2, 3
BOT_USER = User(id=42, is_bot=True, first_name="HR", username="hr_ai_007_bot")


class FakeSession(BaseSession):
    def __init__(self):
        super().__init__()
        self.sent: list[TelegramMethod] = []

    async def make_request(self, bot, method, timeout=None):
        self.sent.append(method)
        if isinstance(method, GetMe):
            return BOT_USER
        if isinstance(method, (SendMessage, SendDocument)):
            return Message(message_id=len(self.sent), date=datetime.now(), chat=Chat(id=method.chat_id, type="private"),
                           text=getattr(method, "text", None))
        return True

    async def stream_content(self, *a, **kw):
        yield b""

    async def close(self):
        pass


def _pdf_matnli() -> bytes:
    # pypdf bilan matnli PDF yasash qiyin — skanerlangan (matnsiz) holat ham haqiqiy yo'l.
    w = PdfWriter()
    w.add_blank_page(200, 200)
    b = io.BytesIO()
    w.write(b)
    return b.getvalue()


class Sim:
    def __init__(self, sm):
        self.session = FakeSession()
        self.bot = Bot("42:" + "A" * 35, session=self.session)
        self.bot.download = self._download
        self.dp = dispatcher(sm, SimpleNamespace(admin_ids=frozenset({ADMIN}), cv_retention_days=30,
                                                       ai_daily_limit=0), None)
        self.n = 0

    async def _download(self, file, destination):
        destination.write(_pdf_matnli())

    def _user(self, uid):
        return User(id=uid, is_bot=False, first_name=f"U{uid}", language_code="uz")

    async def msg(self, uid, text=None, document=None):
        self.n += 1
        m = Message(message_id=self.n, date=datetime.now(), chat=Chat(id=uid, type="private"),
                    from_user=self._user(uid), text=text, document=document,
                    entities=[{"type": "bot_command", "offset": 0, "length": len(text.split()[0])}]
                    if text and text.startswith("/") else None)
        await self.dp.feed_update(self.bot, Update(update_id=self.n, message=m))

    async def press(self, uid, data):
        self.n += 1
        msg = Message(message_id=1, date=datetime.now(), chat=Chat(id=uid, type="private"), text="x")
        cb = {"id": str(self.n), "from": self._user(uid).model_dump(), "chat_instance": "1", "data": data,
              "message": msg.model_dump()}
        await self.dp.feed_update(self.bot, Update.model_validate({"update_id": self.n, "callback_query": cb}))

    def texts(self, uid=None):
        return [m.text for m in self.session.sent if isinstance(m, SendMessage) and (uid is None or m.chat_id == uid)]

    def last_markup(self, uid):
        for m in reversed(self.session.sent):
            if isinstance(m, (SendMessage, SendDocument)) and m.chat_id == uid and m.reply_markup:
                return [b.callback_data for row in m.reply_markup.inline_keyboard for b in row]
        raise AssertionError("tugma yo'q")


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
