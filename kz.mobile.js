/* ==========================================================================
   Контент-завод — мобильный слой. Один файл на все страницы комплекта.

   Что делает:
     1) «Сендвич» в шапке: на узком экране прячет панель управления в кнопку.
        Разметку страниц не трогаем — кнопка и поведение собираются здесь,
        чтобы не дублировать один и тот же код пять раз.
     2) Широкие таблицы (протокол, правила, gap-анализ) получают собственную
        горизонтальную прокрутку и подсказку «прокрутите вбок», вместо того
        чтобы сжимать текст в нечитаемую кашу.
     3) Хелперы для страниц: определить мобильный режим, показать выбранное
        на телефоне (панель подробностей уезжает под схему), и подвести
        взгляд к нужному узлу.

   Подключается последним скриптом: <script src="kz.mobile.js"></script>
   ========================================================================== */
(function (root) {
  'use strict';

  var MOBILE_MAX = 900;
  var doc = root.document;
  if (!doc) return;

  function isMobile() {
    try {
      return typeof root.matchMedia === 'function'
        ? root.matchMedia('(max-width: ' + MOBILE_MAX + 'px)').matches
        : false;
    } catch (e) { return false; }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ── 1. «Сендвич» ────────────────────────────────────────────────────── */
  function buildBurger() {
    var header = doc.querySelector('header.app');
    if (!header) return;
    var bar = header.querySelector('.toolbar');
    if (!bar) return;
    if (header.querySelector('.nav-toggle')) return;

    if (!bar.id) bar.id = 'appToolbar';

    // Метка «скрипт дошёл»: только с ней панель прячется в кнопку.
    // Без скрипта меню остаётся на экране — просто столбиком.
    if (doc.documentElement && doc.documentElement.classList) {
      doc.documentElement.classList.add('js-nav');
    }

    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-toggle';
    btn.id = 'navToggle';
    btn.setAttribute('aria-controls', bar.id);
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Меню страницы');
    btn.innerHTML = '<span class="burger" aria-hidden="true"><i></i><i></i><i></i></span><span class="nav-label">Меню</span>';
    header.appendChild(btn);

    function setOpen(open) {
      bar.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      var label = btn.querySelector('.nav-label');
      if (label) label.textContent = open ? 'Скрыть' : 'Меню';
    }
    function isOpen() { return bar.classList.contains('open'); }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!isOpen());
    });

    // Клик по ссылке или по переключателю вида закрывает меню —
    // иначе оно закрывает собой то, что человек только что выбрал.
    bar.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('a') || t.closest('button[data-view]') || t.closest('button[data-level]')) {
        setOpen(false);
      }
    });

    doc.addEventListener('click', function (e) {
      if (!isOpen()) return;
      if (header.contains(e.target)) return;
      setOpen(false);
    });

    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) setOpen(false);
    });

    // Поворот телефона / растягивание окна: на широком экране меню всегда открыто
    root.addEventListener('resize', function () {
      if (!isMobile() && isOpen()) setOpen(false);
    });
    if (!isMobile()) setOpen(false);
  }

  /* ── 2. Легенда уезжает в «сендвич» ──────────────────────────────────
     На узком экране легенда занимает пол-экрана над содержанием. Прячем её
     в меню: там она и нужна — человек открывает меню и читает обозначения.
     На широком экране возвращаем на место, где она была в разметке. */
  var legendHome = null;

  function placeLegend(intoMenu) {
    var legend = doc.querySelector('.legend');
    if (!legend) return;
    if (intoMenu) {
      var bar = doc.getElementById ? doc.getElementById('appToolbar') : null;
      if (!bar) return;
      if (!legendHome) {
        legendHome = { parent: legend.parentNode, next: legend.nextSibling || null };
      }
      if (legend.parentNode !== bar) bar.appendChild(legend);
      return;
    }
    if (!legendHome || !legendHome.parent) return;
    if (legendHome.next && legendHome.next.parentNode === legendHome.parent) {
      legendHome.parent.insertBefore(legend, legendHome.next);
    } else {
      legendHome.parent.appendChild(legend);
    }
    legendHome = null;
  }

  /* ── 3. Таблицы → карточки ───────────────────────────────────────────────
     На узком экране таблица с восемью столбцами нечитаема: сжимать её нельзя,
     а прокручивать вбок неудобно. Поэтому подписываем каждую ячейку именем её
     столбца (data-th) — CSS превращает строку таблицы в карточку, а подпись
     берёт из атрибута. Разметку страниц при этом не трогаем: тот же <table>,
     чтобы на широком экране ничего не поменялось. */
  function adaptTables() {
    if (!doc.querySelectorAll) return;
    var tables = doc.querySelectorAll('table.tbl');
    for (var i = 0; i < tables.length; i++) {
      var t = tables[i];
      var heads = t.querySelectorAll('thead th');
      if (!heads || !heads.length) continue;   // узкая таблица без шапки остаётся таблицей
      var titles = [];
      for (var h = 0; h < heads.length; h++) {
        titles.push(String(heads[h].textContent || '').replace(/\s+/g, ' ').trim());
      }
      var rows = t.querySelectorAll('tbody tr');
      for (var r = 0; r < rows.length; r++) {
        var cells = rows[r].querySelectorAll('td');
        for (var c = 0; c < cells.length; c++) {
          var cell = cells[c];
          if (!cell || !cell.setAttribute) continue;
          if (cell.getAttribute && cell.getAttribute('data-th')) continue;   // уже подписана
          cell.setAttribute('data-th', titles[c] || '');
        }
      }
      if (t.classList && !t.classList.contains('tbl-cards')) t.classList.add('tbl-cards');
    }
  }

  /* ── 4. Хелперы для страниц ──────────────────────────────────────────── */
  function revealSide() {
    if (!isMobile()) return;
    var side = doc.querySelector('.side');
    if (!side || side.hidden) return;
    smoothTo(side, 'start');
  }

  function smoothTo(el, block) {
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: 'smooth', block: block || 'center', inline: 'nearest' });
    } catch (e) {
      try { el.scrollIntoView(); } catch (e2) {}
    }
  }

  /* Центрируем узел в окне: на телефоне дорожки идут в столбик, и без этого
     после каждого шага плеера взгляд остаётся на предыдущем узле. */
  function centerNode(id) {
    if (!doc.querySelector) return;
    var el = doc.querySelector('button.node[data-id="' + String(id).replace(/"/g, '') + '"]');
    if (el) smoothTo(el, 'center');
  }

  function onReady(fn) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  onReady(function () {
    buildBurger();
    placeLegend(isMobile());
    adaptTables();
    // Страницы перерисовывают содержимое сами (смена вида, роли, статуса) —
    // следим за этим и подписываем ячейки новых таблиц.
    if (root.MutationObserver && doc.querySelector('.main')) {
      var pending = false;
      var mo = new root.MutationObserver(function () {
        if (pending) return;
        pending = true;
        setTimeout(function () { pending = false; adaptTables(); }, 120);
      });
      mo.observe(doc.querySelector('.main'), { childList: true, subtree: true });
    }
  });

  // Поворот телефона и растягивание окна: легенда возвращается на место,
  // когда экран снова широкий.
  if (root.addEventListener) {
    var rTimer = null;
    root.addEventListener('resize', function () {
      if (rTimer) root.clearTimeout(rTimer);
      rTimer = root.setTimeout(function () {
        placeLegend(isMobile());
        adaptTables();
      }, 180);
    });
  }

  root.KZMobile = {
    isMobile: isMobile,
    revealSide: revealSide,
    centerNode: centerNode,
    scrollTo: smoothTo,
    adaptTables: adaptTables,
    placeLegend: placeLegend,
    esc: esc
  };
}(typeof window !== 'undefined' ? window : this));
