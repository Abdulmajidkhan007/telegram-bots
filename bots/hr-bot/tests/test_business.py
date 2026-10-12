"""Telegram Business: ulanishni qayd etish va HR chatida nomzodga vakansiyalar ro'yxati."""
import time
from datetime import timedelta

import pytest
from aiogram.methods import SendMessage
from conftest import run
from sim import OWNER, Sim

from hr_bot import repo, repo_business
from hr_bot.db import Company, now

HR, CAND, BOSHQA_HR = 5, 300, 6
CONN = "bc_abc"


async def _setup(sm, ikkinchi_kompaniya=False):
    async with sm() as s:
        c = await repo.create_company(s, OWNER, "Alfa")
        await repo.set_company_status(s, c.id, "active")
        await repo.accept_invite(s, await repo.create_invite(s, c.id, OWNER), HR)
        v = await repo.create_vacancy(s, c.id, HR, "Python dasturchi", "Python", 7)
        ids = [c.id]
        if ikkinchi_kompaniya:
            b = await repo.create_company(s, OWNER + 100, "Beta")
            await repo.set_company_status(s, b.id, "active")
            await repo.accept_invite(s, await repo.create_invite(s, b.id, OWNER + 100), HR)
            ids.append(b.id)
        await s.commit()
        return ids, v.slug


def _connection(s, uid=HR, enabled=True, can_reply=True, conn=CONN):
    return s.feed(business_connection={
        "id": conn, "user": s._user(uid).model_dump(), "user_chat_id": uid, "date": int(time.time()),
        "is_enabled": enabled, "rights": {"can_reply": can_reply}})


def _biz_msg(s, sender, text="Assalomu alaykum, ish bormi?", conn=CONN, chat=CAND):
    return s.feed(business_message={
        "message_id": s.n + 1, "date": int(time.time()), "chat": {"id": chat, "type": "private"},
        "from": s._user(sender).model_dump(), "text": text, "business_connection_id": conn})


def _biz_replies(s):
    return [m for m in s.sent(SendMessage) if m.business_connection_id == CONN]


def test_ulanish_va_nomzodga_vakansiyalar(sm):
    (cid,), slug = run(_setup(sm))
    s = Sim(sm)

    async def body():
        await _connection(s)
        assert "Business ulandi" in s.texts(HR)[-1] and "Alfa" in s.texts(HR)[-1]
        await _biz_msg(s, CAND)
        [javob] = _biz_replies(s)
        assert javob.chat_id == CAND
        assert f"https://t.me/hr_ai_007_bot?start=v_{slug}" in javob.text and "Python dasturchi" in javob.text
        await _biz_msg(s, CAND, "yana savol")  # 24 soat ichida qayta javob yo'q
        await _biz_msg(s, HR, "HR o'zi yozdi", chat=CAND + 1)  # HR'ning chiquvchi xabari
        assert len(_biz_replies(s)) == 1
        await _biz_msg(s, CAND + 2, chat=CAND + 2)  # boshqa nomzod — javob oladi
        assert len(_biz_replies(s)) == 2
    run(body())


def test_huquqsiz_yoki_uzilgan_ulanish_javob_bermaydi(sm):
    run(_setup(sm))
    s = Sim(sm)

    async def body():
        await _connection(s, can_reply=False)
        assert "huquqi berilmagan" in s.texts(HR)[-1]
        await _biz_msg(s, CAND)
        await _connection(s, enabled=False)
        assert "uzildi" in s.texts(HR)[-1]
        await _biz_msg(s, CAND + 1, chat=CAND + 1)
        assert _biz_replies(s) == []
    run(body())


def test_kompaniyasiz_hr(sm):
    s = Sim(sm)

    async def body():
        await _connection(s, uid=BOSHQA_HR)
        assert "a'zo emassiz" in s.texts(BOSHQA_HR)[-1]
        await _biz_msg(s, CAND)
        assert _biz_replies(s) == []
    run(body())


def test_bir_nechta_kompaniya_tanlanadi_va_begona_tanlay_olmaydi(sm):
    (a, b), _ = run(_setup(sm, ikkinchi_kompaniya=True))
    s = Sim(sm)

    async def body():
        await _connection(s)
        assert "Qaysi kompaniya" in s.texts(HR)[-1]
        await _biz_msg(s, CAND)
        assert _biz_replies(s) == []  # tanlanmaguncha javob yo'q
        await s.press(BOSHQA_HR, f"b:{a}")  # begona callback yasadi
        assert "huquqingiz yo'q" in s.texts(BOSHQA_HR)[-1]
        await s.press(HR, f"b:{a}")
        await _biz_msg(s, CAND + 1, chat=CAND + 1)
        assert len(_biz_replies(s)) == 1 and "Alfa" in _biz_replies(s)[0].text
    run(body())


def test_reply_target_cheklovlari(sm):
    (cid,), _ = run(_setup(sm))

    async def body():
        async with sm() as s:
            await repo_business.upsert_connection(s, CONN, HR, HR, True, True)
            t0 = now()
            assert await repo_business.reply_target(s, CONN, CAND, CAND, 24, at=t0)
            assert await repo_business.reply_target(s, CONN, CAND, CAND, 24, at=t0 + timedelta(hours=23)) is None
            assert await repo_business.reply_target(s, CONN, CAND, CAND, 24, at=t0 + timedelta(hours=25))
            assert await repo_business.reply_target(s, "yoq", CAND + 1, CAND + 1, 24) is None
            # Obuna tugagan — HR nomidan reklama ketmaydi
            c = await s.get(Company, cid)
            c.active_until = now() - timedelta(minutes=1)
            assert await repo_business.reply_target(s, CONN, CAND + 1, CAND + 1, 24) is None
            c.active_until = None
            # HR kompaniyadan chiqarilgan
            from sqlalchemy import delete

            from hr_bot.db import Member
            await s.execute(delete(Member).where(Member.user_id == HR))
            assert await repo_business.reply_target(s, CONN, CAND + 2, CAND + 2, 24) is None
            with pytest.raises(repo.AccessError):
                await repo_business.choose_company(s, HR, cid)
    run(body())
