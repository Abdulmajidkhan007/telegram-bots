#!/usr/bin/env bash
# Railway'ga qo'yilmaydigan (userbot / Telethon / RAG) botlarni bitta tmux
# sessiyasida, har birini alohida oynada ishga tushiradi.
#
#   bash tools/tmux-local.sh            # ishga tushirish
#   tmux attach -t botlar               # ko'rish (oynalar: Ctrl+B, keyin 0/1/2)
#   tmux kill-session -t botlar         # hammasini to'xtatish
#
# Har bot o'z papkasidagi .venv dan ishlaydi (avval: npm run setup:local). .env to'ldirilmagan bo'lsa bot
# nima yetishmasligini yozib to'xtaydi — oyna yopilmaydi, xabarni o'qiysiz.
set -euo pipefail

SESSION=botlar
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Ro'yxat bots.json dagi "local": true dan olinadi (setup-local.sh bilan bir xil).
mapfile -t BOTS < <(node "$ROOT/tools/run.js" local-ids)

command -v tmux >/dev/null || { echo "tmux yo'q: sudo apt install -y tmux  (Termux: pkg install tmux)"; exit 1; }

if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "'$SESSION' sessiyasi allaqachon ishlayapti: tmux attach -t $SESSION"
  exit 0
fi

first=1
for bot in "${BOTS[@]}"; do
  dir="$ROOT/bots/$bot"
  if [ ! -x "$dir/.venv/bin/python" ]; then
    echo "⚠️  $bot: .venv yo'q — o'tkazib yuborildi. Avval: npm run setup:local"
    continue
  fi
  if [ ! -f "$dir/.env" ]; then
    echo "⚠️  $bot: .env yo'q — o'tkazib yuborildi. Avval: cp bots/$bot/.env.example bots/$bot/.env va to'ldiring"
    continue
  fi
  # Bot yiqilsa ham oyna ochiq qoladi (exec bash) — xato matni ko'rinib tursin.
  cmd="cd '$dir' && .venv/bin/python main.py; echo; echo \"⛔ $bot to'xtadi (yuqoridagi xabarni o'qing)\"; exec bash"
  if [ $first -eq 1 ]; then
    tmux new-session -d -s "$SESSION" -n "$bot" "$cmd"
    first=0
  else
    tmux new-window -t "$SESSION" -n "$bot" "$cmd"
  fi
  echo "▶️  $bot ishga tushdi"
done

if [ $first -eq 1 ]; then
  echo "Hech bir bot ishga tushmadi — yuqoridagi ogohlantirishlarga qarang."
  exit 1
fi
echo
echo "Ko'rish: tmux attach -t $SESSION   (chiqish, to'xtatmasdan: Ctrl+B, keyin D)"
