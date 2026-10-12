from datetime import timedelta

import pytest
from conftest import run

from hr_bot import repo, status
from hr_bot.db import Application, now

OWNER_A, OWNER_B, HR_A, CAND1, CAND2, CAND3 = 1, 2, 3, 101, 102, 103


async def _setup(sm):
    """Ikki faol kompaniya, har birida bitta vakansiya va A'da 3 ta ariza."""
    async with sm() as s:
        a = await repo.create_company(s, OWNER_A, "Alfa")
        b = await repo.create_company(s, OWNER_B, "Beta")
        await repo.set_company_status(s, a.id, "active")
        await repo.set_company_status(s, b.id, "active")
        va = await repo.create_vacancy(s, a.id, OWNER_A, "Dasturchi", "Python", 7)
        vb = await repo.create_vacancy(s, b.id, OWNER_B, "Sotuvchi", "Savdo", 7)
        apps = []
        for c in (CAND1, CAND2, CAND3):
            app, _ = await repo.submit_application(s, va, a, c, f"N{c}", "file", "matn", "")
            apps.append(app.id)
        await s.commit()
        return a.id, b.id, va.id, vb.id, apps


def test_kompaniya_izolyatsiyasi(sm):
    a, b, va, vb, apps = run(_setup(sm))

    async def body():
        async with sm() as s:
            # B egasi A'ning hech narsasini ko'ra olmaydi — har yo'l bilan.
            for coro in (repo.list_applications(s, va, OWNER_B), repo.get_application(s, apps[0], OWNER_B),
                         repo.decide(s, apps[0], OWNER_B, status.INVITED), repo.close_vacancy(s, va, OWNER_B),
                         repo.count_undecided(s, va, OWNER_B), repo.company_vacancies(s, a, OWNER_B),
                         repo.create_invite(s, a, OWNER_B), repo.create_vacancy(s, a, OWNER_B, "x", "y", 3),
                         repo.get_application(s, 99999, OWNER_A)):
                with pytest.raises(repo.AccessError):
                    await coro
            assert len(await repo.list_applications(s, va, OWNER_A)) == 3
    run(body())


def test_hr_taklif_orqali_kiradi_va_bir_martalik(sm):
    a, b, va, vb, apps = run(_setup(sm))

    async def body():
        async with sm() as s:
            with pytest.raises(repo.AccessError):  # HR taklifni faqat ega yaratadi
                await repo.create_invite(s, a, HR_A)
            token = await repo.create_invite(s, a, OWNER_A)
            await repo.accept_invite(s, token, HR_A)
            assert len(await repo.list_applications(s, va, HR_A)) == 3
            with pytest.raises(repo.StateError):
                await repo.accept_invite(s, token, 999)
            with pytest.raises(repo.AccessError):  # HR boshqa kompaniyaga kira olmaydi
                await repo.list_applications(s, vb, HR_A)
            with pytest.raises(repo.AccessError):  # HR yangi HR taklif qila olmaydi
                await repo.create_invite(s, a, HR_A)
    run(body())


def test_eskirgan_taklif(sm):
    a, *_ = run(_setup(sm))

    async def body():
        async with sm() as s:
            token = await repo.create_invite(s, a, OWNER_A, ttl_days=-1)
            with pytest.raises(repo.StateError):
                await repo.accept_invite(s, token, HR_A)
    run(body())


def test_faol_bolmagan_kompaniya_vakansiya_ocholmaydi(sm):
    async def body():
        async with sm() as s:
            c = await repo.create_company(s, OWNER_A, "Yangi")
            with pytest.raises(repo.StateError) as e:
                await repo.create_vacancy(s, c.id, OWNER_A, "x", "y", 3)
            assert e.value.args[0] == "company_not_active"
    run(body())


