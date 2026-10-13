'use strict';

// Testlar bot dist/ ni sinaydi, u esa '@expense-tracker/shared' ni require
// qiladi. Paket main'i src/index.ts (dev'da ts-node uchun) — oddiy node uni
// o'qiy olmaydi. Docker'dagi kabi kompilyatsiya qilingan dist/ ga yo'naltiramiz.
const Module = require('node:module');
const path = require('node:path');

const SHARED_DIST = path.join(__dirname, '..', '..', '..', 'packages', 'shared', 'dist', 'index.js');
const original = Module._resolveFilename;
Module._resolveFilename = function resolve(request, ...rest) {
  if (request === '@expense-tracker/shared') return SHARED_DIST;
  return original.call(this, request, ...rest);
};
