from ovoz_bot.store import Store, today
from datetime import datetime, timezone


def test_kunlik_limit():
    s = Store(":memory:")
    assert [s.consume(1, 3, day="d") for _ in range(4)] == [True, True, True, False]
    assert s.used(1, day="d") == 3
    assert s.consume(2, 3, day="d")  # boshqa foydalanuvchi alohida
    assert s.consume(1, 3, day="d2")  # yangi kun


def test_admin_limitsiz_va_hisobga_tushmaydi():
    s = Store(":memory:")
    assert all(s.consume(1, 1, unlimited=True, day="d") for _ in range(10))
    assert s.used(1, day="d") == 0


def test_refund_limitni_qaytaradi_va_manfiy_bolmaydi():
    s = Store(":memory:")
    s.consume(1, 1, day="d")
    assert not s.consume(1, 1, day="d")
    s.refund(1, day="d")
    assert s.consume(1, 1, day="d")
    s.refund(1, day="d"); s.refund(1, day="d"); s.refund(1, day="d")
    assert s.used(1, day="d") == 0


def test_limit_nol_hech_narsa_bermaydi():
    assert not Store(":memory:").consume(1, 0, day="d")


def test_kun_toshkent_vaqtida():
    # UTC 19:30 — Toshkentda ertasi kun 00:30
    assert today(datetime(2026, 10, 11, 19, 30, tzinfo=timezone.utc)) == "2026-10-12"
    assert today(datetime(2026, 10, 11, 18, 59, tzinfo=timezone.utc)) == "2026-10-11"


def test_ovoz_tanlovi(tmp_path):
    s = Store(tmp_path / "x" / "b.db")
    assert s.get_voice(1) is None
    s.set_voice(1, "Puck"); s.set_voice(1, "Kore")
    assert s.get_voice(1) == "Kore"
