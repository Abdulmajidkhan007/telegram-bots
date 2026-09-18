"""database.py uchun regressiya testlari.

Har test aniq bir tuzatilgan bug'ni qo'riqlaydi — tuzatishdan oldin
ikkalasi ham yiqilardi. Tashqi xizmat kerak emas: baza vaqtinchalik
faylda yaratiladi.

Ishga tushirish:  python3 -m unittest discover bots/xulosa-ai-bot
"""

import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import database


class BazaliTest(unittest.TestCase):
    """Har test uchun toza vaqtinchalik baza."""

    def setUp(self):
        self._fayl = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self._fayl.close()
        self._eski_db = database.DB_NAME
        database.DB_NAME = self._fayl.name
        database.init_db()

    def tearDown(self):
        database.DB_NAME = self._eski_db
        os.unlink(self._fayl.name)


class GetAllUserIdsTest(BazaliTest):
    """Bug: broadcast get_all_users_list() (LIMIT 10) ustidan yurar edi,
    shuning uchun 10 tadan ortiq obunachiga xabar YETMASDAN qolardi."""

    def test_ondan_kop_foydalanuvchi_hammasi_qaytadi(self):
        for i in range(25):
            database.save_user(1000 + i, f"User{i}")

        ids = database.get_all_user_ids()

        self.assertEqual(len(ids), 25, "broadcast ro'yxati qirqilib qolgan")
        self.assertEqual(set(ids), {1000 + i for i in range(25)})

    def test_admin_paneldagi_royxat_hamon_10_ta(self):
        # get_all_users_list() ko'rinish uchun — u qirqilgani TO'G'RI.
        for i in range(25):
            database.save_user(2000 + i, f"User{i}")

        self.assertEqual(len(database.get_all_users_list()), 10)


class CheckUserAccessTest(BazaliTest):
    """Bug: bazada yo'q foydalanuvchi har safar "yangi" hisoblanib,
    kunlik limitni cheksiz aylanib o'tardi."""

    def test_notanish_foydalanuvchi_bazaga_yoziladi(self):
        ruxsat, _ = database.check_user_access(777, "Yangi")

        self.assertTrue(ruxsat)
        self.assertIsNotNone(database.search_user_by_id(777),
                             "foydalanuvchi bazaga yozilmagan")

    def test_limit_uchinchi_sorovda_tugaydi(self):
        # Obunasi yo'q foydalanuvchi uchun kuniga 2 ta so'rov.
        database.save_user(888, "Test")
        # save_user 3 kunlik sinov beradi — limitni ko'rish uchun uni bekor qilamiz.
        import sqlite3
        with sqlite3.connect(database.DB_NAME) as conn:
            conn.execute("UPDATE users SET sub_until = NULL WHERE user_id = 888")

        self.assertTrue(database.check_user_access(888)[0])   # 1-so'rov
        self.assertTrue(database.check_user_access(888)[0])   # 2-so'rov
        self.assertFalse(database.check_user_access(888)[0],  # 3-so'rov — to'xtashi kerak
                         "kunlik limit ishlamayapti")


if __name__ == "__main__":
    unittest.main()
