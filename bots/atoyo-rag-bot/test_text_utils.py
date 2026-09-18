"""text_utils uchun testlar — LLM javobi ustidagi barcha mo'rt joylar.

Ishga tushirish:  python3 -m unittest discover bots/atoyo-rag-bot
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import text_utils as tu


class AjratLeadTest(unittest.TestCase):
    def test_oddiy_lead(self):
        matn, lead = tu.ajrat_lead("[LEAD: Ali | +998901234567 | Moyka] Rahmat!")
        self.assertEqual(matn, "Rahmat!")
        self.assertEqual(lead["ism"], "Ali")
        self.assertEqual(lead["telefon"], "+998901234567")
        self.assertEqual(lead["mahsulot"], "Moyka")

    def test_leadsiz_javob_ozgarmaydi(self):
        matn, lead = tu.ajrat_lead("Salom, qanday yordam bera olaman?")
        self.assertIsNone(lead)
        self.assertEqual(matn, "Salom, qanday yordam bera olaman?")

    def test_javobdagi_boshqa_qavs_matnni_qirqmaydi(self):
        # Eski split("]") mantiqi aynan shu yerda sinardi: javobning
        # katta qismi yo'qolib ketardi.
        xom = ("[LEAD: Ali | +998901234567 | Filtr] Rahmat! "
               "Batafsil [bu yerda] va [mana bu yerda] ko'ring.")
        matn, lead = tu.ajrat_lead(xom)
        self.assertIsNotNone(lead)
        self.assertIn("mana bu yerda", matn)
        self.assertNotIn("LEAD", matn)

    def test_lead_matn_ortasida_bolsa_ham_topiladi(self):
        matn, lead = tu.ajrat_lead("Buyurtmangiz qabul qilindi. [LEAD: Vali | 901112233 | Smesitel]")
        self.assertEqual(lead["ism"], "Vali")
        self.assertEqual(matn, "Buyurtmangiz qabul qilindi.")

    def test_kam_maydonli_lead_yiqilmaydi(self):
        _, lead = tu.ajrat_lead("[LEAD: Ali]")
        self.assertEqual(lead["ism"], "Ali")
        self.assertEqual(lead["telefon"], "")


class TelefonTest(unittest.TestCase):
    def test_toliq_raqam(self):
        self.assertEqual(tu.telefon_tozala("+998 90 854 56 03"), "+998908545603")

    def test_kod_qoshiladi(self):
        self.assertEqual(tu.telefon_tozala("90 854 56 03"), "+998908545603")

    def test_qavs_va_chiziq(self):
        self.assertEqual(tu.telefon_tozala("(90) 854-56-03"), "+998908545603")

    def test_notogri_raqam_rad_etiladi(self):
        for yomon in ["", None, "salom", "123", "+7 999 123 45 67", "99890854560312345"]:
            with self.subTest(qiymat=yomon):
                self.assertIsNone(tu.telefon_tozala(yomon))


class BolaklarTest(unittest.TestCase):
    def test_qisqa_matn_bolinmaydi(self):
        self.assertEqual(tu.bolaklarga_bol("qisqa"), ["qisqa"])

    def test_uzun_matn_limitga_sigadi(self):
        matn = "\n".join(f"{i}-qator mahsulot nomi va narxi" for i in range(400))
        bolaklar = tu.bolaklarga_bol(matn)
        self.assertGreater(len(bolaklar), 1)
        for b in bolaklar:
            self.assertLessEqual(len(b), tu.TELEGRAM_LIMIT)

    def test_hech_narsa_yoqolmaydi(self):
        matn = "\n".join(f"qator-{i}" for i in range(900))
        birlashgan = " ".join(tu.bolaklarga_bol(matn)).replace(" ", "").replace("\n", "")
        self.assertEqual(birlashgan, matn.replace("\n", ""))

    def test_probelsiz_uzun_matn_ham_bolinadi(self):
        bolaklar = tu.bolaklarga_bol("x" * 10000)
        self.assertEqual(sum(len(b) for b in bolaklar), 10000)


if __name__ == "__main__":
    unittest.main()
