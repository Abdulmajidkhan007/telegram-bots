"""Soxta Telegram: haqiqiy Dispatcher + tarmoqsiz sessiya. Testlar shu orqali update yuboradi
va bot nima yuborganini (session.sent) tekshiradi."""
import io
from datetime import datetime

from aiogram import Bot
from aiogram.client.session.base import BaseSession
from aiogram.methods import CreateInvoiceLink, GetMe, SendDocument, SendMessage, SendPhoto, TelegramMethod
from aiogram.types import Chat, Message, Update, User
from conftest import dispatcher
from pypdf import PdfWriter

from hr_bot.config import Config

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
        if isinstance(method, CreateInvoiceLink):
            return f"https://t.me/$invoice{len(self.sent)}"
        if isinstance(method, (SendMessage, SendDocument, SendPhoto)):
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
    def __init__(self, sm, **cfg):
        self.session = FakeSession()
        self.bot = Bot("42:" + "A" * 35, session=self.session)
        self.bot.download = self._download
        self.cfg = Config(**{**dict(bot_token="x", admin_ids=frozenset({ADMIN}), database_url="", gemini_api_key="",
                                    gemini_model="m", ai_daily_limit=0, cv_retention_days=30), **cfg})
        self.dp = dispatcher(sm, self.cfg, None)
        self.n = 0

    async def _download(self, file, destination):
        destination.write(_pdf_matnli())

    def _user(self, uid):
        return User(id=uid, is_bot=False, first_name=f"U{uid}", language_code="uz")

    async def feed(self, **update):
        self.n += 1
        await self.dp.feed_update(self.bot, Update.model_validate({"update_id": self.n, **update}))

    async def msg(self, uid, text=None, document=None, **extra):
        self.n += 1
        m = Message(message_id=self.n, date=datetime.now(), chat=Chat(id=uid, type="private"),
                    from_user=self._user(uid), text=text, document=document, **extra,
                    entities=[{"type": "bot_command", "offset": 0, "length": len(text.split()[0])}]
                    if text and text.startswith("/") else None)
        await self.dp.feed_update(self.bot, Update(update_id=self.n, message=m))

    async def press(self, uid, data):
        self.n += 1
        msg = Message(message_id=1, date=datetime.now(), chat=Chat(id=uid, type="private"), text="x")
        cb = {"id": str(self.n), "from": self._user(uid).model_dump(), "chat_instance": "1", "data": data,
              "message": msg.model_dump()}
        await self.dp.feed_update(self.bot, Update.model_validate({"update_id": self.n, "callback_query": cb}))

    def sent(self, kind, **match):
        return [m for m in self.session.sent if isinstance(m, kind)
                and all(getattr(m, k) == v for k, v in match.items())]

    def texts(self, uid=None):
        return [m.text for m in self.session.sent if isinstance(m, SendMessage) and (uid is None or m.chat_id == uid)]

    def last_markup(self, uid):
        for m in reversed(self.session.sent):
            if isinstance(m, (SendMessage, SendDocument, SendPhoto)) and m.chat_id == uid and m.reply_markup:
                return [b.callback_data or b.url for row in m.reply_markup.inline_keyboard for b in row]
        raise AssertionError("tugma yo'q")
