"""Haqiqiy Dispatcher + soxta Telegram sessiyasi (tarmoqsiz), Gemini mock."""
import shutil
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from aiogram import Bot
from aiogram.client.session.base import BaseSession
from aiogram.methods import AnswerCallbackQuery, SendMessage, SendVoice
from aiogram.types import Chat, Message, Update, User
from conftest import run

from ovoz_bot import gemini as g
from ovoz_bot.main import build_dispatcher
from ovoz_bot.store import Store
from test_audio import _pcm, _wav

USER, ADMIN = 5, 9
FFMPEG = shutil.which("ffmpeg")
_DP = None


class FakeSession(BaseSession):
    def __init__(self):
        super().__init__()
        self.sent = []

    async def make_request(self, bot, method, timeout=None):
        self.sent.append(method)
        if isinstance(method, (SendMessage, SendVoice)):
            return Message(message_id=1, date=datetime.now(), chat=Chat(id=method.chat_id, type="private"))
        return True

    async def stream_content(self, *a, **kw):
        yield b""

    async def close(self):
        pass


class Sim:
    def __init__(self, limit=2, stt=None, tts=None):
        global _DP
        self.session = FakeSession()
        self.bot = Bot("42:" + "A" * 35, session=self.session)
        self.bot.download = AsyncMock(side_effect=lambda f, destination: destination.write(b"OggS..."))
        self.gem = MagicMock()
        self.gem.transcribe = AsyncMock(side_effect=stt)
        self.gem.synthesize = AsyncMock(side_effect=tts)
        self.store = Store(":memory:")
        cfg = SimpleNamespace(admin_ids=frozenset({ADMIN}), daily_limit=limit, tts_max_chars=50,
                              default_voice="Kore", ffmpeg=FFMPEG or "ffmpeg")
        if _DP is None:
            _DP = build_dispatcher(cfg, self.store, self.gem)
        _DP.workflow_data.update(cfg=cfg, store=self.store, gemini=self.gem)
        self.dp, self.n = _DP, 0

    async def send(self, uid=USER, **kw):
        self.n += 1
        if kw.get("text", "").startswith("/"):
            kw["entities"] = [{"type": "bot_command", "offset": 0, "length": len(kw["text"].split()[0])}]
        m = Message(message_id=self.n, date=datetime.now(), chat=Chat(id=uid, type="private"),
                    from_user=User(id=uid, is_bot=False, first_name="U"), **kw)
        await self.dp.feed_update(self.bot, Update(update_id=self.n, message=m))

    async def press(self, data, uid=USER):
        self.n += 1
        msg = Message(message_id=1, date=datetime.now(), chat=Chat(id=uid, type="private"), text="x")
        await self.dp.feed_update(self.bot, Update.model_validate({"update_id": self.n, "callback_query": {
            "id": str(self.n), "from": {"id": uid, "is_bot": False, "first_name": "U"}, "chat_instance": "1",
            "data": data, "message": msg.model_dump()}}))

    def texts(self):
        return [m.text for m in self.session.sent if isinstance(m, SendMessage)]


VOICE = {"file_id": "V1", "file_unique_id": "u", "duration": 3, "mime_type": "audio/ogg", "file_size": 1000}


def test_ovoz_matnga_va_html_escape():
    s = Sim(stt=["Salom <b>dunyo</b>"])
    run(s.send(voice=VOICE))
    assert s.texts()[-1] == "Salom &lt;b&gt;dunyo&lt;/b&gt;"
    assert s.gem.transcribe.call_args.args[1] == "audio/ogg"
    assert s.store.used(USER) == 1


def test_band_bolsa_xabar_va_limit_qaytadi():
    s = Sim(stt=g.Busy("503"))
    run(s.send(voice=VOICE))
    assert "hozir band" in s.texts()[-1] and s.store.used(USER) == 0


def test_limit_tugasa_geminiga_bormaydi():
    s = Sim(limit=1, stt=["a", "b"])
    run(s.send(voice=VOICE)); run(s.send(voice=VOICE))
    assert "limit tugadi" in s.texts()[-1] and s.gem.transcribe.await_count == 1


def test_admin_limitsiz():
    s = Sim(limit=1, stt=["a", "b", "c"])
    for _ in range(3):
        run(s.send(uid=ADMIN, voice=VOICE))
    assert s.gem.transcribe.await_count == 3


def test_20mb_dan_katta_yuklanmaydi():
    s = Sim(stt=["x"])
    run(s.send(voice={**VOICE, "file_size": 21 * 1024 * 1024}))
    assert "20 MB" in s.texts()[-1]
    s.bot.download.assert_not_called()
    assert s.store.used(USER) == 0


def test_audio_bolmagan_hujjat():
    s = Sim()
    run(s.send(document={"file_id": "D", "file_unique_id": "d", "mime_type": "application/pdf", "file_size": 10}))
    assert "audio/video emas" in s.texts()[-1]


def test_uzun_matn_ttsga_ketmaydi():
    s = Sim(tts=[b""])
    run(s.send(text="a" * 51))
    assert "chegara 50" in s.texts()[-1]
    s.gem.synthesize.assert_not_called()


@pytest.mark.skipif(not FFMPEG, reason="ffmpeg o'rnatilmagan")
def test_matn_ovozga_ogg_voice_va_ai_belgisi():
    s = Sim(tts=[_wav(_pcm())])
    run(s.send(text="Salom"))
    voice = [m for m in s.session.sent if isinstance(m, SendVoice)][-1]
    assert voice.caption == "🤖 AI ovoz"
    assert voice.voice.data[:4] == b"OggS"
    assert s.gem.synthesize.call_args.args == ("Salom", "Kore")


def test_tts_xatosi_sababi_aytiladi():
    s = Sim(tts=g.GeminiError("400: blocked"))
    run(s.send(text="Salom"))
    assert "Ovoz yaratib bo'lmadi: 400: blocked" in s.texts()[-1] and s.store.used(USER) == 0


def test_ovoz_tanlash_va_soxta_callback():
    s = Sim(tts=[b"x"])
    run(s.press("vc:Puck"))
    assert s.store.get_voice(USER) == "Puck"
    run(s.press("vc:Hacker"))
    assert s.store.get_voice(USER) == "Puck"
    alert = [m for m in s.session.sent if isinstance(m, AnswerCallbackQuery)][-1]
    assert alert.show_alert


def test_buyruqlar_ttsga_ketmaydi():
    s = Sim(tts=[b"x"])
    run(s.send(text="/start")); run(s.send(text="/limit")); run(s.send(text="/nomalum"))
    s.gem.synthesize.assert_not_called()
    assert "Ovoz bot" in s.texts()[0] and "Bugun: 0 / 2" in s.texts()[1]
