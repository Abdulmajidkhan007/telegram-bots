"""Testlar bot papkasidan: python -m pytest. Internetga chiqmaydi (Telegram va Gemini mock)."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def run(coro):
    return asyncio.run(coro)
