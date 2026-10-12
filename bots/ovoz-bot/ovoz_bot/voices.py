"""Tanlash mumkin bo'lgan tayyor (prebuilt) ovozlar.

Faqat rasmiy cookbook'da nomi aniq yozilganlar (Get_started_TTS.ipynb:
"Kore, Puck, Charon, Aoede, Fenrir, Enceladus"). Jami 30 ta deyilgan, lekin
qolganlarining nomini rasmiy manbada ko'rmadik — taxmin bilan qo'shilmaydi.
"""
VOICES = ("Kore", "Puck", "Charon", "Aoede", "Fenrir", "Enceladus")


def is_known(nom: str) -> bool:
    return nom in VOICES
