"""Kunlik limit va tanlangan ovoz — SQLite (standart kutubxona, qo'shimcha xizmat yo'q).

Har amal qisqa va bitta tranzaksiya: limitni "olish" va "tekshirish" bitta
UPDATE ichida — bir vaqtda kelgan ikki xabar limitdan oshib ketmasin.
"""
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Kun chegarasi — Toshkent yarim tunida (UTC+5, yozgi vaqt yo'q).
TASHKENT = timezone(timedelta(hours=5))


def today(at: datetime | None = None) -> str:
    return (at or datetime.now(timezone.utc)).astimezone(TASHKENT).strftime("%Y-%m-%d")


class Store:
    def __init__(self, path: Path | str):
        if str(path) != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(str(path), isolation_level=None)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("CREATE TABLE IF NOT EXISTS usage (user_id INTEGER, day TEXT, used INTEGER, PRIMARY KEY (user_id, day))")
        self.db.execute("CREATE TABLE IF NOT EXISTS prefs (user_id INTEGER PRIMARY KEY, voice TEXT)")

    def consume(self, user_id: int, limit: int, unlimited: bool = False, day: str | None = None) -> bool:
        """Bitta so'rovni hisobga oladi. False — bugungi limit tugagan (hisob o'zgarmaydi)."""
        day = day or today()
        if unlimited:
            return True
        self.db.execute("INSERT OR IGNORE INTO usage VALUES (?, ?, 0)", (user_id, day))
        cur = self.db.execute("UPDATE usage SET used = used + 1 WHERE user_id = ? AND day = ? AND used < ?",
                              (user_id, day, limit))
        return cur.rowcount == 1

    def refund(self, user_id: int, day: str | None = None) -> None:
        """Gemini yoki ffmpeg yiqilsa — foydalanuvchi natija olmagan, limitdan yechilmasin."""
        self.db.execute("UPDATE usage SET used = MAX(used - 1, 0) WHERE user_id = ? AND day = ?",
                        (user_id, day or today()))

    def used(self, user_id: int, day: str | None = None) -> int:
        row = self.db.execute("SELECT used FROM usage WHERE user_id = ? AND day = ?", (user_id, day or today())).fetchone()
        return row[0] if row else 0

    def get_voice(self, user_id: int) -> str | None:
        row = self.db.execute("SELECT voice FROM prefs WHERE user_id = ?", (user_id,)).fetchone()
        return row[0] if row else None

    def set_voice(self, user_id: int, voice: str) -> None:
        self.db.execute("INSERT INTO prefs VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET voice = excluded.voice",
                        (user_id, voice))

    def close(self) -> None:
        self.db.close()
