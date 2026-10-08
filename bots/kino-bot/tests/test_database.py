import json

import pytest

import database as db
from conftest import SUPER


def test_yangi_bazada_bosh_admin_bor(baza):
    db.load_db()   # fayl yo'q bo'lsa yaratiladi
    assert json.loads(baza.read_text())["admins"][0]["id"] == SUPER


def test_yozuv_atomik_yiqilsa_eski_fayl_butun(baza, monkeypatch):
    # Regressiya: avval to'g'ridan-to'g'ri yozilardi — o'rtada xato = bo'sh/yarim fayl.
    db.add_movie("1", "Avatar", "Fantastika", "2009", "720p", "-", "file1")
    before = baza.read_text()

    def portlash(*a, **k):
        raise OSError("disk to'ldi")
    monkeypatch.setattr(db.json, "dump", portlash)
    with pytest.raises(OSError):
        db.add_movie("2", "X", "-", "-", "-", "-", "file2")
    assert baza.read_text() == before
    assert db.get_movie("1")["name"] == "Avatar"


def test_buzilgan_json_ustidan_yozilmaydi(baza):
    baza.write_text("{buzuq")
    with pytest.raises(RuntimeError, match="buzilgan JSON"):
        db.load_db()
    assert baza.read_text() == "{buzuq"


def test_menyu_tugmasi_kino_kodi_bolib_saqlanmaydi(baza):
    # Regressiya: real bazada kodi "🎬 Kino qo'shish" bo'lgan kino bor edi.
    with pytest.raises(ValueError):
        db.add_movie("🎬 Kino qo'shish", "x", "x", "x", "x", "x", "f")
    assert db.get_movie_count() == 0


@pytest.mark.parametrize("code,ok", [
    ("001", True), ("avatar2", True), ("a_b-c", True), ("x" * 32, True),
    ("", False), ("x" * 33, False), ("12 3", False), ("<b>", False), ("🎬 Kino qo'shish", False),
])
def test_kod_validatsiyasi(code, ok):
    assert db.valid_code(code) is ok


def test_bosh_adminni_ochirib_bolmaydi(baza):
    assert db.remove_admin(SUPER) is False
    assert db.is_admin(SUPER)


def test_bosh_admin_royxatdan_tushib_qolsa_ham_admin(baza):
    data = db.load_db()
    data["admins"] = []
    db.save_db(data)
    assert db.is_admin(SUPER)
    assert not db.is_admin(123)


def test_oddiy_admin_qoshiladi_va_ochiriladi(baza):
    assert db.add_admin(555, "Sardor")
    assert db.is_admin(555)
    assert db.remove_admin(555)
    assert not db.is_admin(555)


def test_tark_etganlar_ikki_marta_sanalmaydi(baza):
    # Regressiya: har reklamada bloklagan foydalanuvchi qayta sanalardi.
    db.register_user(10, "ali", "Ali")
    db.deactivate_user(10)
    db.deactivate_user(10)
    assert db.get_user_stats()["left"] == 1
    db.register_user(10, "ali", "Ali")
    assert db.get_user_stats()["active"] == 1


def test_restore_notogri_kodni_tashlaydi_qolganini_saqlaydi(baza):
    eski = {
        "movies": {
            "12": {"name": "Yaxshi", "video_file_id": "f"},
            "🎬 Kino qo'shish": {"name": "🎬 Kino qo'shish", "genre": "🗑 Kinoni o'chirish"},
        },
        "users": {"1": {"full_name": "A"}},
        "admins": [{"id": 222, "name": "Boshqa"}],
        "channels": [],
        "stats": {"total_downloads": 5},
    }
    clean, skipped = db.validate_db(eski)
    assert list(clean["movies"]) == ["12"]
    assert skipped == ["🎬 Kino qo'shish"]
    assert clean["admins"][0]["id"] == SUPER          # bosh admin qo'shildi
    assert clean["stats"]["total_downloads"] == 5
    assert clean["stats"]["movie_downloads"] == {}   # yetishmagan kalit to'ldirildi
    assert clean["groups"] == {}


@pytest.mark.parametrize("bad", [[], "x", {"movies": {}}, {"movies": [], "users": {}, "admins": [], "channels": []}])
def test_restore_tuzilmasi_notogri_bolsa_rad(bad):
    with pytest.raises(ValueError):
        db.validate_db(bad)


def test_kinolar_kod_boyicha_tartiblanadi(baza):
    for code in ["10", "2", "avatar", "1", "Batman"]:
        db.add_movie(code, code, "-", "-", "-", "-", "f")
    assert [c for c, _ in db.list_movies()] == ["1", "2", "10", "avatar", "Batman"]
