"""Semantik qidiruv: ChromaDB + ko'p tilli embedding.

Bu modul sinxron — Chroma va sentence-transformers ikkalasi ham CPU da
ishlaydi va async emas. Shuning uchun uni chaqiruvchi tomon
asyncio.to_thread() bilan chaqiradi (main.py ga qarang), aks holda
bitta qidiruv butun botni muzlatib qo'yardi.
"""

import logging

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

import config

log = logging.getLogger(__name__)

_vectorstore = None


def _store():
    """Vektor bazani birinchi murojaatda ochamiz.

    Modul import qilinganda emas: embedding modeli ~100 MB, uni bot
    ishga tushishidayoq yuklash startni bir necha o'nlab soniyaga cho'zadi.
    """
    global _vectorstore
    if _vectorstore is None:
        log.info("Embedding modeli yuklanmoqda: %s", config.EMBEDDING_MODEL)
        embeddings = HuggingFaceEmbeddings(model_name=config.EMBEDDING_MODEL)
        _vectorstore = Chroma(
            persist_directory=config.CHROMA_DIR,
            embedding_function=embeddings,
            collection_name=config.CHROMA_COLLECTION,
        )
    return _vectorstore


def qidir(sorov, k=4):
    """So'rovga mos mahsulotlarni topadi.

    (kontekst_matni, forward_qilinadigan_post_id) qaytaradi.
    Mos mahsulot topilmasa — (None, None).
    """
    natijalar = _store().similarity_search_with_relevance_scores(sorov, k=k)

    # Ball chegarasi: similarity_search() doim k ta natija qaytaradi, hatto
    # so'rov katalogga umuman aloqasiz bo'lsa ham. Chegarasiz bot
    # "assalomu alaykum" ga javoban tasodifiy filtr postini yuborardi.
    mos = [doc for doc, ball in natijalar if ball >= config.RELEVANCE_THRESHOLD]

    if not mos:
        log.info("Mos mahsulot topilmadi: %r (eng yuqori ball: %s)",
                 sorov, natijalar[0][1] if natijalar else "yo'q")
        return None, None

    kontekst = "\n\n".join(doc.page_content for doc in mos)

    post_id = None
    for doc in mos:
        xom = doc.metadata.get("telegram_msg_id") or 0
        if int(xom) > 0:
            post_id = int(xom)
            break

    return kontekst, post_id
