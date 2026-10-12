from hr_bot import links


def test_vakansiya_parametri():
    assert links.parse_start("v_turkishbaby_ai") == ("vacancy", "turkishbaby_ai")


def test_join_parametri():
    tok = links.new_token()
    assert links.parse_start("join_" + tok) == ("join", tok)


def test_buzuq_parametrlar_rad_etiladi():
    for p in (None, "", "v_", "join_qisqa", "v_Katta", "x_abc", "v_a b", "v_" + "a" * 63,
              "v_../etc", "join_" + "a" * 60, "v_salom;drop"):
        assert links.parse_start(p) is None, p


def test_64_belgi_chegarasi():
    assert links.parse_start("v_" + "a" * 62) == ("vacancy", "a" * 62)
    assert links.parse_start("v_" + "a" * 63) is None


def test_token_telegram_cheklovida():
    for _ in range(50):
        p = "join_" + links.new_token()
        assert links.START_PARAM_RE.match(p) and len(p) <= 64


def test_slugify_lotin_kirill_apostrof():
    assert links.slugify("Turkish Baby") == "turkishbaby"
    assert links.slugify("Ташкент Сити") == "tashkentsiti"
    assert links.slugify("O'zbek Go'sht") == "ozbekgosht"


def test_vacancy_slug_takrorlanmaydi():
    assert links.vacancy_slug("Turkish Baby", "AI", set()) == "turkishbaby_ai"
    assert links.vacancy_slug("Turkish Baby", "AI", {"turkishbaby_ai"}) == "turkishbaby_ai_2"
    assert links.vacancy_slug("Turkish Baby", "AI", {"turkishbaby_ai", "turkishbaby_ai_2"}) == "turkishbaby_ai_3"


def test_vacancy_slug_har_doim_yaroqli():
    for c, v in (("!!!", "???"), ("Компания" * 10, "Вакансия" * 10), ("", "")):
        slug = links.vacancy_slug(c, v, set())
        assert links.parse_start("v_" + slug) == ("vacancy", slug)
