'use strict';

// JSON saqlash. Atomik yozuv: .tmp -> renameSync (yarim yozilgan fayl bo'lmasin).
// file = null bo'lsa — faqat xotirada (testlar uchun).

const fs = require('fs');
const path = require('path');

const DEFAULT_PRICES = Object.freeze({
  guide: 49000, // to'liq qo'llanma + shablonlar
  setup: 300000, // "o'zim sozlab beraman" — bir martalik
  monthly: 100000, // "o'zim sozlab beraman" — oyiga
});

function emptyData() {
  return {
    version: 1,
    seq: 0,
    prices: { ...DEFAULT_PRICES },
    users: {},
    payments: {},
    applications: [],
  };
}

class Store {
  constructor(file) {
    this.file = file;
    this.data = emptyData();
    if (file) this._load();
  }

  _load() {
    if (!fs.existsSync(this.file)) return;
    const raw = fs.readFileSync(this.file, 'utf8');
    try {
      const parsed = JSON.parse(raw);
      this.data = { ...emptyData(), ...parsed, prices: { ...DEFAULT_PRICES, ...parsed.prices } };
    } catch (err) {
      // Buzilgan faylni ustidan yozib yubormaymiz: yonida saqlab, to'xtaymiz.
      const backup = `${this.file}.corrupt-${Date.now()}`;
      fs.renameSync(this.file, backup);
      throw new Error(`Baza fayli buzilgan (${err.message}). Nusxasi: ${backup}`);
    }
  }

  save() {
    if (!this.file) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }

  nextId() {
    this.data.seq += 1;
    return this.data.seq;
  }
}

module.exports = { Store, DEFAULT_PRICES };
