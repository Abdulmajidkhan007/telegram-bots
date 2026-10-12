"""To'lov: toza hisob, idempotent tasdiqlash, pre_checkout validatsiyasi, muddat hisobi."""
from datetime import datetime, timedelta, timezone

import pytest
from aiogram.methods import AnswerPreCheckoutQuery, EditUserStarSubscription, RefundStarPayment, SendPhoto
from conftest import run
from sim import ADMIN, OWNER, Sim

from hr_bot import billing, config, repo, repo_billing
from hr_bot.db import Company, aware, now

HR, BEGONA = 5, 9
T0 = datetime(2026, 10, 1, tzinfo=timezone.utc)


# --- toza mantiq ------------------------------------------------------------

def test_payload_faqat_bizniki():
    assert billing.parse_payload(billing.make_payload(17)) == 17
    for yomon in (None, "", "sub_0", "sub_-1", "sub_abc", "sub_1x", "sub_" + "1" * 11, "SUB_1", "x_sub_1"):
        assert billing.parse_payload(yomon) is None


def test_check_invoice():
    assert billing.check_invoice("sub_3", "XTR", 500, 500) == (3, None)
    assert billing.check_invoice("sub_3", "XTR", 400, 500) == (3, "pay_price_changed")
    assert billing.check_invoice("sub_3", "USD", 500, 500) == (3, "pay_price_changed")
    assert billing.check_invoice("sub_3", "XTR", 0, 0) == (3, "pay_price_changed")  # Stars o'chiq
    assert billing.check_invoice("bad", "XTR", 500, 500) == (None, "pay_bad_invoice")


def test_muddat_hisobi():
    assert billing.SUBSCRIPTION_SECONDS == 2592000 and billing.PERIOD_DAYS == 30
    assert billing.extend_until(None, T0) == T0 + timedelta(days=30)
    assert billing.extend_until(T0 - timedelta(days=5), T0) == T0 + timedelta(days=30)  # o'tib ketgan
    assert billing.extend_until(T0 + timedelta(days=10), T0) == T0 + timedelta(days=40)  # qolgani saqlanadi
    assert billing.shorten_until(T0) == T0 - timedelta(days=30)
    assert billing.shorten_until(None) is None
    assert billing.is_paid_up("active", None, T0)  # pilot
    assert billing.is_paid_up("active", T0 + timedelta(seconds=1), T0)
    assert not billing.is_paid_up("active", T0, T0)
    assert not billing.is_paid_up("pending", T0 + timedelta(days=1), T0)
    assert billing.expiry_stage(None, T0, 3) == ""
    assert billing.expiry_stage(T0 + timedelta(days=4), T0, 3) == ""
    assert billing.expiry_stage(T0 + timedelta(days=3), T0, 3) == "soon"
    assert billing.expiry_stage(T0, T0, 3) == "expired"
    assert billing.format_uzs(1500000) == "1 500 000"


def test_yarim_sozlangan_tolov_ishga_tushmaydi():
    config.check_payment(0, 0, "")
    config.check_payment(10000, 150000, "8600 0000 0000 0000")
    for args in ((10001, 0, ""), (-1, 0, ""), (0, 1000, ""), (0, 0, "8600"), (0, -5, "")):
        with pytest.raises(SystemExit):
            config.check_payment(*args)


# --- baza -------------------------------------------------------------------

async def _company(sm, status="pending"):
    async with sm() as s:
        c = await repo.create_company(s, OWNER, "Alfa")
        if status != "pending":
            await repo.set_company_status(s, c.id, status)
        token = await repo.create_invite(s, c.id, OWNER)
        await repo.accept_invite(s, token, HR)
        await s.commit()
        return c.id


def test_stars_idempotent_bitta_charge_bir_marta(sm):
    cid = run(_company(sm))

    async def body():
        for _ in range(2):
            async with sm() as s:
                p, c, yangi = await repo_billing.record_stars_payment(s, cid, OWNER, 500, "ch_1", True, at=T0)
                await s.commit()
        assert not yangi
        async with sm() as s:
            c = await s.get(Company, cid)
            assert c.status == "active" and aware(c.active_until) == T0 + timedelta(days=30)
            # Keyingi oy yangilanishi — yangi charge, muddat qo'shiladi
            await repo_billing.record_stars_payment(s, cid, OWNER, 500, "ch_2", True, at=T0 + timedelta(days=29))
            assert aware(c.active_until) == T0 + timedelta(days=60)
    run(body())


