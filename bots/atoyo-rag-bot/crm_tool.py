"""Lidni admin guruhiga va n8n ga uzatish."""

import html
import logging

import aiohttp

import config

log = logging.getLogger(__name__)

# Bitta umumiy sessiya: har chaqiruvda yangi ClientSession ochish TCP
# ulanishlarini behuda sarflaydi va aiohttp ogohlantirish beradi.
_session = None

_TIMEOUT = aiohttp.ClientTimeout(total=5)


async def session():
    global _session
    if _session is None or _session.closed:
        _session = aiohttp.ClientSession(timeout=_TIMEOUT)
    return _session


async def yop():
    if _session and not _session.closed:
        await _session.close()


async def lid_yarat(ism, telefon, mahsulot):
    """Lidni ikki manzilga yuboradi. Qaysi biri ketgani haqida xabar qaytaradi."""
    yuborildi = []

    if config.N8N_WEBHOOK_URL:
        try:
            s = await session()
            async with s.post(config.N8N_WEBHOOK_URL, json={
                "customer_name": ism,
                "phone": telefon,
                "product": mahsulot,
                "source": "Atoyo Telegram AI Bot",
            }) as javob:
                javob.raise_for_status()
            yuborildi.append("n8n")
        except Exception as e:
            # Jim yutilmaydi: n8n o'chiq bo'lsa ham bilib turishimiz kerak,
            # lekin bu tufayli mijozga javob berishni to'xtatmaymiz.
            log.warning("n8n ga yuborilmadi (%s): %s", type(e).__name__, e)

    if config.ADMIN_GROUP_ID:
        matn = (
            "🛒 <b>YANGI BUYURTMA</b>\n\n"
            f"👤 <b>Xaridor:</b> {html.escape(ism)}\n"
            f"📞 <b>Telefon:</b> <code>{html.escape(telefon)}</code>\n"
            f"📦 <b>Mahsulot:</b> {html.escape(mahsulot)}"
        )
        try:
            s = await session()
            url = f"https://api.telegram.org/bot{config.TELEGRAM_BOT_TOKEN}/sendMessage"
            async with s.post(url, json={
                "chat_id": config.ADMIN_GROUP_ID,
                "text": matn,
                "parse_mode": "HTML",
            }) as javob:
                javob.raise_for_status()
            yuborildi.append("admin guruh")
        except Exception as e:
            log.error("Admin guruhiga yuborilmadi (%s): %s", type(e).__name__, e)

    if not yuborildi:
        log.error("Lid HECH QAYERGA yetmadi: %s / %s", ism, telefon)
        return False

    log.info("Lid yuborildi (%s): %s / %s", ", ".join(yuborildi), ism, telefon)
    return True
