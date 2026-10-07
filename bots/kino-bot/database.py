# ============================================================
#  DATABASE.PY — Ma'lumotlar bazasi (JSON fayl)
# ============================================================
# Funksiyalar sinxron va ichida await yo'q — bitta jarayonda o'qish va yozish
# orasiga boshqa handler kirib qololmaydi, shuning uchun qulf kerak emas.

import json
import os
import re
from datetime import datetime
from pathlib import Path

# main.py configure() bilan o'rnatadi; testlar vaqtinchalik faylni beradi.
# config.py bu yerda import qilinmaydi — aks holda testlar uchun ham BOT_TOKEN kerak bo'lardi.
_db_file: Path | None = None
_super_admin_id: int = 0

# Kod tugma callback_data'siga tushadi ("del_movie_yes_<kod>", Telegram chegarasi
# 64 bayt) va foydalanuvchi uni qo'lda yozadi — shuning uchun qisqa va oddiy belgilar.
CODE_RE = re.compile(r"[0-9A-Za-z_-]{1,32}")


def configure(db_file: Path, super_admin_id: int) -> None:
    global _db_file, _super_admin_id
    _db_file = Path(db_file)
    _super_admin_id = int(super_admin_id)


def super_admin_id() -> int:
    return _super_admin_id


def valid_code(code: str) -> bool:
    return bool(CODE_RE.fullmatch(code or ""))


# ─────────────────────────────────────────────
#  LOAD / SAVE
# ─────────────────────────────────────────────

def _default_db() -> dict:
    return {
        "movies": {},           # {code: {...movie data...}}
        "users": {},            # {user_id: {...user data...}}
        "groups": {},           # {chat_id: {...group data...}}
        "admins": [{"id": _super_admin_id, "name": "Super Admin"}],
        "channels": [],         # [{chat_id, username, title, invite_link}]
        "stats": {
            "total_downloads": 0,
            "movie_downloads": {},   # {movie_code: count}
            "left_users": 0,
        },
    }


def _path() -> Path:
    if _db_file is None:
        raise RuntimeError("database.configure() chaqirilmagan")
    return _db_file


def load_db() -> dict:
    path = _path()
    if not path.exists():
        db = _default_db()
        save_db(db)
        return db
    with open(path, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError as e:
            # Bo'sh baza bilan davom etib, ustidan yozib yubormaymiz —
            # 100+ foydalanuvchi va kinolar yo'qolardi. Bot to'xtaydi, sabab aniq.
            raise RuntimeError(f"{path} buzilgan JSON ({e}). /restore yoki zaxiradan tiklang.") from e


def save_db(data: dict) -> None:
    # Atomik yozuv: to'g'ridan-to'g'ri yozilsa, jarayon o'rtada o'lsa (Railway
    # restart, telefon o'chishi) fayl yarim yozilib qolib, butun baza yo'qolardi.
    path = _path()
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)


def validate_db(data) -> tuple[dict, list[str]]:
    """Tashqaridan kelgan bazani (/restore) tekshiradi.

    Qaytaradi: (tozalangan baza, tashlab yuborilgan kino kodlari).
    Tuzilma noto'g'ri bo'lsa — ValueError (nima yetishmasligi bilan).
    """
    if not isinstance(data, dict):
        raise ValueError("JSON ichida obyekt ({...}) kutilgan")
    for key, turi in (("movies", dict), ("users", dict), ("admins", list), ("channels", list)):
        if not isinstance(data.get(key), turi):
            raise ValueError(f'"{key}" bo\'limi yo\'q yoki turi noto\'g\'ri')
    clean = _default_db()
    clean.update({k: v for k, v in data.items() if k in clean})
    clean["groups"] = data.get("groups") if isinstance(data.get("groups"), dict) else {}
    clean["stats"] = {**_default_db()["stats"], **(data.get("stats") or {})}
    skipped = [c for c in clean["movies"] if not valid_code(c)]
    clean["movies"] = {c: m for c, m in clean["movies"].items() if valid_code(c)}
    if _super_admin_id and _super_admin_id not in _admin_ids(clean):
        clean["admins"].insert(0, {"id": _super_admin_id, "name": "Super Admin"})
    return clean, skipped


# ─────────────────────────────────────────────
#  USERS
# ─────────────────────────────────────────────

def register_user(user_id: int, username: str, full_name: str) -> bool:
    """Yangi foydalanuvchini ro'yxatga oladi. True = yangi, False = avval bor."""
    db = load_db()
    key = str(user_id)
    if key not in db["users"]:
        db["users"][key] = {
            "username": username or "",
            "full_name": full_name,
            "joined_at": datetime.now().isoformat(),
            "is_active": True,
        }
        save_db(db)
        return True
    if not db["users"][key].get("is_active"):
        db["users"][key]["is_active"] = True
        save_db(db)
    return False


def deactivate_user(user_id: int) -> None:
    """Foydalanuvchi botni bloklasa — faolsizlashtiradi."""
    db = load_db()
    user = db["users"].get(str(user_id))
    # Faqat faol bo'lsa sanaymiz: har reklamada qayta sanalib, "tark etganlar"
    # soni haqiqiydan oshib ketardi.
    if user and user.get("is_active", True):
        user["is_active"] = False
        db["stats"]["left_users"] = db["stats"].get("left_users", 0) + 1
        save_db(db)


def get_all_active_user_ids() -> list[int]:
    db = load_db()
    return [int(uid) for uid, data in db["users"].items() if data.get("is_active", True)]


