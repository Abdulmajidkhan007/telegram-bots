import io
import shutil
import struct
import wave

import pytest
from conftest import run

from ovoz_bot import audio

FFMPEG = shutil.which("ffmpeg")


def _pcm(sekund=0.5):
    n = int(audio.PCM_RATE * sekund)
    return b"".join(struct.pack("<h", int(8000 * ((i // 40) % 2 * 2 - 1))) for i in range(n))


def _wav(pcm):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(audio.PCM_RATE); w.writeframes(pcm)
    return buf.getvalue()


def test_wav_aniqlash():
    assert audio.is_wav(_wav(_pcm(0.01)))
    assert not audio.is_wav(_pcm(0.01))
    assert not audio.is_wav(b"RIFF")


def test_buyruq_xom_pcm_uchun_format_aytadi():
    cmd = audio.ffmpeg_cmd("/usr/bin/ffmpeg", wav=False)
    assert cmd[0] == "/usr/bin/ffmpeg"
    assert cmd[cmd.index("-f"):cmd.index("-f") + 6] == ["-f", "s16le", "-ar", "24000", "-ac", "1"]
    assert cmd[cmd.index("-c:a") + 1] == "libopus" and cmd[-3:] == ["-f", "ogg", "pipe:1"]
    assert "pipe:0" in cmd


def test_buyruq_wav_uchun_formatni_ffmpeg_ozi_oqiydi():
    cmd = audio.ffmpeg_cmd("ffmpeg", wav=True)
    assert "s16le" not in cmd and cmd[cmd.index("-i") + 1] == "pipe:0"


def test_buyruqda_shell_belgilari_yoq():
    # Ro'yxat ko'rinishi: foydalanuvchi matni hech qachon buyruqqa tushmaydi.
    for wav in (True, False):
        assert all(isinstance(x, str) and ";" not in x and "|" not in x for x in audio.ffmpeg_cmd("ffmpeg", wav))


@pytest.mark.skipif(not FFMPEG, reason="ffmpeg o'rnatilmagan")
@pytest.mark.parametrize("wav", [True, False])
def test_haqiqiy_aylantirish_ogg_opus(wav):
    pcm = _pcm()
    ogg = run(audio.to_ogg_opus(FFMPEG, _wav(pcm) if wav else pcm))
    assert ogg[:4] == b"OggS" and b"OpusHead" in ogg[:200]


@pytest.mark.skipif(not FFMPEG, reason="ffmpeg o'rnatilmagan")
def test_buzuq_wav_xato_beradi():
    with pytest.raises(audio.AudioError):
        run(audio.to_ogg_opus(FFMPEG, b"RIFF\x00\x00\x00\x00WAVEbuzuq"))


def test_bosh_audio_xato():
    with pytest.raises(audio.AudioError):
        run(audio.to_ogg_opus("ffmpeg", b""))
