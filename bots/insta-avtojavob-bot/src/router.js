'use strict';

// callback_data ni tekshirib, aniq shaklga o'tkazadi. Tanilmagan qiymat -> null.
// Indekslar chegarasi chaqiruvchi tomonda tekshiriladi.

const { TEMPLATES } = require('./templates');
const { PRICE_KEYS } = require('./service');

const TEMPLATE_KEYS = TEMPLATES.map((t) => t.key);

function parseCallback(data) {
  const s = String(data || '');
  let m;
  if (s === 'noop') return { type: 'noop' };
  if ((m = s.match(/^m:(home)$/))) return { type: 'home' };
  if ((m = s.match(/^free:(\d{1,2})$/))) return { type: 'free', index: Number(m[1]) };
  if ((m = s.match(/^guide:(\d{1,2})$/))) return { type: 'guide', index: Number(m[1]) };
  if (s === 'tpl:list') return { type: 'tplList' };
  if ((m = s.match(/^tpl:([a-z]{2,20})$/)) && TEMPLATE_KEYS.includes(m[1])) return { type: 'tpl', key: m[1] };
  if (s === 'buy:info') return { type: 'buyInfo' };
  if (s === 'buy:start') return { type: 'buyStart' };
  if (s === 'setup:info') return { type: 'setupInfo' };
  if (s === 'setup:apply') return { type: 'setupApply' };
  if ((m = s.match(/^adm:(home|stats|pending|prices)$/))) return { type: 'admin', view: m[1] };
  if ((m = s.match(/^adm:price:([a-z]{2,10})$/)) && PRICE_KEYS.includes(m[1])) return { type: 'adminPrice', key: m[1] };
  if ((m = s.match(/^pay:(ok|no):(\d{1,9})$/))) return { type: 'pay', approve: m[1] === 'ok', id: Number(m[2]) };
  return null;
}

module.exports = { parseCallback };
