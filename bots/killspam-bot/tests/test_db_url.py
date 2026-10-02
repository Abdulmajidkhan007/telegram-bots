"""Run: python -m pytest tests/test_db_url.py  (DB/tarmoq kerak emas).

DATABASE_URL ni SQLAlchemy uchun tayyorlash. Regressiya: SQLAlchemy 2.1 da
`postgresql://` ning standart drayveri psycopg (v3) ga o'zgardi, biz esa
psycopg2-binary o'rnatamiz — Railway'da "No module named 'psycopg'" bilan
yiqilardi.
"""
import pytest

from spam_bot.db.url import normalize_db_url


def test_railway_postgresql_url_pins_psycopg2():
    assert normalize_db_url("postgresql://u:p@h:5432/railway") == \
        "postgresql+psycopg2://u:p@h:5432/railway"


def test_heroku_style_postgres_scheme():
    assert normalize_db_url("postgres://u:p@h/d") == "postgresql+psycopg2://u:p@h/d"


def test_explicit_driver_is_left_alone():
    assert normalize_db_url("postgresql+psycopg://u:p@h/d") == "postgresql+psycopg://u:p@h/d"
    assert normalize_db_url("postgresql+psycopg2://u:p@h/d") == "postgresql+psycopg2://u:p@h/d"


def test_sqlite_untouched():
    assert normalize_db_url("sqlite://") == "sqlite://"


def test_whitespace_and_quotes_stripped():
    # Railway Variables'ga nusxalaganda tez-tez qo'shilib qoladi.
    assert normalize_db_url(' "postgresql://u:p@h/d" \n') == "postgresql+psycopg2://u:p@h/d"


@pytest.mark.parametrize("bad", [None, "", "   "])
def test_missing_url_names_the_variable(bad):
    with pytest.raises(ValueError, match="DATABASE_URL"):
        normalize_db_url(bad)


def test_unresolved_railway_reference_explained():
    with pytest.raises(ValueError, match="Add Reference"):
        normalize_db_url("${{Postgres.DATABASE_URL}}")
