"""config.missing_settings() uchun testlar.

Regressiya: GEMINI_API_KEY bo'sh bo'lsa bot google-genai ichidan uzun
traceback bilan yiqilardi — qaysi kalit yetishmasligi aytilmasdi.

Ishga tushirish:  python3 -m unittest discover bots/xulosa-ai-bot
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config

TOLIQ = {"GEMINI_API_KEY": "g", "API_ID": "12345", "API_HASH": "h"}


class MissingSettingsTest(unittest.TestCase):
    def test_hammasi_bor(self):
        self.assertEqual(config.missing_settings(TOLIQ), [])

    def test_gemini_kaliti_yoq(self):
        got = config.missing_settings({**TOLIQ, "GEMINI_API_KEY": "  "})
        self.assertEqual(len(got), 1)
        self.assertIn("GEMINI_API_KEY", got[0])

    def test_bosh_env_hammasini_aytadi(self):
        got = " ".join(config.missing_settings({}))
        for kalit in ("GEMINI_API_KEY", "API_ID", "API_HASH"):
            self.assertIn(kalit, got)

    def test_api_id_raqam_emas(self):
        got = config.missing_settings({**TOLIQ, "API_ID": "abc"})
        self.assertEqual(len(got), 1)
        self.assertIn("raqam", got[0])


if __name__ == "__main__":
    unittest.main()