def test_karta_tasdiqlash_idempotent(sm):
    cid = run(_company(sm))

    async def body():
        async with sm() as s:
            p = await repo_billing.create_card_payment(s, cid, OWNER, 150000, "F", "photo")
            with pytest.raises(repo.StateError, match="pay_pending_exists"):
                await repo_billing.create_card_payment(s, cid, OWNER, 150000, "F2", "photo")
            await s.commit()
        async with sm() as s:
            await repo_billing.decide_card_payment(s, p.id, ADMIN, True, at=T0)
            await s.commit()
        for qaror in (True, False):  # ikkinchi bosish ham, teskari qaror ham o'tmaydi
            async with sm() as s:
                with pytest.raises(repo.StateError, match="pay_already_decided"):
                    await repo_billing.decide_card_payment(s, p.id, ADMIN, qaror, at=T0)
        async with sm() as s:
            c = await s.get(Company, cid)
            assert c.status == "active" and aware(c.active_until) == T0 + timedelta(days=30)
            with pytest.raises(repo.StateError, match="not_found"):
                await repo_billing.decide_card_payment(s, 9999, ADMIN, True)
    run(body())


def test_rad_etilgan_chek_faollashtirmaydi(sm):
    cid = run(_company(sm))

    async def body():
        async with sm() as s:
            p = await repo_billing.create_card_payment(s, cid, OWNER, 150000, "F", "document")
            await repo_billing.decide_card_payment(s, p.id, ADMIN, False)
            c = await s.get(Company, cid)
            assert c.status == "pending" and c.active_until is None
    run(body())


def test_faqat_ega_tolaydi_bloklangan_tolamaydi(sm):
    cid = run(_company(sm))

    async def body():
        async with sm() as s:
            for uid in (HR, BEGONA):
                with pytest.raises(repo.AccessError):
                    await repo_billing.create_card_payment(s, cid, uid, 1, "F", "photo")
            assert await repo_billing.check_pre_checkout(s, f"sub_{cid}", "XTR", 500, 500, HR) == "pay_not_owner"
            assert await repo_billing.check_pre_checkout(s, f"sub_{cid}", "XTR", 500, 500, OWNER) is None
            assert await repo_billing.check_pre_checkout(s, f"sub_{cid}", "XTR", 499, 500, OWNER) == "pay_price_changed"
            assert await repo_billing.check_pre_checkout(s, "sub_9999", "XTR", 500, 500, OWNER) == "pay_not_owner"
            await repo.set_company_status(s, cid, "blocked")
            assert await repo_billing.check_pre_checkout(s, f"sub_{cid}", "XTR", 500, 500, OWNER) == "company_blocked"
            with pytest.raises(repo.StateError, match="company_blocked"):
                await repo_billing.create_card_payment(s, cid, OWNER, 1, "F", "photo")
    run(body())


def test_muddat_tugagach_yangi_vakansiya_yoq(sm):
    cid = run(_company(sm, "active"))

    async def body():
        async with sm() as s:
            await repo.create_vacancy(s, cid, OWNER, "Pilot", "x", 5)  # active_until=None — pilot
            c = await s.get(Company, cid)
            c.active_until = now() - timedelta(minutes=1)
            with pytest.raises(repo.StateError, match="subscription_expired"):
                await repo.create_vacancy(s, cid, OWNER, "Dev", "x", 5)
            assert len(await repo.company_vacancies(s, cid, OWNER)) == 1  # eskilari o'qiladi
            await repo_billing.record_stars_payment(s, cid, OWNER, 500, "ch_9", True)
            await repo.create_vacancy(s, cid, OWNER, "Dev", "x", 5)
    run(body())


def test_eslatma_har_bosqichda_bir_marta(sm):
    cid = run(_company(sm))

    async def body():
        async with sm() as s:
            await repo_billing.record_stars_payment(s, cid, OWNER, 500, "ch_1", True, at=T0)
            until = T0 + timedelta(days=30)
            assert await repo_billing.expiry_notices(s, 3, at=until - timedelta(days=5)) == []
            [(c, bosqich, egalar)] = await repo_billing.expiry_notices(s, 3, at=until - timedelta(days=2))
            assert bosqich == "soon" and egalar == [OWNER]
            assert await repo_billing.expiry_notices(s, 3, at=until - timedelta(days=1)) == []
            [(_, bosqich, _)] = await repo_billing.expiry_notices(s, 3, at=until)
            assert bosqich == "expired"
            assert await repo_billing.expiry_notices(s, 3, at=until + timedelta(days=1)) == []
            # To'lov eslatmani qayta "qurollantiradi"
            await repo_billing.record_stars_payment(s, cid, OWNER, 500, "ch_2", True, at=until + timedelta(days=1))
            assert c.expiry_notice is None
    run(body())


