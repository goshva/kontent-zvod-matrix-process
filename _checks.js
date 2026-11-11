/* ==========================================================================
   Контент-завод — матрица прав. ПРОВЕРКИ КОМПЛЕКТА.
   Запуск:  node _checks.js        (из папки access_matrix)
            node _checks.js C:/soft/python/kontent-zavod/access_matrix

   Что проверяет (без браузера, только файлы):
     1) синтаксис всех встроенных скриптов страниц и связку getElementById ↔ id;
     2) что каждая ссылка, скрипт и таблица стилей ведут в существующий файл;
     3) что каждая цитата «файл.py:строка» действительно существует и строка в файле есть;
     4) связность данных: ограничения ссылаются на существующие правила,
        переходы узлов и шаги сценариев — на существующие узлы;
     5) что все страницы вообще открываются как HTML и подключают общие файлы.

   Код возврата 0 — всё сошлось; 1 — есть замечания (они печатаются списком).
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DIR = path.resolve(process.argv[2] || __dirname);
const ROOT = 'C:/soft/python/kontent-zavod';     // корень завода — для цитат из кода

const problems = [];
const notes = [];
function fail(where, what) { problems.push(where + ' :: ' + what); }

/* ── 0. Что вообще есть в папке ─────────────────────────────────────────── */
const files = fs.readdirSync(DIR).filter(f => !fs.statSync(path.join(DIR, f)).isDirectory());
const pages = files.filter(f => f.endsWith('.html')).sort();
const scripts = files.filter(f => f.endsWith('.js')).sort();
notes.push('файлов: ' + files.length + ' (страниц: ' + pages.length + ', скриптов: ' + scripts.length + ')');

/* ── 1. Синтаксис встроенных скриптов и связка id ───────────────────────── */
pages.forEach(page => {
  const html = fs.readFileSync(path.join(DIR, page), 'utf8');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);

  inline.forEach((code, i) => {
    try { new vm.Script(code, { filename: page + '#inline' + i }); }
    catch (e) { fail(page, 'синтаксис встроенного скрипта №' + (i + 1) + ': ' + e.message); }
  });

  const refs = new Set([...html.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(m => m[1]));
  [...refs].forEach(r => { if (!ids.has(r)) fail(page, 'getElementById("' + r + '") — такого id на странице нет'); });

  if (!/<!DOCTYPE html>/i.test(html)) fail(page, 'нет <!DOCTYPE html>');
  if (!/<meta charset="UTF-8">/i.test(html)) fail(page, 'нет объявления кодировки UTF-8');
  if (!/kz\.css/.test(html)) fail(page, 'не подключён общий стиль kz.css');
  if (!/kz\.mobile\.js/.test(html)) fail(page, 'не подключён мобильный слой kz.mobile.js');
  notes.push(page.padEnd(20) + ' скриптов: ' + inline.length + ', id: ' + ids.size + ', ссылок на id: ' + refs.size);
});

/* ── 2. Ссылки, скрипты, стили ──────────────────────────────────────────── */
let linkCount = 0;
pages.forEach(page => {
  const html = fs.readFileSync(path.join(DIR, page), 'utf8');
  const targets = []
    .concat([...html.matchAll(/href="([^"#?]+)(?:[#?][^"]*)?"/g)].map(m => m[1]))
    .concat([...html.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)].map(m => m[1]))
    .concat([...html.matchAll(/<link[^>]*href="([^"]+)"/g)].map(m => m[1]));
  [...new Set(targets)].forEach(t => {
    if (/^(https?:|mailto:|data:)/.test(t)) return;
    linkCount++;
    if (!fs.existsSync(path.join(DIR, t))) fail(page, 'ссылка ведёт в никуда: ' + t);
  });
});
notes.push('ссылок проверено: ' + linkCount);

/* ── 3. Цитаты из кода завода ───────────────────────────────────────────── */
const index = {};
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['.git', '.venv', 'node_modules', '__pycache__', 'access_matrix'].indexOf(e.name) !== -1) continue;
      walk(p);
    } else {
      const rel = path.relative(ROOT, p).replace(/\\/g, '/');
      index[rel.toLowerCase()] = p;
      const base = path.basename(rel).toLowerCase();
      if (!index[base]) index[base] = p;
    }
  }
}(ROOT));

