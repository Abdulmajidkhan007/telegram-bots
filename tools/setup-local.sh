#!/usr/bin/env bash
# Faqat o'z kompyuterda ishlaydigan botlarni (bots.json da "local": true)
# o'rnatadi. Node botlari Railway'da — ularning node_modules'i bu yerda kerak emas.
#
#   bash tools/setup-local.sh        # yoki: npm run setup:local
#
# Har bot O'Z papkasida .venv oladi. Ildizdagi bitta umumiy .venv'ga hammasini
# o'rnatish atoyo-rag-bot'ning torch'ini (CUDA bilan ~7 GB) ikki marta
# saqlashga olib kelgan edi. O'rnatish qadamlari bots.json'dan olinadi —
# atoyo-rag-bot uchun u yerda avval CPU torch turibdi.
#
# Qayta ishga tushirish xavfsiz: mavjud .venv va .env ga tegilmaydi,
# faqat yetishmayotgan paketlar o'rnatiladi.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

command -v python3 >/dev/null || { echo "python3 yo'q: sudo apt install -y python3 python3-venv"; exit 1; }
command -v node >/dev/null || { echo "node yo'q: sudo apt install -y nodejs"; exit 1; }

if [ -d "$ROOT/.venv" ]; then
  echo "⚠️  Ildizda .venv bor ($(du -sh "$ROOT/.venv" | cut -f1)). Botlar uni ishlatmaydi —"
  echo "   har bot o'z bots/<id>/.venv idan ishlaydi. Joy bo'shatish uchun: rm -rf .venv"
  echo
fi

mapfile -t BOTS < <(node tools/run.js local-ids)
[ "${#BOTS[@]}" -gt 0 ] || { echo "bots.json da \"local\": true bot yo'q"; exit 1; }

failed=()
for bot in "${BOTS[@]}"; do
  dir="$ROOT/bots/$bot"
  echo
  echo "━━━ $bot"

  if [ ! -x "$dir/.venv/bin/python" ]; then
    python3 -m venv "$dir/.venv" || { failed+=("$bot (venv yaratilmadi — python3-venv o'rnatilganmi?)"); continue; }
  fi

  # PATH'ning boshiga shu botning .venv'i qo'yiladi — run.js chaqiradigan
  # "pip" aynan shu .venv'niki bo'ladi, faollashtirilgan boshqa venv emas.
  # PIP_NO_CACHE_DIR: ~/.cache/pip ga yana bir necha GB yig'ilmasin.
  if ! PATH="$dir/.venv/bin:$PATH" VIRTUAL_ENV="$dir/.venv" PIP_NO_CACHE_DIR=1 \
       node tools/run.js install "$bot"; then
    failed+=("$bot (o'rnatish — yuqoridagi pip xabarini o'qing)")
    continue
  fi

  # O'lchov: CUDA kutubxonalari baribir tushib qolganmi (masalan, CPU torch
  # bu Python versiyasi uchun topilmay, pip PyPI'dagisini olgan bo'lsa).
  if compgen -G "$dir/.venv/lib/python*/site-packages/nvidia" >/dev/null; then
    failed+=("$bot (.venv ichida nvidia/CUDA paketlari bor — GPU'siz qurilmada keraksiz. Tuzatish: rm -rf bots/$bot/.venv va qayta: npm run setup:local)")
  fi

  if [ ! -f "$dir/.env" ] && [ -f "$dir/.env.example" ]; then
    cp "$dir/.env.example" "$dir/.env"
    echo "📝 bots/$bot/.env yaratildi — kalitlarni to'ldiring: npm run env -- $bot KALIT=qiymat"
  fi

  echo "📦 .venv hajmi: $(du -sh "$dir/.venv" | cut -f1)"
done

echo
if [ "${#failed[@]}" -gt 0 ]; then
  echo "❌ Muammo bo'ldi:"
  printf '   • %s\n' "${failed[@]}"
  exit 1
fi
echo "✅ Lokal botlar o'rnatildi: ${BOTS[*]}"
echo "   .env larni to'ldirgach ishga tushirish: npm run local"