def test_qaytarish_bir_marta_va_muddatni_qisqartiradi(sm):
    cid = run(_company(sm))

    async def body():
        async with sm() as s:
            p, _, _ = await repo_billing.record_stars_payment(s, cid, OWNER, 500, "ch_1", True, at=T0)
            await repo_billing.refundable_payment(s, p.id)
            _, c = await repo_billing.mark_refunded(s, p.id, ADMIN)
            assert aware(c.active_until) == T0
            with pytest.raises(repo.StateError, match="pay_already_refunded"):
                await repo_billing.mark_refunded(s, p.id, ADMIN)
            with pytest.raises(repo.StateError, match="pay_already_refunded"):
                await repo_billing.refundable_payment(s, p.id)
            assert aware(c.active_until) == T0
    run(body())


def test_eski_bazaga_yangi_ustun_qoshiladi(tmp_path):
    import sqlite3

    from hr_bot.db import init_db, make_engine
    fayl = tmp_path / "eski.db"
    with sqlite3.connect(fayl) as con:  # Faza 1–3 dagi companies jadvali (expiry_notice yo'q)
        con.execute("CREATE TABLE companies (id INTEGER PRIMARY KEY, slug VARCHAR(32), name VARCHAR(128), "
                    "status VARCHAR(16), active_until DATETIME, created_at DATETIME)")
        con.execute("INSERT INTO companies VALUES (1, 'alfa', 'Alfa', 'active', NULL, '2026-10-01')")
    engine = make_engine(f"sqlite+aiosqlite:///{fayl}")

    async def body():
        sm = await init_db(engine)
        async with sm() as s:
            c = await s.get(Company, 1)
            assert c.name == "Alfa" and c.expiry_notice is None
        await engine.dispose()
    run(body())


# --- Telegram oqimi (soxta sessiya) ------------------------------------------

def _sim(sm):
    return Sim(sm, stars_price=500, card_price_uzs=150000, card_number="8600 1234 5678 9012")


def _pre_checkout(s, uid, payload, amount):
    return s.feed(pre_checkout_query={"id": f"q{s.n}", "from": s._user(uid).model_dump(), "currency": "XTR",
                                      "total_amount": amount, "invoice_payload": payload})


def test_pre_checkout_har_doim_javob_oladi(sm):
    cid = run(_company(sm))
    s = _sim(sm)

    async def body():
        await _pre_checkout(s, OWNER, f"sub_{cid}", 500)
        await _pre_checkout(s, OWNER, f"sub_{cid}", 100)
        await _pre_checkout(s, HR, f"sub_{cid}", 500)
        await _pre_checkout(s, OWNER, "boshqa", 500)
        javoblar = [(a.ok, a.error_message) for a in s.sent(AnswerPreCheckoutQuery)]
        assert javoblar[0] == (True, None)
        assert [ok for ok, _ in javoblar[1:]] == [False] * 3
        assert "Narx" in javoblar[1][1] and "egasi" in javoblar[2][1]
    run(body())


def test_stars_oqimi_va_qaytarish(sm):
    cid = run(_company(sm))
    s = _sim(sm)
    sp = {"currency": "XTR", "total_amount": 500, "invoice_payload": f"sub_{cid}",
          "telegram_payment_charge_id": "tg_ch_1", "provider_payment_charge_id": "",
          "is_recurring": True, "is_first_recurring": True}

    async def body():
        await s.msg(OWNER, "/panel")
        await s.press(OWNER, [d for d in s.last_markup(OWNER) if d.startswith("c:pay")][0])
        await s.press(OWNER, [d for d in s.last_markup(OWNER) if d.startswith("c:stars")][0])
        from aiogram.methods import CreateInvoiceLink
        [inv] = s.sent(CreateInvoiceLink)
        assert (inv.currency, inv.subscription_period, inv.prices[0].amount, inv.payload) == (
            "XTR", 2592000, 500, f"sub_{cid}")
        assert s.last_markup(OWNER)[0].startswith("https://t.me/$invoice")

        for _ in range(2):  # Telegram qayta yetkazsa ham bitta to'lov
            await s.msg(OWNER, successful_payment=sp)
        assert sum("To'lov qabul qilindi" in m for m in s.texts(OWNER)) == 1
        assert sum("Stars:" in m for m in s.texts(ADMIN)) == 1

        refund = s.last_markup(ADMIN)[0]
        await s.press(OWNER, refund)  # admin emas
        assert s.sent(RefundStarPayment) == []
        await s.press(ADMIN, refund)
        await s.press(ADMIN, refund)  # ikkinchi bosish — Telegram'ga qayta so'rov ketmaydi
        assert len(s.sent(RefundStarPayment, user_id=OWNER, telegram_payment_charge_id="tg_ch_1")) == 1
        assert len(s.sent(EditUserStarSubscription, is_canceled=True)) == 1
        assert "qaytarildi" in s.texts(OWNER)[-1]
    run(body())


