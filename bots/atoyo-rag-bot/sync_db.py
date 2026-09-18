"""Firestore -> ChromaDB. Firestore'ga FAQAT o'qish uchun tegiladi.

Ishga tushirish:  python3 sync_db.py
"""

import logging
import sys

import chromadb
import firebase_admin
from firebase_admin import credentials, firestore
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings

import config

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)


def _matn(data):
    """Bitta mahsulotdan qidiruvga tushadigan matn yasaydi."""
    nomi = str(data.get("name", ""))
    toifa = str(data.get("category", ""))
    tavsif = str(data.get("description", ""))
    narx = str(data.get("price", ""))
    kod = str(data.get("code", ""))

    variantlar = data.get("variants") or data.get("turlar") or data.get("sizes") or []
    variant_matni = ""
    if isinstance(variantlar, list):
        for v in variantlar:
            if isinstance(v, dict):
                variant_matni += f" | {v.get('size', '')} {v.get('thickness', '')}: {v.get('price', '')} so'm"
            else:
                variant_matni += f" | {v}"

    # Eslatma: eski versiyada bu yerda "filtr", "moyka" kabi so'zlar uchun
    # qo'lda kalit so'zlar qo'shilardi. Ular kerak emas edi — sabab
    # inglizcha embedding modeli o'zbekcha so'rovni tushunmasligida edi.
    # Model ko'p tillisiga almashtirilgach, bu tayoq olib tashlandi.
    return (
        f"Nomi: {nomi}. Toifasi: {toifa}. Kodi: {kod}. "
        f"Chakana narxi: {narx} so'm. Tavsif: {tavsif}. "
        f"O'lchamlari va variantlari: {variant_matni}."
    )


def _post_id(data):
    xom = data.get("telegram_msg_id") or data.get("post_id") or data.get("msg_id") or 0
    try:
        return int(xom)
    except (ValueError, TypeError):
        log.warning("Post ID o'qilmadi: %r", xom)
        return 0


def sync():
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(config.FIREBASE_CREDENTIALS))
    db = firestore.client()

    log.info("Firestore o'qilmoqda (read-only)...")
    hujjatlar = []
    for doc in db.collection("products").stream():
        data = doc.to_dict()
        hujjatlar.append(Document(
            page_content=_matn(data),
            metadata={
                "name": str(data.get("name", "")),
                "category": str(data.get("category", "")),
                "code": str(data.get("code", "")),
                "telegram_msg_id": _post_id(data),
            },
        ))

    if not hujjatlar:
        log.error("Firestore'da tovar topilmadi — sinxronizatsiya to'xtatildi.")
        return 1

    # MUHIM: eski kolleksiya o'chiriladi. Chroma.from_documents() mavjud
    # kolleksiyaga QO'SHADI, almashtirmaydi — shuning uchun sync'ni ikki
    # marta ishlatganda katalog ikkilanib, qidiruvda har mahsulot ikki
    # marta chiqardi.
    mijoz = chromadb.PersistentClient(path=config.CHROMA_DIR)
    try:
        mijoz.delete_collection(config.CHROMA_COLLECTION)
        log.info("Eski kolleksiya o'chirildi.")
    except Exception as e:
        # Birinchi ishga tushirishda kolleksiya bo'lmasligi normal holat.
        log.info("Eski kolleksiya topilmadi (%s) — yangisi yaratiladi.", type(e).__name__)

    log.info("Embedding modeli: %s", config.EMBEDDING_MODEL)
    Chroma.from_documents(
        documents=hujjatlar,
        embedding=HuggingFaceEmbeddings(model_name=config.EMBEDDING_MODEL),
        collection_name=config.CHROMA_COLLECTION,
        persist_directory=config.CHROMA_DIR,
    )
    log.info("Tayyor: %d ta tovar ChromaDB ga yuklandi.", len(hujjatlar))
    return 0


if __name__ == "__main__":
    sys.exit(sync())
