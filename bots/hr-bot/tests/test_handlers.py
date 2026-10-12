"""Handler'lar: Telegram mock bilan (internetsiz)."""
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from aiogram.exceptions import TelegramForbiddenError
from aiogram.methods import SendMessage
from conftest import dispatcher, run

from hr_bot import notify, repo, status
from hr_bot.db import Application
from hr_bot.handlers import hr
from hr_bot.handlers.common import TEXT, AppCb, VacancyCb

BLOKLAGAN = 202


def _call(user_id):
    call = MagicMock()
    call.from_user = SimpleNamespace(id=user_id)
    call.answer = AsyncMock()
    call.message.answer = AsyncMock()
    return call


def _bot():
    bot = MagicMock()

    async def send(chat_id, text, **kw):
        if chat_id == BLOKLAGAN:
            raise TelegramForbiddenError(method=SendMessage(chat_id=chat_id, text=text), message="bot was blocked")
    bot.send_message = AsyncMock(side_effect=send)
    return bot


async def _setup(sm):
    async with sm() as s:
        c = await repo.create_company(s, 1, "Alfa")
        await repo.set_company_status(s, c.id, "active")
        v = await repo.create_vacancy(s, c.id, 1, "Dev", "Python", 5)
        ids = []
        for cand in (201, BLOKLAGAN, 203):
            app, _ = await repo.submit_application(s, v, c, cand, "N", "f", "t", "")
            ids.append(app.id)
        await s.commit()
        return v.id, ids


def test_yopish_har_qarorsizga_xabar_403_toxtatmaydi(sm):
    vid, ids = run(_setup(sm))
    bot, call = _bot(), _call(1)

    async def body():
        async with sm() as s:
            await repo.decide(s, ids[2], 1, status.INVITED)
            await s.commit()
        await hr.close_yes(call, VacancyCb(action="closeyes", vacancy_id=vid), "uz", sm, bot)
        yuborilgan = [c.args[0] for c in bot.send_message.call_args_list]
        assert sorted(yuborilgan) == [201, BLOKLAGAN]  # taklif olgan 203 ga rad ketmaydi
        assert "1 ta yetkazildi, 1 ta yetkazilmadi" in call.message.answer.call_args.args[0]
        async with sm() as s:
            d = {i: (await s.get(Application, i)).delivery for i in ids[:2]}
        assert d == {ids[0]: "ok", ids[1]: "undeliverable"}
    run(body())


def test_begona_foydalanuvchi_yopolmaydi(sm):
    vid, ids = run(_setup(sm))
    bot, call = _bot(), _call(999)
    run(hr.close_yes(call, VacancyCb(action="closeyes", vacancy_id=vid), "uz", sm, bot))
    bot.send_message.assert_not_called()
    assert "huquqingiz yo'q" in call.message.answer.call_args.args[0]


def test_begona_qaror_tugmasini_bosolmaydi(sm):
    vid, ids = run(_setup(sm))
    bot, call = _bot(), _call(999)
    run(hr.decide(call, AppCb(action="reject", app_id=ids[0]), "uz", sm, bot))
    bot.send_message.assert_not_called()
    assert call.answer.call_args.kwargs.get("show_alert")


def test_suhbatga_chaqirish_nomzodga_yozadi(sm):
    vid, ids = run(_setup(sm))
    bot, call = _bot(), _call(1)
    run(hr.decide(call, AppCb(action="invite", app_id=ids[0]), "uz", sm, bot))
    chat, matn = bot.send_message.call_args.args
    assert chat == 201 and "suhbatga" in matn


def test_rad_shabloni_html_sifatida_talqin_qilinmaydi():
    assert notify.rejection_text("<b>x</b> & y", "{company}", "C", "T") == "&lt;b&gt;x&lt;/b&gt; &amp; y"
    assert notify.rejection_text("", "«{company}» {title}", "A<B", "T") == "«A&lt;B» T"


def test_broadcast_tezlik_chegarasi():
    bot, uxlash = _bot(), AsyncMock()
    natijalar = []

    async def yoz(app_id, ok):
        natijalar.append(ok)
    items = [(i, 300 + i, "x") for i in range(45)]
    assert run(notify.broadcast(bot, items, yoz, per_second=20, sleep=uxlash)) == (45, 0)
    assert uxlash.await_count == 2 and len(natijalar) == 45


def test_fsm_matn_filtri_buyruqni_otkazadi():
    assert TEXT.resolve(SimpleNamespace(text="Python dasturchi"))
    assert not TEXT.resolve(SimpleNamespace(text="/panel"))
    assert not TEXT.resolve(SimpleNamespace(text=None))


def test_dispatcher_yigiladi(sm):
    dp = dispatcher(sm, SimpleNamespace(admin_ids=frozenset()))
    assert [r.name for r in dp.sub_routers] == ["start", "admin", "owner", "hr", "candidate"]