const citeRe = /([A-Za-zА-Яа-я0-9_./\\-]+\.(?:py|json|md|cmd|sh|txt|jsonl)):(\d+)(?:-(\d+))?/g;
let cites = 0;
const citeFiles = files.filter(f => /\.(html|js|css|md)$/.test(f));
citeFiles.forEach(f => {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const seen = new Set();
  let m;
  while ((m = citeRe.exec(src))) {
    const key = m[0];
    if (seen.has(key)) continue;
    seen.add(key);
    cites++;
    const rel = m[1].replace(/\\/g, '/').replace(/^\.\//, '');
    const full = index[rel.toLowerCase()] || index[path.basename(rel).toLowerCase()];
    if (!full) { fail(f, 'цитата на несуществующий файл: ' + key); continue; }
    const line = parseInt(m[3] || m[2], 10);
    const lines = fs.readFileSync(full, 'utf8').split('\n').length;
    if (lines < line) fail(f, 'цитата за пределами файла (' + lines + ' строк): ' + key);
  }
});
notes.push('цитат из кода проверено: ' + cites);

/* ── 4. Связность данных ────────────────────────────────────────────────── */
const sandbox = { window: {}, console };
sandbox.window = sandbox;
vm.createContext(sandbox);
try {
  vm.runInContext(fs.readFileSync(path.join(DIR, 'kz.data.js'), 'utf8'), sandbox, { filename: 'kz.data.js' });
  vm.runInContext(fs.readFileSync(path.join(DIR, 'kz.flow.js'), 'utf8'), sandbox, { filename: 'kz.flow.js' });
} catch (e) {
  fail('данные', 'файлы данных не загружаются: ' + e.message);
}
const KZ = sandbox.KZ, F = sandbox.KZFLOW;
if (KZ) {
  const used = new Set();
  Object.keys(KZ.grants).forEach(mod => Object.keys(KZ.grants[mod]).forEach(role =>
    (KZ.grants[mod][role].constraints || []).forEach(c => used.add(c))));
  [...used].forEach(c => { if (!KZ.rules[c]) fail('kz.data.js', 'ограничение ссылается на несуществующее правило: ' + c); });
  Object.keys(KZ.grants).forEach(mod => {
    if (!KZ.modules.some(m => m.id === mod)) fail('kz.data.js', 'права заданы для неизвестного модуля: ' + mod);
    Object.keys(KZ.grants[mod]).forEach(role => {
      if (!KZ.roles.some(r => r.id === role)) fail('kz.data.js', 'права заданы для неизвестной роли: ' + role);
    });
  });
  KZ.fieldOverrides.forEach(o => {
    if (!KZ.roles.some(r => r.id === o.role)) fail('kz.data.js', 'исключение по полю для неизвестной роли: ' + o.role);
    const known = KZ.modules.some(m => m.fields.some(f => f.id === o.field));
    if (!known) fail('kz.data.js', 'исключение по неизвестному полю: ' + o.field);
  });
  notes.push('ролей: ' + KZ.roles.length + ', модулей: ' + KZ.modules.length +
    ', правил: ' + Object.keys(KZ.rules).length + ', правил задействовано: ' + used.size +
    ', пунктов gap: ' + KZ.gaps.length);
}
if (F) {
  const ids = new Set(F.nodes.map(n => n.id));
  F.nodes.forEach(n => (n.next || []).forEach(x => {
    if (!ids.has(x.to)) fail('kz.flow.js', 'узел ' + n.id + ' ссылается на несуществующий ' + x.to);
  }));
  F.scenarios.forEach(s => s.steps.forEach(st => st.nodes.forEach(id => {
    if (!ids.has(id)) fail('kz.flow.js', 'сценарий ' + s.id + ' ссылается на несуществующий узел ' + id);
  })));
  F.nodes.forEach(n => {
    if (!F.lanes.some(l => l.id === n.lane)) fail('kz.flow.js', 'узел ' + n.id + ' в неизвестной дорожке ' + n.lane);
    if (!n.src) fail('kz.flow.js', 'у узла ' + n.id + ' нет источника');
  });
  F.approvals.forEach(a => {
    if (!a.src) fail('kz.flow.js', 'у точки апрува ' + a.id + ' нет источника');
  });
  notes.push('узлов: ' + F.nodes.length + ', сценариев: ' + F.scenarios.length +
    ', точек апрува: ' + F.approvals.length + ', связей протокола: ' + F.protocol.length);
}

/* ── 5. Итог ────────────────────────────────────────────────────────────── */
console.log('ПРОВЕРКИ КОМПЛЕКТА — ' + DIR);
notes.forEach(n => console.log('  · ' + n));
console.log('');
if (problems.length) {
  console.log('ЗАМЕЧАНИЙ: ' + problems.length);
  problems.forEach(p => console.log('  ✗ ' + p));
} else {
  console.log('Замечаний нет: синтаксис, ссылки, цитаты и связность данных сошлись.');
}
process.exit(problems.length ? 1 : 0);
