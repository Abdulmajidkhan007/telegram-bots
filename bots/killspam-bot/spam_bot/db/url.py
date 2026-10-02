"""DATABASE_URL ni create_engine uchun tayyorlash. Toza funksiya — test qilinadi."""

# requirements.txt psycopg2-binary o'rnatadi. SQLAlchemy 2.1 dan boshlab
# drayversiz `postgresql://` psycopg (v3) ni tanlaydi, shuning uchun drayverni
# aniq yozamiz — aks holda "No module named 'psycopg'" bilan yiqiladi.
_DRIVER = "postgresql+psycopg2://"


def normalize_db_url(raw):
    url = (raw or "").strip().strip('"').strip("'").strip()
    if not url:
        raise ValueError(
            "DATABASE_URL o'rnatilmagan. Railway: bot servisi → Variables → "
            "Add Reference → Postgres → DATABASE_URL.")
    if url.startswith("${{"):
        raise ValueError(
            f"DATABASE_URL Railway havolasi ochilmadi ({url}). Postgres shu "
            "loyihadami va nomi mosmi? Variables → Add Reference orqali qayta qo'shing.")
    for scheme in ("postgres://", "postgresql://"):
        if url.startswith(scheme):
            return _DRIVER + url[len(scheme):]
    return url