def get_user_stats() -> dict:
    db = load_db()
    users = db["users"]
    today = datetime.now().date().isoformat()
    return {
        "total": len(users),
        "active": sum(1 for u in users.values() if u.get("is_active", True)),
        "joined_today": sum(1 for u in users.values() if u.get("joined_at", "")[:10] == today),
        "left": db["stats"].get("left_users", 0),
    }


# ─────────────────────────────────────────────
#  GROUPS
# ─────────────────────────────────────────────

def register_group(chat_id: int, title: str) -> None:
    db = load_db()
    key = str(chat_id)
    if key not in db["groups"]:
        db["groups"][key] = {
            "title": title,
            "joined_at": datetime.now().isoformat(),
            "is_active": True,
        }
        save_db(db)


def deactivate_group(chat_id: int) -> None:
    db = load_db()
    key = str(chat_id)
    if key in db["groups"]:
        db["groups"][key]["is_active"] = False
        save_db(db)


def get_all_active_group_ids() -> list[int]:
    db = load_db()
    return [int(cid) for cid, data in db["groups"].items() if data.get("is_active", True)]


# ─────────────────────────────────────────────
#  MOVIES
# ─────────────────────────────────────────────

def get_movie(code: str) -> dict | None:
    return load_db()["movies"].get(code)


def movie_exists(code: str) -> bool:
    return code in load_db()["movies"]


def add_movie(code: str, name: str, genre: str, year: str,
              quality: str, description: str, video_file_id: str) -> None:
    if not valid_code(code):
        raise ValueError(f"Noto'g'ri kino kodi: {code!r}")
    db = load_db()
    db["movies"][code] = {
        "name": name,
        "genre": genre,
        "year": year,
        "quality": quality,
        "description": description,
        "video_file_id": video_file_id,
        "added_at": datetime.now().isoformat(),
    }
    save_db(db)


def delete_movie(code: str) -> dict | None:
    db = load_db()
    movie = db["movies"].pop(code, None)
    if movie:
        save_db(db)
    return movie


def get_movie_count() -> int:
    return len(load_db()["movies"])


def increment_download(code: str) -> int:
    db = load_db()
    db["stats"]["total_downloads"] = db["stats"].get("total_downloads", 0) + 1
    downloads = db["stats"].get("movie_downloads", {})
    downloads[code] = downloads.get(code, 0) + 1
    db["stats"]["movie_downloads"] = downloads
    save_db(db)
    return downloads[code]


def get_download_stats() -> dict:
    stats = load_db().get("stats", {})
    return {
        "total": stats.get("total_downloads", 0),
        "by_movie": stats.get("movie_downloads", {}),
    }


def get_top_movies(limit: int = 5) -> list[tuple]:
    db = load_db()
    downloads = db["stats"].get("movie_downloads", {})
    movies = db["movies"]
    top = sorted(downloads.items(), key=lambda x: x[1], reverse=True)[:limit]
    return [(movies.get(code, {}).get("name", code), count) for code, count in top]


# ─────────────────────────────────────────────
#  ADMINS
# ─────────────────────────────────────────────

def _admin_ids(db: dict) -> list[int]:
    """admins ro'yxatidan faqat ID larni qaytaradi (eski va yangi format)."""
    return [int(a["id"]) if isinstance(a, dict) else int(a) for a in db.get("admins", [])]


def is_admin(user_id: int) -> bool:
    # Bosh admin bazadagi ro'yxatga bog'liq emas — ro'yxat buzilsa ham
    # botni boshqarish huquqi yo'qolmaydi.
    if _super_admin_id and user_id == _super_admin_id:
        return True
    return user_id in _admin_ids(load_db())


def get_all_admins() -> list[dict]:
    """[{id, name}, ...] formatida qaytaradi."""
    return [
        a if isinstance(a, dict) else {"id": int(a), "name": str(a)}
        for a in load_db().get("admins", [])
    ]


def add_admin(user_id: int, name: str = "") -> bool:
    """True = qo'shildi, False = avval bor."""
    db = load_db()
    if user_id in _admin_ids(db):
        return False
    db["admins"].append({"id": user_id, "name": name or str(user_id)})
    save_db(db)
    return True


def remove_admin(user_id: int) -> bool:
    """True = o'chirildi, False = topilmadi yoki bosh admin."""
    if user_id == _super_admin_id:
        return False
    db = load_db()
    before = len(db["admins"])
    db["admins"] = [
        a for a in db["admins"]
        if (a["id"] if isinstance(a, dict) else int(a)) != user_id
    ]
    if len(db["admins"]) == before:
        return False
    save_db(db)
    return True


# ─────────────────────────────────────────────
#  CHANNELS
# ─────────────────────────────────────────────

def get_channels() -> list[dict]:
    return load_db().get("channels", [])


def channel_exists(chat_id: int) -> bool:
    return any(c["chat_id"] == chat_id for c in load_db().get("channels", []))


def add_channel(chat_id: int, username: str, title: str, invite_link: str) -> None:
    db = load_db()
    db["channels"].append({
        "chat_id": chat_id,
        "username": username,
        "title": title,
        "invite_link": invite_link,
    })
    save_db(db)


def remove_channel(chat_id: int) -> dict | None:
    db = load_db()
    channel = next((c for c in db["channels"] if c["chat_id"] == chat_id), None)
    if channel:
        db["channels"] = [c for c in db["channels"] if c["chat_id"] != chat_id]
        save_db(db)
    return channel
