from ovoz_bot.text import check_tts_text, split_text


def test_qisqa_matn_bitta_bolak():
    assert split_text("salom") == ["salom"]
    assert split_text("   ") == []


def test_uzun_matn_chegaradan_oshmaydi_va_yoqolmaydi():
    matn = " ".join(f"so'z{i}." for i in range(3000))
    bolaklar = split_text(matn, 4000)
    assert all(len(b) <= 4000 for b in bolaklar)
    assert " ".join(bolaklar).split() == matn.split()


def test_paragrafdan_kesadi():
    a, b = "a" * 3000, "b" * 3000
    assert split_text(f"{a}\n\n{b}", 4000) == [a, b]


def test_bosliqsiz_uzun_qator_qattiq_kesiladi():
    bolaklar = split_text("x" * 9000, 4000)
    assert [len(b) for b in bolaklar] == [4000, 4000, 1000]


def test_tts_matn_tekshiruvi():
    assert check_tts_text("salom", 1000) is None
    assert check_tts_text("", 1000) == "tts_empty"
    assert check_tts_text("  \n", 1000) == "tts_empty"
    assert check_tts_text(None, 1000) == "tts_empty"
    assert check_tts_text("a" * 1000, 1000) is None
    assert check_tts_text("a" * 1001, 1000) == "tts_too_long"
