from datetime import date
from decimal import Decimal
from typing import Optional


def format_amount(amount: Decimal | float, currency: str = "UZS") -> str:
    n = int(amount)
    formatted = f"{n:,}".replace(",", " ")
    if currency == "UZS":
        return f"{formatted} so'm"
    return f"{formatted} {currency}"


def format_date(d: date) -> str:
    months = [
        "", "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
        "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
    ]
    return f"{d.day} {months[d.month]} {d.year}"


def format_expense_list(expenses: list[dict], title: str) -> str:
    if not expenses:
        return f"📭 <b>{title}</b>\n\nHarajatlar topilmadi."

    lines = [f"📊 <b>{title}</b>\n"]
    total = Decimal(0)
    for e in expenses:
        amount = Decimal(str(e.get("amount", 0)))
        total += amount
        cat_icon = e.get("category_icon", "📦")
        desc = e.get("description", "")
        lines.append(f"  {cat_icon} {desc} — <b>{format_amount(amount)}</b>")

    lines.append(f"\n💰 <b>Jami: {format_amount(total)}</b>")
    return "\n".join(lines)


def format_stats_message(summary: dict) -> str:
    today = format_amount(summary.get("today", 0))
    week = format_amount(summary.get("this_week", 0))
    month = format_amount(summary.get("this_month", 0))
    all_time = format_amount(summary.get("all_time", 0))

    return (
        f"📈 <b>Statistika</b>\n\n"
        f"🌅 Bugun:         <b>{today}</b>\n"
        f"📅 Bu hafta:       <b>{week}</b>\n"
        f"📆 Bu oy:          <b>{month}</b>\n"
        f"🗄 Jami:           <b>{all_time}</b>"
    )