def test_yopishda_faqat_qarorsizlarga(sm):
    a, b, va, vb, apps = run(_setup(sm))

    async def body():
        async with sm() as s:
            await repo.decide(s, apps[0], OWNER_A, status.INVITED)
            await repo.decide(s, apps[1], OWNER_A, status.SHORTLISTED)
            assert await repo.count_undecided(s, va, OWNER_A) == 2
            _, qolganlar = await repo.close_vacancy(s, va, OWNER_A)
            assert sorted(x.id for x in qolganlar) == sorted([apps[1], apps[2]])
            await s.commit()
        async with sm() as s:
            holat = {x.id: x.status for x in await repo.list_applications(s, va, OWNER_A)}
            assert holat == {apps[0]: status.INVITED, apps[1]: status.REJECTED, apps[2]: status.REJECTED}
            with pytest.raises(repo.StateError):  # ikkinchi marta yopib, ikkinchi rad xati ketmaydi
                await repo.close_vacancy(s, va, OWNER_A)
    run(body())


def test_yopilgan_vakansiyaga_ariza_tushmaydi(sm):
    a, b, va, vb, apps = run(_setup(sm))

    async def body():
        async with sm() as s:
            vacancy, _ = await repo.close_vacancy(s, va, OWNER_A)
            company = await s.get(repo.Company, a)
            with pytest.raises(repo.StateError):
                await repo.submit_application(s, vacancy, company, 555, "x", "f", "t", "")
    run(body())


def test_qayta_yuborish_cv_almashtiradi_va_ball_tozalanadi(sm):
    a, b, va, vb, apps = run(_setup(sm))

    async def body():
        async with sm() as s:
            await repo.save_ai_result(s, apps[0], 80, "{}")
            vacancy = await s.get(repo.Vacancy, va)
            company = await s.get(repo.Company, a)
            app, yangi = await repo.submit_application(s, vacancy, company, CAND1, "N", "file2", "yangi", "")
            assert not yangi and app.id == apps[0] and app.cv_file_id == "file2" and app.ai_score is None
    run(body())


def test_arizalar_ball_boyicha_ballsizlar_oxirida(sm):
    a, b, va, vb, apps = run(_setup(sm))

    async def body():
        async with sm() as s:
            await repo.save_ai_result(s, apps[0], 40, "{}")
            await repo.save_ai_result(s, apps[2], 90, "{}")
            await s.commit()
            assert [x.id for x in await repo.list_applications(s, va, OWNER_A)] == [apps[2], apps[0], apps[1]]
    run(body())


def test_cv_saqlash_muddati(sm):
    a, b, va, vb, apps = run(_setup(sm))

    async def body():
        async with sm() as s:
            await repo.close_vacancy(s, va, OWNER_A)
            await s.commit()
            assert await repo.purge_expired_cvs(s, 30) == 0  # hali muddat o'tmagan
            assert await repo.purge_expired_cvs(s, 30, at=now() + timedelta(days=31)) == 3
            await s.commit()
            app = await s.get(Application, apps[0])
            await s.refresh(app)
            assert app.cv_text is None and app.cv_file_id is None and app.cv_deleted_at is not None
            # B'ning ochiq vakansiyasiga tegilmaydi; takror chaqiruv 0
            assert await repo.purge_expired_cvs(s, 30, at=now() + timedelta(days=31)) == 0
    run(body())


def test_ai_kunlik_limit(sm):
    async def body():
        async with sm() as s:
            assert await repo.reserve_ai_call(s, 2)
            assert await repo.reserve_ai_call(s, 2)
            assert not await repo.reserve_ai_call(s, 2)
            assert await repo.reserve_ai_call(s, 2, at=now() + timedelta(days=1))  # yangi kun
            assert not await repo.reserve_ai_call(s, 0)
    run(body())


def test_muddat_eslatmasi_bir_marta_va_rad_etmaydi(sm):
    a, b, va, vb, apps = run(_setup(sm))

    async def body():
        async with sm() as s:
            keyin = now() + timedelta(days=8)
            natija = await repo.overdue_vacancies(s, at=keyin)
            ids = {v.id: (azolar, n) for v, azolar, n in natija}
            assert ids[va] == ([OWNER_A], 3)
            assert await repo.overdue_vacancies(s, at=keyin) == []
            # Taymer hech kimni rad etmaydi
            assert await repo.count_undecided(s, va, OWNER_A) == 3
    run(body())
