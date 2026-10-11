import asyncio
import base64
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from conftest import run

from ovoz_bot import gemini as g


class ApiErr(Exception):
    def __init__(self, code):
        super().__init__(f"{code} xato")
        self.code = code


class GaosErr(Exception):
    def __init__(self, status_code):
        super().__init__("x")
        self.status_code = status_code


def _sleep():
    return AsyncMock()


def test_backoff_osib_boradi_va_cheklangan():
    d = g.backoff_delays(6, asos=1, maks=8)
    assert 1 <= d[0] <= 1.25 and 2 <= d[1] <= 2.5 and 4 <= d[2] <= 5
    assert all(x <= 8 * 1.25 for x in d)


def test_status_ikkala_xato_turidan():
    assert g.status_of(ApiErr(429)) == 429
    assert g.status_of(GaosErr(503)) == 503
    assert g.status_of(RuntimeError()) is None


def test_retry_503_dan_keyin_muvaffaqiyat():
    fn = AsyncMock(side_effect=[ApiErr(503), GaosErr(429), "ok"])
    uxla = _sleep()
    assert run(g.with_retry(fn, 3, sleep=uxla)) == "ok"
    assert fn.await_count == 3 and uxla.await_count == 2


def test_retry_tugasa_busy():
    with pytest.raises(g.Busy):
        run(g.with_retry(AsyncMock(side_effect=ApiErr(429)), 3, sleep=_sleep()))


def test_kalit_xatosi_qayta_urinilmaydi():
    fn = AsyncMock(side_effect=ApiErr(400))
    with pytest.raises(g.GeminiError):
        run(g.with_retry(fn, 3, sleep=_sleep()))
    assert fn.await_count == 1


def test_timeout_qayta_urinadi():
    fn = AsyncMock(side_effect=[asyncio.TimeoutError(), "ok"])
    assert run(g.with_retry(fn, 3, sleep=_sleep())) == "ok"


def _client(stt=None, tts=None):
    c = MagicMock()
    c.aio.models.generate_content = AsyncMock(side_effect=stt)
    c.aio.interactions.create = AsyncMock(side_effect=tts)
    c.aio.files.upload = AsyncMock(return_value=SimpleNamespace(name="files/1"))
    c.aio.files.delete = AsyncMock()
    return c


def test_stt_band_bolsa_zaxira_modelga_otadi(monkeypatch):
    monkeypatch.setattr(g.asyncio, "sleep", AsyncMock())
    c = _client(stt=[ApiErr(503)] * 3 + [SimpleNamespace(text=" Salom dunyo ")])
    gem = g.Gemini(c, "asosiy", "zaxira", "tts")
    assert run(gem.transcribe(b"ogg", "audio/ogg")) == "Salom dunyo"
    modellar = [call.kwargs["model"] for call in c.aio.models.generate_content.call_args_list]
    assert modellar == ["asosiy"] * 3 + ["zaxira"]


def test_stt_ikkala_model_band_busy(monkeypatch):
    monkeypatch.setattr(g.asyncio, "sleep", AsyncMock())
    gem = g.Gemini(_client(stt=[ApiErr(429)] * 6), "a", "b", "t")
    with pytest.raises(g.Busy):
        run(gem.transcribe(b"x", "audio/ogg"))


def test_stt_nutq_yoq():
    gem = g.Gemini(_client(stt=[SimpleNamespace(text=g.NO_SPEECH)]), "a", "", "t")
    assert run(gem.transcribe(b"x", "audio/ogg")) == ""


def test_katta_fayl_files_api_orqali_va_ochiriladi():
    c = _client(stt=[SimpleNamespace(text="ok")])
    run(g.Gemini(c, "a", "", "t").transcribe(b"x" * (g.INLINE_MAX + 1), "audio/mpeg"))
    c.aio.files.upload.assert_awaited_once()
    c.aio.files.delete.assert_awaited_once_with(name="files/1")
    assert c.aio.models.generate_content.call_args.kwargs["contents"][0].name == "files/1"


def test_tts_cookbook_chaqiruvi_va_base64():
    wav = b"RIFF....WAVEdata"
    c = _client(tts=[SimpleNamespace(output_audio=SimpleNamespace(data=base64.b64encode(wav).decode()))])
    assert run(g.Gemini(c, "a", "", "gemini-3.8-flash-tts").synthesize("Salom", "Puck")) == wav
    kw = c.aio.interactions.create.call_args.kwargs
    assert kw["model"] == "gemini-3.8-flash-tts" and kw["input"] == "Salom"
    assert kw["response_format"] == {"type": "audio"}
    assert kw["generation_config"] == {"speech_config": [{"voice": "Puck"}]}


def test_tts_audiosiz_javob_xato():
    c = _client(tts=[SimpleNamespace(output_audio=None)])
    with pytest.raises(g.GeminiError):
        run(g.Gemini(c, "a", "", "t").synthesize("x", "Kore"))
