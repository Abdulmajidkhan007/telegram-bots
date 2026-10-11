"""Testlar bot papkasidan: python -m pytest. Internetga chiqmaydi (Telegram va Gemini mock)."""
import asyncio
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from hr_bot.db import init_db, make_engine  # noqa: E402


@pytest.fixture()
def sm(tmp_path):
    """Har testga toza SQLite baza (fayl — :memory: har ulanishda yangi bo'lib qoladi)."""
    engine = make_engine(f"sqlite+aiosqlite:///{tmp_path / 't.db'}")
    sessionmaker = asyncio.run(init_db(engine))
    yield sessionmaker
    asyncio.run(engine.dispose())


_DP = None


def dispatcher(sessionmaker, cfg, scorer=None):
    """Router'lar modul darajasida — Dispatcher'ni bir marta yig'ib, har testda
    faqat DI ma'lumotini (baza, sozlama) va FSM xotirasini almashtiramiz."""
    global _DP
    from aiogram.fsm.storage.memory import MemoryStorage

    from hr_bot.main import build_dispatcher
    if _DP is None:
        _DP = build_dispatcher(sessionmaker, cfg, scorer)
    _DP.workflow_data.update(sessionmaker=sessionmaker, cfg=cfg, scorer=scorer)
    _DP.fsm.storage = MemoryStorage()
    return _DP


def run(coro):
    return asyncio.run(coro)
