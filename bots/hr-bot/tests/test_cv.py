import io

import pytest
from pypdf import PdfWriter

from hr_bot import cv


def _pdf(pages=1):
    w = PdfWriter()
    for _ in range(pages):
        w.add_blank_page(200, 200)
    buf = io.BytesIO()
    w.write(buf)
    return buf.getvalue()


def test_metadata_tekshiruvi():
    cv.check_document("application/pdf", 1000, "cv.pdf")
    cv.check_document(None, 1000, "CV.PDF")  # ba'zi klientlar mime bermaydi
    for args, kalit in ((("image/png", 10, "a.png"), "cv_not_pdf"),
                        (("application/pdf", 0, "a.pdf"), "cv_empty"),
                        (("application/pdf", None, "a.pdf"), "cv_empty"),
                        (("application/pdf", cv.MAX_BYTES + 1, "a.pdf"), "cv_too_big")):
        with pytest.raises(cv.CvError) as e:
            cv.check_document(*args)
        assert e.value.args[0] == kalit


def test_pdf_niqobidagi_boshqa_fayl():
    with pytest.raises(cv.CvError) as e:
        cv.extract_text(b"MZ\x90\x00 bu exe")
    assert e.value.args[0] == "cv_not_pdf"


def test_buzuq_pdf():
    with pytest.raises(cv.CvError) as e:
        cv.extract_text(b"%PDF-1.4 buzuq")
    assert e.value.args[0] == "cv_broken"


def test_sahifa_chegarasi():
    with pytest.raises(cv.CvError) as e:
        cv.extract_text(_pdf(cv.MAX_PAGES + 1))
    assert e.value.args[0] == "cv_too_many_pages"


def test_matnsiz_pdf_bosh_qator():
    # Skanerlangan CV: xato emas, AI ball hisoblanmaydi, HR faylni ko'radi.
    assert cv.extract_text(_pdf(2)) == ""
