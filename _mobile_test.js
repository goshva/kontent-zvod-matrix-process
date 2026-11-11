/* ==========================================================================
   Контент-завод — матрица прав. Проверка МОБИЛЬНОГО СЛОЯ (kz.mobile.js).
   Запуск:  node _mobile_test.js

   Работает на самодельной DOM-заглушке: настоящего браузера здесь нет, зато
   проверяется именно то, за что отвечает мобильный слой — «сендвич», переезд
   легенды, подписи столбцов для карточек и договор о вёрстке в kz.css.
   ========================================================================== */
'use strict';
const fs = require('fs'), vm = require('vm');

/* ── Заглушка DOM ───────────────────────────────────────────────────────── */
function matches(el, sel) {
  if (!el || !el.classList) return false;
  let tag = null, cls = null;
  const dot = sel.indexOf('.');
  if (dot !== -1) { tag = sel.slice(0, dot) || null; cls = sel.slice(dot + 1); }
  else tag = sel;
  if (tag && el.tagName !== tag) return false;
  if (cls && !el.classList.contains(cls)) return false;
  return true;
}
function descendants(node) {
  let out = [];
  for (const c of node.children) { out.push(c); out = out.concat(descendants(c)); }
  return out;
}
/* Селектор понимает «tag», «.class», «tag.class» и потомков через пробел —
   этого хватает для «thead th», «tbody tr» и «table.tbl». */
function findAllIn(node, sel) {
  let level = [node];
  for (const part of sel.trim().split(/\s+/)) {
    let next = [];
    for (const n of level) next = next.concat(descendants(n).filter(c => matches(c, part)));
    level = next;
  }
  return level;
}

function El(tag, cls) {
  const set = new Set(cls ? cls.split(' ') : []);
  const el = {
    tagName: tag, children: [], parentNode: null, attrs: {}, _h: {}, textContent: '', innerHTML: '',
    classList: {
      add() { for (const c of arguments) set.add(c); },
      remove() { for (const c of arguments) set.delete(c); },
      toggle(c, f) { if (f === undefined) { set.has(c) ? set.delete(c) : set.add(c); } else { f ? set.add(c) : set.delete(c); } },
      contains(c) { return set.has(c); }
    },
    addEventListener(t, fn) { (this._h[t] = this._h[t] || []).push(fn); },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; },
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
    insertBefore(c, ref) {
      c.parentNode = this;
      const i = ref ? this.children.indexOf(ref) : -1;
      if (i < 0) this.children.push(c); else this.children.splice(i, 0, c);
      return c;
    },
    contains(n) { if (n === this) return true; return this.children.some(c => c.contains && c.contains(n)); },
    querySelector(sel) { const a = findAllIn(this, sel); return a.length ? a[0] : null; },
    querySelectorAll(sel) { return findAllIn(this, sel); }
  };
  Object.defineProperty(el, 'className', {
    get() { return Array.from(set).join(' '); },
    set(v) { set.clear(); String(v).split(/\s+/).filter(Boolean).forEach(c => set.add(c)); }
  });
  return el;
}

/* ── Разметка страницы, как её видит мобильный слой ─────────────────────── */
const doc = {};
const html = El('html'), body = El('body'), header = El('header', 'app'), bar = El('div', 'toolbar');
const main = El('div', 'main'), side = El('div', 'side'), legend = El('div', 'legend');

const table = El('table', 'tbl');
const thead = El('thead'), hrow = El('tr'), th1 = El('th'), th2 = El('th');
th1.textContent = '  ID  '; th2.textContent = 'Что останавливает';
hrow.appendChild(th1); hrow.appendChild(th2); thead.appendChild(hrow);
const tbody = El('tbody'), brow = El('tr'), td1 = El('td'), td2 = El('td');
td1.textContent = 'AP-1'; td2.textContent = 'Одобрение записи к выходу';
brow.appendChild(td1); brow.appendChild(td2); tbody.appendChild(brow);
table.appendChild(thead); table.appendChild(tbody);

header.appendChild(bar);
main.appendChild(table);
body.appendChild(header); body.appendChild(main); body.appendChild(side); body.appendChild(legend);

doc.documentElement = html; doc.body = body; doc.readyState = 'complete';
doc.querySelector = sel => ({ 'header.app': header, '.toolbar': bar, '.main': main, '.side': side, '.legend': legend }[sel] || null);
doc.querySelectorAll = sel => (sel === 'table.tbl' ? [table] : findAllIn(body, sel));
doc.getElementById = id => (id === 'appToolbar' && bar.id === 'appToolbar' ? bar : null);
doc.createElement = tag => El(tag);
doc._h = {};
doc.addEventListener = (t, fn) => { (doc._h[t] = doc._h[t] || []).push(fn); };
doc._fire = (t, ev) => { (doc._h[t] || []).forEach(fn => fn(ev)); };

const sandbox = { document: doc, console, setTimeout: f => f(), Date, JSON, Math, Object, Array, String };
sandbox.window = sandbox;
sandbox.matchMedia = () => ({ matches: true });   // проверяем мобильный режим
sandbox.addEventListener = () => {};

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(__dirname + '/kz.mobile.js', 'utf8'), sandbox, { filename: 'kz.mobile.js' });
const M = sandbox.KZMobile;

