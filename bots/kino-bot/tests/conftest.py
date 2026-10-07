"""Testlar bot papkasidan ishga tushadi: python -m pytest. Internetga chiqmaydi."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import database as db  # noqa: E402

SUPER = 7000000001


@pytest.fixture()
def baza(tmp_path):
    db.configure(tmp_path / "database.json", SUPER)
    return tmp_path / "database.json"
