# ============================================================
#  ALERTS.PY — ERROR loglarini bosh adminga Telegram orqali yuborish
# ============================================================
# Railway loglariga telefondan kirish noqulay — xato bo'lsa admin buni
# botning o'zidan bilsin. Uchta xavf bor va har biri yopilgan:
#   1. Spam: bir xil xato (masalan, deploy paytidagi Conflict) qayta-qayta
#      kelmasin — bir xil xabar 10 daqiqada bir marta, jami soatiga 20 tadan ko'p emas.
#   2. Sir: xabarda token bo'lsa — yashiriladi.
#   3. Halqa: yuborishning o'zi yiqilsa, u ERROR emas WARNING bo'lib yoziladi —
#      aks holda "xatoni yuborishdagi xato" yana yuborilishga urinardi.

import asyncio
import logging
import re
import time
from html import escape

logger = logging.getLogger("alerts")

SAME_WINDOW = 10 * 60
HOURLY_LIMIT = 20
MAX_LEN = 3500   # Telegram chegarasi 4096, sarlavha va <pre> uchun joy qoladi


class Throttle:
    """Toza mantiq (vaqt tashqaridan beriladi) — testda soat kutilmaydi."""

    def __init__(self, same_window: int = SAME_WINDOW, hourly_limit: int = HOURLY_LIMIT):
        self.same_window = same_window
        self.hourly_limit = hourly_limit
        self._last_by_key: dict[str, float] = {}
        self._sent: list[float] = []

    def allow(self, key: str, now: float) -> bool:
        self._sent = [t for t in self._sent if now - t < 3600]
        if now - self._last_by_key.get(key, -1e18) < self.same_window:
            return False
        if len(self._sent) >= self.hourly_limit:
            return False
        self._last_by_key[key] = now
        self._sent.append(now)
        return True


def redact(text: str, secrets: list[str]) -> str:
    for s in secrets:
        if s:
            text = text.replace(s, "***")
    # Har ehtimolga qarshi: istalgan bot token ko'rinishidagi satr ham yashiriladi.
    return re.sub(r"\b\d{6,12}:[A-Za-z0-9_-]{30,}\b", "***", text)


def format_alert(record: logging.LogRecord, secrets: list[str]) -> str:
    body = record.getMessage()
    if record.exc_info:
        body += "\n\n" + logging.Formatter().formatException(record.exc_info)
    body = redact(body, secrets)
    if len(body) > MAX_LEN:
        # Traceback'ning oxiri muhimroq — xato qatori o'sha yerda.
        body = "…" + body[-MAX_LEN:]
    return f"🚨 <b>Xato</b> · <code>{escape(record.name)}</code>\n<pre>{escape(body)}</pre>"


class TelegramAlertHandler(logging.Handler):
    def __init__(self, bot, chat_id: int, secrets: list[str], throttle: Throttle | None = None):
        super().__init__(level=logging.ERROR)
        self.bot = bot
        self.chat_id = chat_id
        self.secrets = secrets
        self.throttle = throttle or Throttle()
        self._tasks: set[asyncio.Task] = set()

    def emit(self, record: logging.LogRecord) -> None:
        if record.name == logger.name:
            return
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return   # event loop yo'q (ishga tushish/to'xtash) — faqat stdout log'i qoladi
        # Kalit: logger + xabar shabloni (argumentlarsiz) — "Reklama yetmadi [123]" va
        # "[456]" bitta xato turi hisoblanadi.
        if not self.throttle.allow(f"{record.name}:{record.msg}", time.monotonic()):
            return
        task = loop.create_task(self._send(format_alert(record, self.secrets)))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def _send(self, text: str) -> None:
        try:
            await self.bot.send_message(self.chat_id, text, parse_mode="HTML")
        except Exception as e:
            logger.warning("Xato xabarini adminga yuborib bo'lmadi: %s", e)


def install(bot, chat_id: int, secrets: list[str]) -> TelegramAlertHandler:
    handler = TelegramAlertHandler(bot, chat_id, secrets)
    logging.getLogger().addHandler(handler)
    return handler