def test_karta_chek_oqimi(sm):
    cid = run(_company(sm))
    s = _sim(sm)

    async def body():
        await s.msg(OWNER, "/panel")
        await s.press(OWNER, [d for d in s.last_markup(OWNER) if d.startswith("c:pay")][0])
        await s.press(OWNER, [d for d in s.last_markup(OWNER) if d.startswith("c:card")][0])
        assert "8600 1234 5678 9012" in s.texts(OWNER)[-1] and "150 000" in s.texts(OWNER)[-1]
        await s.msg(OWNER, "chek yo'q")
        assert "rasm yoki PDF" in s.texts(OWNER)[-1]
        await s.msg(OWNER, document={"file_id": "X", "file_unique_id": "x", "mime_type": "application/zip"})
        assert "rasm yoki PDF" in s.texts(OWNER)[-1]
        await s.msg(OWNER, photo=[{"file_id": "small", "file_unique_id": "s", "width": 90, "height": 90},
                                  {"file_id": "BIG", "file_unique_id": "b", "width": 900, "height": 900}])
        assert "Chek qabul qilindi" in s.texts(OWNER)[-1]
        [photo] = s.sent(SendPhoto, chat_id=ADMIN)
        assert photo.photo == "BIG"
        approve = s.last_markup(ADMIN)[0]
        await s.press(OWNER, approve)  # ega o'zi tasdiqlay olmaydi
        await s.press(ADMIN, approve)
        await s.press(ADMIN, approve)
        assert sum("tasdiqlandi" in m for m in s.texts(OWNER)) == 1
        await s.msg(OWNER, "/panel")
        assert "Faol:" in s.texts(OWNER)[-1]
    run(body())


def test_data_dir_bazani_volume_ga_qoyadi(tmp_path):
    assert config.default_db_url(str(tmp_path / "data")) == f"sqlite+aiosqlite:///{tmp_path / 'data' / 'hr_bot.db'}"
    assert (tmp_path / "data").is_dir()
    assert config.default_db_url("").endswith("/hr-bot/hr_bot.db")


def test_soatlik_vazifa_cv_ochiradi_va_obuna_eslatadi(sm):
    """main.housekeeping_once: retention + muddat eslatmasi haqiqatan ulangan (Faza 6 tekshiruvi)."""
    from unittest.mock import AsyncMock, MagicMock

    from hr_bot.db import Application
    from hr_bot.main import housekeeping_once
    cid = run(_company(sm, "active"))

    async def body():
        async with sm() as s:
            c = await s.get(Company, cid)
            v = await repo.create_vacancy(s, cid, OWNER, "Dev", "x", 5)
            app, _ = await repo.submit_application(s, v, c, 777, "N", "FILE", "CV matni", "")
            await repo.close_vacancy(s, v.id, OWNER)
            v.closed_at = now() - timedelta(days=31)
            await repo_billing.record_stars_payment(s, cid, OWNER, 500, "ch_1", True, at=now() - timedelta(days=28))
            await s.commit()
        bot = MagicMock()
        bot.send_message = AsyncMock()
        cfg = MagicMock(cv_retention_days=30, expiry_remind_days=3)
        await housekeeping_once(bot, sm, cfg)
        await housekeeping_once(bot, sm, cfg)  # ikkinchi soat — takror eslatma yo'q
        async with sm() as s:
            a = await s.get(Application, app.id)
            assert a.cv_text is None and a.cv_file_id is None and a.cv_deleted_at is not None
        eslatmalar = [c.args for c in bot.send_message.call_args_list if "obunasi" in c.args[1]]
        assert len(eslatmalar) == 1 and eslatmalar[0][0] == OWNER
    run(body())
