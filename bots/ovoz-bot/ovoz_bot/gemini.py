"""Gemini: ovoz → matn (generate_content) va matn → ovoz (Gemini 3.8 TTS, interactions).

Gemini 429/503 qaytarsa — exponential backoff bilan qayta urinamiz, STT uchun
zaxira modelga o'tamiz. Hammasi tugasa Busy — foydalanuvchiga "hozir band"
deyiladi, jim qolinmaydi. Boshqa xatolar (kalit, model nomi, bloklangan
kontent) qayta urinilmaydi — ular vaqt bilan o'tib ketmaydi.
"""
import asyncio
import base64
import logging
import random

log = logging.getLogger(__name__)

RETRY_CODES = {429, 500, 502, 503, 504}
STT_PROMPT = (
    "Transcribe this audio verbatim in the language it is spoken in (Uzbek, Russian or English, "
    "possibly mixed). Uzbek must be written in the Latin alphabet. Do not translate, summarize "
    "or add comments. If there is no speech, answer exactly: [NO_SPEECH]"
)
NO_SPEECH = "[NO_SPEECH]"
# So'rov ichida (inline) yuboriladigan audio chegarasi. Base64 hajmni ~1.33 marta
# oshiradi; 20 MB so'rov chegarasidan xavfsiz pastda qolish uchun undan katta
# fayl Files API orqali yuklanadi (xulosa-ai-bot'dagi yondashuv).
INLINE_MAX = 14 * 1024 * 1024


class Busy(RuntimeError):
    """Gemini band (429/5xx) va urinishlar tugadi."""


class GeminiError(RuntimeError):
    """Qayta urinib bo'lmaydigan xato (kalit, model, kontent)."""


def status_of(exc: BaseException) -> int | None:
    # google.genai.errors.APIError → .code; interactions (GenAiError) → .status_code
    for nom in ("code", "status_code"):
        v = getattr(exc, nom, None)
        if isinstance(v, int):
            return v
    return None


def backoff_delays(urinishlar: int, asos: float = 1.0, maks: float = 16.0) -> list[float]:
    """1, 2, 4, ... (maks bilan cheklangan) + 0–25% tasodifiy — ko'p foydalanuvchi bir vaqtda urmasin."""
    return [min(maks, asos * 2 ** i) * (1 + random.random() / 4) for i in range(urinishlar)]


async def with_retry(fn, urinishlar: int = 3, sleep=None):
    """fn() ni chaqiradi; 429/5xx bo'lsa kutib qayta uradi. Oxirida Busy."""
    sleep = sleep or asyncio.sleep
    oxirgi = None
    for i, kutish in enumerate([0.0, *backoff_delays(urinishlar - 1)]):
        if kutish:
            await sleep(kutish)
        try:
            return await fn()
        except (asyncio.TimeoutError, ConnectionError) as e:
            oxirgi = e
            log.warning("Gemini: tarmoq/timeout (%d-urinish): %s", i + 1, type(e).__name__)
        except Exception as e:
            kod = status_of(e)
            if kod not in RETRY_CODES:
                raise GeminiError(f"{kod}: {e}") from e
            oxirgi = e
            log.warning("Gemini: %s (%d-urinish)", kod, i + 1)
    raise Busy(str(oxirgi))


class Gemini:
    def __init__(self, client, stt_model: str, stt_fallback: str, tts_model: str, timeout: float = 120.0):
        self.client = client
        self.stt_models = [m for m in (stt_model, stt_fallback) if m]
        self.tts_model = tts_model
        self.timeout = timeout

    async def check_models(self) -> None:
        """Ishga tushganda: barcha model nomlari mavjudmi (xato bo'lsa — aniq sabab bilan to'xtash)."""
        for m in dict.fromkeys([*self.stt_models, self.tts_model]):
            await self.client.aio.models.get(model=m)

    async def transcribe(self, data: bytes, mime_type: str) -> str:
        import io

        from google.genai import types

        yuklangan = None
        if len(data) > INLINE_MAX:
            yuklangan = await with_retry(lambda: self.client.aio.files.upload(
                file=io.BytesIO(data), config={"mime_type": mime_type}))
            part = yuklangan
        else:
            part = types.Part.from_bytes(data=data, mime_type=mime_type)
        try:
            return await self._transcribe_part(part)
        finally:
            if yuklangan is not None:
                try:
                    await self.client.aio.files.delete(name=yuklangan.name)
                except Exception as e:  # o'chmasa ham javob tayyor — lekin jim emas
                    log.warning("Gemini fayli o'chirilmadi: %s", e)

    async def _transcribe_part(self, part) -> str:
        for i, model in enumerate(self.stt_models):
            async def chaqir(model=model):
                return await asyncio.wait_for(
                    self.client.aio.models.generate_content(model=model, contents=[part, STT_PROMPT]),
                    self.timeout)
            try:
                resp = await with_retry(chaqir)
            except Busy:
                if i + 1 < len(self.stt_models):
                    log.warning("STT: %s band — zaxira %s ga o'tamiz", model, self.stt_models[i + 1])
                    continue
                raise
            matn = (getattr(resp, "text", None) or "").strip()
            return "" if matn == NO_SPEECH else matn
        raise Busy("STT modellari yo'q")

    async def synthesize(self, text: str, voice: str) -> bytes:
        """Rasmiy cookbook (Get_started_TTS.ipynb) dagi chaqiruv: javob — base64 WAV."""
        async def chaqir():
            return await asyncio.wait_for(self.client.aio.interactions.create(
                model=self.tts_model, input=text, response_format={"type": "audio"},
                generation_config={"speech_config": [{"voice": voice}]},
            ), self.timeout)

        javob = await with_retry(chaqir)
        audio = getattr(javob, "output_audio", None)
        if audio is None or not getattr(audio, "data", None):
            raise GeminiError("TTS javobida audio yo'q")
        return base64.b64decode(audio.data)
