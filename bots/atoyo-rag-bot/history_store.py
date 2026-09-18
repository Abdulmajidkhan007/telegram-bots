"""Suhbat tarixi — SQLite da.

Xotiradagi dict ishlatilmaydi: u restartda yo'qoladi va foydalanuvchilar
soni ortgani sari cheksiz o'sadi. Bir do'kon boti uchun SQLite yetarli.
"""

import sqlite3

import config

# Promptga qo'shiladigan oxirgi xabarlar soni. Ko'paytirish token narxini
# oshiradi, kamaytirish esa "avval aytgan edim" holatini buzadi.
TARIX_CHUQURLIGI = 8


def init():
    with sqlite3.connect(config.HISTORY_DB) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                rol TEXT NOT NULL,
                matn TEXT NOT NULL,
                vaqt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_history_user ON history(user_id, id)")


def qosh(user_id, rol, matn):
    with sqlite3.connect(config.HISTORY_DB) as conn:
        conn.execute("INSERT INTO history (user_id, rol, matn) VALUES (?, ?, ?)",
                     (user_id, rol, matn))


def ol(user_id, limit=TARIX_CHUQURLIGI):
    """Oxirgi xabarlarni xronologik tartibda qaytaradi."""
    with sqlite3.connect(config.HISTORY_DB) as conn:
        qatorlar = conn.execute(
            "SELECT rol, matn FROM history WHERE user_id = ? ORDER BY id DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
    return list(reversed(qatorlar))


def tozala(user_id):
    with sqlite3.connect(config.HISTORY_DB) as conn:
        conn.execute("DELETE FROM history WHERE user_id = ?", (user_id,))
