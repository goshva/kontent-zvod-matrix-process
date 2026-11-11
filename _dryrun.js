/* Прогон страниц комплекта на DOM-заглушке: проверяем, что скрипты выполняются
   без ошибок и что переключение видов, выбор узла, выбор ячейки и «сендвич»
   реально меняют разметку. Файлы проекта не изменяются. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = process.argv[2], file = process.argv[3], action = process.argv[4] || '', arg = process.argv[5] || '';

const els = new Map();
function makeEl(id) {
  const el = {
    id: id || '', _html: '', _h: {}, hidden: false, value: '', textContent: '', placeholder: '', type: '', accept: '', files: [],
    dataset: {}, style: {}, disabled: false, href: '', download: '', children: [], parentElement: null,
    classList: {
      _s: new Set(),
      add() { for (const c of arguments) this._s.add(c); },
      remove() { for (const c of arguments) this._s.delete(c); },
      toggle(c, f) { if (f === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } else { f ? this._s.add(c) : this._s.delete(c); } },
      contains(c) { return this._s.has(c); }
    },
    addEventListener(t, fn) { (this._h[t] = this._h[t] || []).push(fn); },
    removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    appendChild(c) { return c; }, removeChild() {}, click() {}, focus() {}, blur() {},
    scrollIntoView() {}
  };
  Object.defineProperty(el, 'innerHTML', { get() { return this._html; }, set(v) { this._html = String(v); } });
  return el;
}
function getEl(id) { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); }

const document = {
  getElementById: getEl, createElement: () => makeEl(''), querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, body: getEl('body'), documentElement: makeEl('html'), title: '', readyState: 'complete'
};
const storage = { _d: {}, getItem(k) { return this._d[k] === undefined ? null : this._d[k]; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } };
const sandbox = {
  document, console, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON, URLSearchParams, Promise,
  Object, Array, String, Number, Boolean, RegExp, Error, isNaN, parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
  localStorage: storage, location: { search: '', pathname: '/' + file, href: 'file:///' + file },
  history: { replaceState() {} }, navigator: { clipboard: { writeText: () => Promise.resolve() } },
  confirm: () => true, alert() {}, prompt: () => '', Blob: function () {}, FileReader: function () { this.readAsText = function () {}; },
  Intl, Set, Map
};
sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
sandbox.URL = { createObjectURL: () => 'blob:x', revokeObjectURL() {} };
sandbox.addEventListener = function () {};
// Мобильный режим включается переменной окружения KZ_MOBILE=1:
// так проверяется и путь, где «Фокус на шаге» включается сам.
sandbox.matchMedia = () => ({ matches: process.env.KZ_MOBILE === '1' });

const html = fs.readFileSync(path.join(dir, file), 'utf8');
const srcs = [...html.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)].map(m => m[1]);
const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const ctx = vm.createContext(sandbox);
try {
  srcs.forEach(s => vm.runInContext(fs.readFileSync(path.join(dir, s), 'utf8'), ctx, { filename: s }));
  inline.forEach((code, i) => vm.runInContext(code, ctx, { filename: file + '#inline' + i }));
} catch (e) { console.log('RUNTIME FAIL', e.message); process.exit(3); }

function fire(elId, type, mk) {
  const el = els.get(elId);
  if (!el || !el._h[type]) return 'нет обработчика ' + elId;
  el._h[type].forEach(fn => fn(mk()));
  return 'ok';
}
const dummy = () => ({ preventDefault() {}, target: { closest: () => null } });
let fired = '';
if (action === 'view') fired = fire('viewSeg', 'click', () => ({ preventDefault() {}, target: { closest: () => ({ dataset: { view: arg } }) } }));
if (action === 'node') fired = fire('lanes', 'click', () => ({ preventDefault() {}, target: { closest: () => ({ dataset: { id: arg } }) } }));
if (action === 'sel') fired = fire('matrixTable', 'click', () => ({ preventDefault() {}, target: { closest: () => ({ dataset: { field: arg, statusIdx: '2' } }) } }));
if (action === 'ctl') fired = fire(arg, 'click', dummy);

const out = {};
els.forEach((e, k) => { if (e._html) out[k] = e._html; });
const brief = {};
Object.keys(out).forEach(k => { brief[k] = out[k].length; });

// Диагностика отдельных элементов: классы, подпись, размер отрисованного.
const probe = {};
['playerDock', 'btnPlayDock', 'dockNote', 'btnPrevDock', 'btnNextDock', 'btnPlay', 'btnFocus', 'sideContent'].forEach(id => {
  const e = els.get(id);
  if (!e) return;
  probe[id] = {
    cls: Array.from(e.classList._s).join(' '),
    text: String(e.textContent || '').slice(0, 90),
    html: e._html ? e._html.length : 0
  };
});

console.log(JSON.stringify(brief), action ? ('[' + action + ' ' + arg + ' -> ' + fired + ']') : '');
console.log('PROBE ' + JSON.stringify(probe));
fs.writeFileSync(path.join(process.env.TEMP, 'kzdom3_' + file.replace(/\W/g, '_') + '_' + action + '_' + arg + '.json'), JSON.stringify(out));
