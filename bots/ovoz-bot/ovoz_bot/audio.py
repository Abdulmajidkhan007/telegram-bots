"""Gemini TTS audiosi → Telegram voice (OGG/Opus) — ffmpeg orqali.

Rasmiy cookbook (Get_started_TTS.ipynb): unary javob — RIFF sarlavhali WAV
(24 kHz, mono, 16-bit PCM), stream javob — xom 16-bit PCM. Ikkalasini ham
qabul qilamiz: sarlavha bo'lsa ffmpeg o'zi o'qiydi, bo'lmasa formatni aytamiz.

ffmpeg ro'yxat bilan chaqiriladi (shell yo'q), audio stdin/stdout orqali —
vaqtinchalik fayl ham, foydalanuvchi matni buyruq qatorida ham yo'q.
"""
import asyncio
import logging

log = logging.getLogger(__name__)

PCM_RATE = 24000
FFMPEG_TIMEOUT = 60


class AudioError(RuntimeError):
    pass


def is_wav(data: bytes) -> bool:
    return data[:4] == b"RIFF" and data[8:12] == b"WAVE"


def ffmpeg_cmd(ffmpeg: str, wav: bool) -> list[str]:
    kirish = [] if wav else ["-f", "s16le", "-ar", str(PCM_RATE), "-ac", "1"]
    return [ffmpeg, "-hide_banner", "-loglevel", "error", *kirish, "-i", "pipe:0",
            "-vn", "-c:a", "libopus", "-b:a", "32k", "-ac", "1", "-f", "ogg", "pipe:1"]


async def to_ogg_opus(ffmpeg: str, data: bytes, timeout: float = FFMPEG_TIMEOUT) -> bytes:
    if not data:
        raise AudioError("bo'sh audio")
    proc = await asyncio.create_subprocess_exec(
        *ffmpeg_cmd(ffmpeg, is_wav(data)),
        stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    try:
        out, err = await asyncio.wait_for(proc.communicate(data), timeout)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        raise AudioError(f"ffmpeg {timeout} s ichida tugamadi")
    if proc.returncode != 0 or not out:
        raise AudioError(f"ffmpeg kod {proc.returncode}: {err.decode(errors='replace')[:300]}")
    return out
