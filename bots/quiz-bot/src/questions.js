// ============================================================
//  Savollar bazasi va kategoriyalar daraxti
//  Runtime'da: data/questions/<yo'nalish>/<bo'lim>.json (Railway Volume bilan saqlanadi)
//  Birinchi ishga tushganda repo'dagi questions/ dan ko'chiriladi (seed).
//  Foydalanuvchilar va admin ham shu yerga savol qo'sha oladi.
// ============================================================
const fs = require('fs');
const path = require('path');
const storage = require('./storage');

// Runtime joyi (yoziladigan, doim saqlanadigan)
const QUESTIONS_DIR = process.env.QUESTIONS_DIR
  ? path.resolve(process.env.QUESTIONS_DIR)
  : path.join(__dirname, '..', 'data', 'questions');

// Repo'dagi boshlang'ich savollar (seed)
const SEED_DIR = path.join(__dirname, '..', 'questions');

function copyRecursive(src, dst) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const s = path.join(src, item);
    const d = path.join(dst, item);
    const stat = fs.statSync(s);
    if (stat.isDirectory()) {
      copyRecursive(s, d);
    } else if (!fs.existsSync(d)) {
      fs.copyFileSync(s, d);
    }
  }
}

function seedIfNeeded() {
  if (path.resolve(QUESTIONS_DIR) === path.resolve(SEED_DIR)) return;
  if (!fs.existsSync(QUESTIONS_DIR)) fs.mkdirSync(QUESTIONS_DIR, { recursive: true });
  copyRecursive(SEED_DIR, QUESTIONS_DIR);
}
seedIfNeeded();

function fileFor(dir, sub) {
  return path.join(QUESTIONS_DIR, dir, sub + '.json');
}

function loadAll() {
  const tree = {}; // direction -> { label, emoji, subs: { key -> {label, questions} } }
  if (!fs.existsSync(QUESTIONS_DIR)) return tree;

  for (const dir of fs.readdirSync(QUESTIONS_DIR)) {
    const dirPath = path.join(QUESTIONS_DIR, dir);
    if (!fs.statSync(dirPath).isDirectory()) continue;

    for (const file of fs.readdirSync(dirPath)) {
      if (!file.endsWith('.json')) continue;
      try {
        const data = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf8'));
        const dk = data.direction || dir;
        const sk = data.key || file.replace('.json', '');
        if (!tree[dk]) {
          // Emoji va tartib savol faylidan ham olinadi: directions.json faqat
          // birinchi ishga tushganda yoziladi, keyin qo'shilgan yo'nalishlar
          // u yerda bo'lmaydi va hammasi 📚 bo'lib qolardi.
          const known = storage.getDirections().find(x => x.key === dk);
          tree[dk] = {
            label: data.directionLabel || dk,
            emoji: (known && known.emoji) || data.directionEmoji || '📚',
            order: Number.isFinite(data.directionOrder) ? data.directionOrder : 1000,
            subs: {}
          };
        }
        // Eski fayl (tartib/emojisiz) birinchi o'qilgan bo'lsa — keyingi fayldan to'ldiramiz.
        if (tree[dk].order === 1000 && Number.isFinite(data.directionOrder)) tree[dk].order = data.directionOrder;
        if (tree[dk].emoji === '📚' && data.directionEmoji) tree[dk].emoji = data.directionEmoji;
        tree[dk].subs[sk] = {
          label: data.label || sk,
          order: Number.isFinite(data.order) ? data.order : 1000,
          questions: Array.isArray(data.questions) ? data.questions : []
        };
      } catch (e) {
        console.error('⚠️ Savol faylida xato:', file, '-', e.message);
      }
    }
  }
  return tree;
}

let TREE = loadAll();
function reload() { TREE = loadAll(); return TREE; }

// ---------- O'qish (read) ----------
// "Aralash": yo'nalishdagi barcha bo'limlar savollari birga (fayl emas, virtual bo'lim).
const MIX_KEY = '__mix';

function byOrder(a, b) { return (a.order - b.order) || a.label.localeCompare(b.label); }

function getDirections() {
  return Object.entries(TREE)
    .map(([key, v]) => ({ key, label: v.label, emoji: v.emoji, order: v.order }))
    .sort(byOrder);
}
function getSubs(directionKey) {
  const d = TREE[directionKey];
  if (!d) return [];
  return Object.entries(d.subs)
    .map(([key, v]) => ({ key, label: v.label, count: v.questions.length, order: v.order }))
    .sort(byOrder);
}
function getQuestions(directionKey, subKey) {
  const d = TREE[directionKey];
  if (!d) return [];
  if (subKey === MIX_KEY) return Object.values(d.subs).flatMap(s => s.questions);
  if (!d.subs[subKey]) return [];
  return d.subs[subKey].questions;
}
function getSubLabel(directionKey, subKey) {
  const d = TREE[directionKey];
  if (!d) return subKey;
  if (subKey === MIX_KEY) return `${d.label} — 🔀 Aralash`;
  if (!d.subs[subKey]) return subKey;
  return d.subs[subKey].label;
}

// ---------- Yozish (admin uchun: write) ----------
function addQuestion(dir, sub, q) {
  const file = fileFor(dir, sub);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  data.questions = data.questions || [];
  data.questions.push(q);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  reload();
}
function editQuestion(dir, sub, index, q) {
  const file = fileFor(dir, sub);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!data.questions || !data.questions[index]) return false;
  data.questions[index] = q;
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  reload();
  return true;
}
function deleteQuestion(dir, sub, index) {
  const file = fileFor(dir, sub);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!data.questions || !data.questions[index]) return false;
  data.questions.splice(index, 1);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  reload();
  return true;
}
function createSub(dirKey, dirLabel, subKey, subLabel) {
  const dirPath = path.join(QUESTIONS_DIR, dirKey);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  const file = fileFor(dirKey, subKey);
  if (fs.existsSync(file)) return false; // allaqachon mavjud
  fs.writeFileSync(file, JSON.stringify({
    direction: dirKey, directionLabel: dirLabel, key: subKey, label: subLabel, questions: []
  }, null, 2));
  reload();
  return true;
}

// ---------- Statistika (dashboard) ----------
function stats() {
  let subs = 0, total = 0;
  for (const d of Object.values(TREE)) {
    for (const s of Object.values(d.subs)) { subs++; total += s.questions.length; }
  }
  return { directions: Object.keys(TREE).length, subs, totalQuestions: total };
}

module.exports = {
  MIX_KEY, reload, getDirections, getSubs, getQuestions, getSubLabel,
  addQuestion, editQuestion, deleteQuestion, createSub, stats
};
