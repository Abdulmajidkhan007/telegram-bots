"""Ariza holatlari va o'tishlari — bitta joyda, test bilan.

Qoida: AI yoki taymer hech qachon o'zi rad etmaydi. `rejected` ga faqat HR
tugmasi yoki HR bosgan "Vakansiyani yopish" olib keladi.
"""
NEW = "new"
SHORTLISTED = "shortlisted"  # "Keyinroq" — ko'rib chiqiladi, hali qaror yo'q
INVITED = "invited"
REJECTED = "rejected"

ALL = (NEW, SHORTLISTED, INVITED, REJECTED)

_ALLOWED = {
    NEW: {SHORTLISTED, INVITED, REJECTED},
    SHORTLISTED: {INVITED, REJECTED},
    INVITED: set(),  # nomzodga taklif ketgan — orqaga qaytarilmaydi
    REJECTED: set(),  # rad xati ketgan — orqaga qaytarilmaydi
}

# Vakansiya yopilganda rad xati shu holatdagilarga ketadi.
UNDECIDED = (NEW, SHORTLISTED)


class TransitionError(ValueError):
    pass


def can_transition(eski: str, yangi: str) -> bool:
    return yangi in _ALLOWED.get(eski, set())


def transition(eski: str, yangi: str) -> str:
    if not can_transition(eski, yangi):
        raise TransitionError(f"{eski} → {yangi} mumkin emas")
    return yangi