const ok = [], bad = [];
const t = (name, cond) => (cond ? ok : bad).push(name);

/* ── «Сендвич» ──────────────────────────────────────────────────────────── */
t('isMobile() = true на узком экране', M.isMobile() === true);
t('метка js-nav поставлена на <html>', html.classList.contains('js-nav'));

const burger = header.children.filter(c => c.classList && c.classList.contains('nav-toggle'))[0];
t('кнопка «сендвич» построена', !!burger);
t('панель управления получила id appToolbar', bar.attrs.id === 'appToolbar' || bar.id === 'appToolbar');
if (burger) {
  burger._h.click[0]({ stopPropagation() {} });
  t('клик открывает меню', bar.classList.contains('open') && burger.getAttribute('aria-expanded') === 'true');
  t('открытое меню помечено для чтения с экрана', burger.getAttribute('aria-expanded') === 'true');
  // Заглушка не разбирает innerHTML, поэтому проверяем саму разметку кнопки:
  // подпись «Меню»/«Скрыть» код меняет через .nav-label — это видно в браузере.
  t('разметка кнопки: бургер из трёх полос + подпись .nav-label',
    burger.innerHTML.indexOf('burger') !== -1 && burger.innerHTML.indexOf('nav-label') !== -1);
  bar._h.click[0]({ target: { closest: s => (s === 'a' ? {} : null) } });
  t('клик по ссылке закрывает меню', !bar.classList.contains('open'));
  burger._h.click[0]({ stopPropagation() {} });
  doc._fire('keydown', { key: 'Escape' });
  t('Escape закрывает меню', !bar.classList.contains('open'));
}

/* ── Легенда ────────────────────────────────────────────────────────────── */
t('легенда переехала в «сендвич»', legend.parentNode === bar);
M.placeLegend(false);
t('на широком экране легенда вернулась на место', legend.parentNode === body);
M.placeLegend(true);
t('и снова уезжает в меню при сужении', legend.parentNode === bar);

/* ── Таблицы → карточки ─────────────────────────────────────────────────── */
t('ячейкам проставлены подписи столбцов из шапки', td1.getAttribute('data-th') === 'ID' && td2.getAttribute('data-th') === 'Что останавливает');
t('таблица помечена как карточная (tbl-cards)', table.classList.contains('tbl-cards'));
M.adaptTables();
t('повторный проход не сбивает подписи (идемпотентность)',
  td1.getAttribute('data-th') === 'ID' && td2.getAttribute('data-th') === 'Что останавливает' && table.classList.contains('tbl-cards'));

/* ── Хелперы страниц ────────────────────────────────────────────────────── */
t('хелперы страниц на месте', typeof M.centerNode === 'function' && typeof M.revealSide === 'function');

/* ── Договор о вёрстке (по самому kz.css) ───────────────────────────────── */
const css = fs.readFileSync(__dirname + '/kz.css', 'utf8');
t('кнопки в меню переносятся по строкам (flex-wrap)', /\.toolbar\.open \.seg\{[^}]*flex-wrap:wrap/.test(css));
t('в меню нет горизонтальной прокрутки кнопок', !/\.toolbar\.open \.seg\{[^}]*overflow-x:auto/.test(css));
t('подписи кнопок переносятся, а не обрезаются', /\.toolbar\.open button,[\s\S]{0,120}white-space:normal/.test(css));
t('нижняя панель переносит кнопки по строкам', /\.mobile-dock\{[^}]*flex-wrap:wrap/.test(css));
t('нижняя панель скрыта на широком экране', /\.mobile-dock\{display:none;\}/.test(css));
t('во время воспроизведения ◀ и ▶ уходят с панели', /\.mobile-dock\.playing #btnPrevDock/.test(css) && /\.mobile-dock\.playing #btnNextDock/.test(css));
t('легенда внутри меню стилизована', /\.toolbar\.open \.legend\{/.test(css));
t('матрица на телефоне — карточками (шапка таблицы скрыта)', /table\.matrix thead\{display:none;\}/.test(css));
t('строка матрицы стала карточкой', /table\.matrix tr\[data-field\]\{[\s\S]{0,120}border-radius:10px/.test(css));
t('статус подписывается из data-status', /td\.matrix-cell::before\{[\s\S]{0,90}attr\(data-status\)/.test(css));
t('карточка поля подписана модулем', /tr\[data-field\]::before\{[\s\S]{0,90}attr\(data-module\)/.test(css));
t('правки C R U D в карточке идут строкой', /td\.matrix-cell\{[\s\S]{0,120}display:grid/.test(css));
t('таблицы .tbl на телефоне — карточками', /table\.tbl thead\{display:none;\}/.test(css) && /table\.tbl tbody tr\{[\s\S]{0,120}border-radius:10px/.test(css));
t('подпись значения в карточке берётся из data-th', /table\.tbl td::before\{[\s\S]{0,90}attr\(data-th\)/.test(css));
t('старой горизонтальной прокрутки таблиц больше нет', !/tbl-scroll/.test(css) && !/scroll-hint/.test(css));

console.log('проверок:', ok.length + bad.length, '· пройдено:', ok.length, '· провалено:', bad.length);
ok.forEach(n => console.log('  ✓', n));
bad.forEach(n => console.log('  ✗', n));
process.exit(bad.length ? 1 : 0);
