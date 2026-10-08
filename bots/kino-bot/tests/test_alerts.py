import asyncio
import logging
from unittest.mock import AsyncMock

import alerts

TOKEN = "123456789:AAH" + "x" * 32


def test_throttle_bir_xil_xato_oynada_bir_marta():
    t = alerts.Throttle(same_window=600, hourly_limit=20)
    assert t.allow("a", 0)
    assert not t.allow("a", 100)
    assert t.allow("b", 100)
    assert t.allow("a", 601)


def test_throttle_soatlik_chegara():
    t = alerts.Throttle(same_window=0, hourly_limit=3)
    assert [t.allow(str(i), i) for i in range(5)] == [True, True, True, False, False]
    assert t.allow("yangi", 3601)


def test_token_yashiriladi():
    assert TOKEN not in alerts.redact(f"url /bot{TOKEN}/getMe", [TOKEN])
    assert TOKEN not in alerts.redact(f"boshqa {TOKEN}", [])   # ro'yxatda bo'lmasa ham


def test_format_qisqartiriladi_va_html_xavfsiz():
    rec = logging.LogRecord("x", logging.ERROR, __file__, 1, "y" * 10000 + "<script>", None, None)
    text = alerts.format_alert(rec, [])
    assert len(text) < 4096                       # Telegram chegarasi
    assert text.rstrip("</pre>").endswith("&lt;script&gt;")   # oxiri saqlangan va escape qilingan
    assert "<script>" not in text


def _handler(bot):
    h = alerts.TelegramAlertHandler(bot, 42, [TOKEN], alerts.Throttle(same_window=600, hourly_limit=20))
    log = logging.getLogger("kino-test")
    log.addHandler(h)
    log.propagate = False
    return h, log


def test_error_adminga_ketadi_token_siz():
    bot = AsyncMock()

    async def go():
        h, log = _handler(bot)
        log.error("Ulanish xatosi %s", TOKEN)
        log.error("Ulanish xatosi %s", TOKEN)     # takror — yuborilmaydi
        log.warning("bu ogohlantirish")          # ERROR emas — yuborilmaydi
        await asyncio.sleep(0)
        await asyncio.gather(*h._tasks)
        log.removeHandler(h)
    asyncio.run(go())
    assert bot.send_message.await_count == 1
    chat_id, text = bot.send_message.await_args.args
    assert chat_id == 42 and TOKEN not in text and "Ulanish xatosi" in text


def test_yuborish_yiqilsa_halqa_bolmaydi():
    bot = AsyncMock()
    bot.send_message.side_effect = RuntimeError("tarmoq yo'q")

    async def go():
        h, log = _handler(bot)
        logging.getLogger("alerts").addHandler(h)
        log.error("birinchi xato")
        await asyncio.sleep(0)
        await asyncio.gather(*h._tasks, return_exceptions=True)
        await asyncio.sleep(0)
        logging.getLogger("alerts").removeHandler(h)
        log.removeHandler(h)
    asyncio.run(go())
    assert bot.send_message.await_count == 1


def test_event_loop_bolmasa_jim_otadi():
    bot = AsyncMock()
    h, log = _handler(bot)
    log.error("loop yo'q")
    log.removeHandler(h)
    bot.send_message.assert_not_called()
