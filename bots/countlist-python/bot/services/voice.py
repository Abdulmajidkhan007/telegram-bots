"""Voice message to expense via OpenAI Whisper."""
import io
import logging
from typing import Optional

import aiohttp

from bot.config import settings

log = logging.getLogger(__name__)


async def transcribe_voice(file_bytes: bytes, file_name: str = "voice.ogg") -> Optional[str]:
    if not settings.openai_api_key:
        return None

    try:
        import openai
        client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
        audio_file = io.BytesIO(file_bytes)
        audio_file.name = file_name

        transcript = await client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language="uz",
        )
        return transcript.text
    except Exception as e:
        # Jim yutilmaydi: transkripsiya ishlamay qolsa sabab log'da ko'rinsin,
        # aks holda bot "ovozni tushunmadi" deb turaveradi va nega ekani
        # hech qayerda yozilmaydi.
        log.warning("Ovozni matnga o'girish muvaffaqiyatsiz (%s): %s", type(e).__name__, e)
        return None
