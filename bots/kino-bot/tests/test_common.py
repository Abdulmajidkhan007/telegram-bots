from aiogram.exceptions import TelegramBadRequest, TelegramForbiddenError
from aiogram.methods import SendMessage
from aiogram.types import KeyboardButton

import buttons as kb
from common import callback_int, is_unreachable, movie_caption


def test_caption_html_xavfsiz():
    # Regressiya: nomda "<" bo'lsa Telegram "can't parse entities" bilan rad etardi.
    cap = movie_caption({"name": "Tom & <Jerry>", "genre": "a<b", "year": "2024",
                         "quality": "720p", "description": "<script>"}, 3)
    assert "<Jerry>" not in cap and "&lt;Jerry&gt;" in cap
    assert "&lt;script&gt;" in cap and "Tom &amp;" in cap
    assert "<b>3</b>" in cap


def test_callback_int():
    assert callback_int("del_channel_yes_-100123", "del_channel_yes_") == -100123
    assert callback_int("remove_admin_abc", "remove_admin_") is None


def test_menu_texts_hamma_menyu_tugmalarini_qamraydi():
    menus = [kb.admin_main_menu(), kb.back_button(), kb.broadcast_target_menu(),
             kb.admin_manage_menu()]
    labels = {b.text for m in menus for row in m.keyboard for b in row if isinstance(b, KeyboardButton)}
    assert labels == set(kb.MENU_TEXTS)


def test_is_unreachable():
    m = SendMessage(chat_id=1, text="x")
    assert is_unreachable(TelegramForbiddenError(m, "Forbidden: bot was blocked by the user"))
    assert is_unreachable(TelegramBadRequest(m, "Bad Request: chat not found"))
    assert not is_unreachable(TelegramBadRequest(m, "Bad Request: message is too long"))
    assert not is_unreachable(RuntimeError("tarmoq"))


def test_kinolar_sahifasi_tartib_va_chegara():
    from common import MOVIES_PER_PAGE, movies_page
    movies = [(str(i), {"name": "N" * 200 + "<x>", "year": "2024"}) for i in range(1, 60)]
    text, page, pages = movies_page(movies, {"1": 5}, 0)
    assert pages == -(-59 // MOVIES_PER_PAGE) and page == 0
    assert "<code>1</code>" in text and "⬇️ 5" in text
    assert "<x>" not in text                      # nom HTML-escape va kesilgan
    assert len(text) < 4096                        # Telegram xabar chegarasi
    last, page, _ = movies_page(movies, {}, 999)   # chegaradan tashqari sahifa → oxirgisi
    assert page == pages - 1 and "<code>59</code>" in last


def test_bosh_royxat():
    from common import movies_page
    text, page, pages = movies_page([], {}, 0)
    assert "Hali kino yo'q" in text and (page, pages) == (0, 1)
