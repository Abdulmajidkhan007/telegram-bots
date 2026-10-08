"""Bot profili matnlari Telegram chegaralariga sig'adimi (oshsa API rad etadi)."""
import asyncio
import re
from unittest.mock import AsyncMock

import bot_profile


def test_tavsif_chegaralari():
    assert 0 < len(bot_profile.DESCRIPTION) <= 512
    assert 0 < len(bot_profile.SHORT_DESCRIPTION) <= 120


def test_buyruqlar_formati():
    for cmd, desc in bot_profile.SUPER_ADMIN_COMMANDS:
        assert re.fullmatch(r"[a-z0-9_]{1,32}", cmd), cmd
        assert 1 <= len(desc) <= 256


def test_admin_buyruqlari_oddiy_menyuda_yoq():
    oddiy = {c for c, _ in bot_profile.USER_COMMANDS}
    assert "backup" not in oddiy and "restore" not in oddiy


def test_bittasi_yiqilsa_qolganlari_ornatiladi():
    bot = AsyncMock()
    bot.set_my_description.side_effect = RuntimeError("limit")
    asyncio.run(bot_profile.apply(bot, 7000000001))
    bot.set_my_short_description.assert_awaited_once()
    assert bot.set_my_commands.await_count == 2
