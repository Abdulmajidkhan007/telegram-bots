"""Update'lar haqiqiy aiogram Dispatcher orqali o'tadi; Telegram API mock (internet yo'q)."""
import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, patch

from aiogram import Bot
from aiogram.fsm.storage.base import StorageKey
from aiogram.methods import SendMessage
from aiogram.types import Update

import database as db
import handlers_admin
from common import AddMovie, IsAdmin
from conftest import SUPER
from main import build_dispatcher

BOT_TOKEN = "123456:TEST_ONLY_not_a_real_token"
ODDIY = 4242
_uid = iter(range(1, 10_000))


def _user(uid):
    return {"id": uid, "is_bot": False, "first_name": "Test"}


def _msg(uid, text):
    return {"message_id": next(_uid), "date": int(datetime.now().timestamp()),
            "chat": {"id": uid, "type": "private"}, "from": _user(uid), "text": text}


# Router'lar modul darajasidagi obyektlar — aiogram ularni faqat bitta
# Dispatcher'ga ulashga ruxsat beradi, shuning uchun bitta dp, holat har testda tozalanadi.
DP = build_dispatcher()


def _run(updates, state=None, uid=None):
    """Update'larni ketma-ket beradi; Bot chaqiruvlari ro'yxatini qaytaradi."""
    async def go():
        dp = DP
        bot = Bot(BOT_TOKEN)
        for u in (SUPER, ODDIY):
            await dp.storage.set_state(StorageKey(bot.id, u, u), state if u == uid else None)
            await dp.storage.set_data(StorageKey(bot.id, u, u), {})
        with patch.object(Bot, "__call__", new=AsyncMock()) as call:
            for u in updates:
                await dp.feed_update(bot, Update.model_validate({"update_id": next(_uid), **u}, context={"bot": bot}))
            calls = [c.args[0] for c in call.call_args_list]
        st = await dp.storage.get_state(StorageKey(bot.id, uid, uid)) if uid else None
        return calls, st
    return asyncio.run(go())


def _callback(uid, data):
    return {"callback_query": {"id": str(next(_uid)), "from": _user(uid), "chat_instance": "x",
                               "data": data, "message": _msg(uid, "tugmalar")}}


def test_admin_router_butunlay_isadmin_bilan_oralgan():
    for observer in (handlers_admin.router.message, handlers_admin.router.callback_query):
        assert any(isinstance(f.callback, IsAdmin) for f in observer._handler.filters or [])


def test_oddiy_foydalanuvchi_callback_bilan_kino_ochira_olmaydi(baza):
    # Regressiya: inline tugma handlerlarida admin tekshiruvi yo'q edi.
    db.add_movie("12", "Avatar", "-", "-", "-", "-", "f")
    _run([_callback(ODDIY, "del_movie_yes_12")])
    assert db.get_movie("12") is not None


def test_oddiy_foydalanuvchi_admin_ochira_olmaydi(baza):
    db.add_admin(555, "Sardor")
    _run([_callback(ODDIY, "admin_remove_yes_555")])
    assert db.is_admin(555)


def test_admin_callback_bilan_kino_ochiradi(baza):
    db.add_movie("12", "Avatar", "-", "-", "-", "-", "f")
    _run([_callback(SUPER, "del_movie_yes_12")])
    assert db.get_movie("12") is None


def test_kino_qoshishda_menyu_tugmasi_kod_bolmaydi(baza):
    # Regressiya: "🎬 Kino qo'shish" kod, "🗑 Kinoni o'chirish" janr bo'lib saqlangan edi.
    calls, state = _run([{"message": _msg(SUPER, "🗑 Kinoni o'chirish")}], state=AddMovie.code, uid=SUPER)
    assert state == AddMovie.code.state
    assert db.get_movie_count() == 0
    assert any(isinstance(c, SendMessage) and "menyu tugmasi" in c.text for c in calls)


def test_kino_qoshish_toliq_oqim(baza):
    steps = ["001", "Avatar <2>", "Fantastika", "2009", "720p", "Tavsif"]
    video = _msg(SUPER, None)
    del video["text"]
    video["video"] = {"file_id": "VID", "file_unique_id": "u", "width": 1, "height": 1, "duration": 1}
    _run([{"message": _msg(SUPER, t)} for t in steps] + [{"message": video}], state=AddMovie.code, uid=SUPER)
    assert db.get_movie("001")["name"] == "Avatar <2>"
    assert db.get_movie("001")["video_file_id"] == "VID"


def test_topilmagan_kod_html_xavfsiz_qaytariladi(baza):
    # Regressiya: "<" li kod javobni Telegram'da yiqitardi.
    calls, _ = _run([{"message": _msg(ODDIY, "<b")}])
    texts = [c.text for c in calls if isinstance(c, SendMessage)]
    assert any("&lt;b" in t and "topilmadi" in t for t in texts)


def test_stikerda_kod_kutish_yiqilmaydi(baza):
    from common import MovieSearch
    sticker = _msg(ODDIY, None)
    del sticker["text"]
    sticker["sticker"] = {"file_id": "s", "file_unique_id": "u", "type": "regular",
                          "width": 1, "height": 1, "is_animated": False, "is_video": False}
    calls, state = _run([{"message": sticker}], state=MovieSearch.waiting_code, uid=ODDIY)
    assert state == MovieSearch.waiting_code.state
    assert any(isinstance(c, SendMessage) and "matn" in c.text for c in calls)


def test_backup_faqat_bosh_adminga(baza):
    from aiogram.methods import SendDocument
    db.add_admin(555, "Oddiy admin")
    calls, _ = _run([{"message": _msg(555, "/backup")}])
    assert not any(isinstance(c, SendDocument) for c in calls)
    calls, _ = _run([{"message": _msg(SUPER, "/backup")}])
    assert any(isinstance(c, SendDocument) for c in calls)


def test_restore_eski_bazani_tiklaydi(baza):
    import io
    import json
    from common import RestoreDb
    eski = {"movies": {"7": {"name": "Eski kino", "video_file_id": "f"},
                       "🎬 Kino qo'shish": {"name": "axlat"}},
            "users": {"1": {"full_name": "A"}}, "admins": [], "channels": []}
    doc = _msg(SUPER, None)
    del doc["text"]
    doc["document"] = {"file_id": "D", "file_unique_id": "u", "file_name": "database.json", "file_size": 100}
    payload = io.BytesIO(json.dumps(eski, ensure_ascii=False).encode())
    with patch.object(Bot, "download", new=AsyncMock(return_value=payload)):
        calls, state = _run([{"message": doc}], state=RestoreDb.waiting_file, uid=SUPER)
    assert state is None
    assert db.get_movie("7")["name"] == "Eski kino"
    assert db.get_movie_count() == 1
    assert any(isinstance(c, SendMessage) and "tashlab yuborildi" in c.text for c in calls)
