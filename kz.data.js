/* ==========================================================================
   Контент-завод — матрица прав CRUD. КАНОНИЧЕСКИЕ ДАННЫЕ.
   Файл: access_matrix/kz.data.js   Схема: kz-access-matrix/1
   Проект: C:/soft/python/kontent-zavod

   ПРАВИЛО ЭТОГО ФАЙЛА: ни одна строка прав не придумана. У каждой ячейки —
   источник: либо строка кода (файл:строка), либо решение владельца
   (ПРАВИЛА_ЗАВОДА.md / инструкция). Где источника нет — стоит
   basis:'assumption', и такие ячейки видно в интерфейсе отдельной точкой
   и отдельным списком «что уточнить у владельца».

   Подключается как обычный <script src="kz.data.js"> — работает и с file://,
   и с локального http-сервера.
   ========================================================================== */
(function (root) {
  'use strict';

  /* Ячейка прав. c/r/u/d — по одной букве на действие.
     Значения: allow | deny | conditional | <подмножество>*                                  */
  function g(c, r, u, d, constraints, src, note) {
    return {
      c: c, r: r, u: u, d: d,
      constraints: constraints || [],
      src: src || [],
      note: note || ''
    };
  }

  var KZ = {};

  KZ.schema = 'kz-access-matrix/1';
  KZ.project = 'kontent-zavod';
  KZ.version = '1.0.0-draft';
  KZ.updated = '2026-11-11';
  KZ.root = 'C:/soft/python/kontent-zavod';
  KZ.folder = 'access_matrix/';
  KZ.artifacts = [
    { id: 'index', file: 'index.html', title: 'Матрица прав CRUD', what: 'Роль × Статус × Поле × Модуль, четыре действия C/R/U/D, ограничения и gap-анализ' },
    { id: 'process', file: 'process.html', title: 'Плеер сценариев', what: 'Сквозные потоки завода по ролям: материалы → сборка → гейт → очередь → публикация' },
    { id: 'approve', file: 'approve.html', title: 'Протокол апрувов', what: 'Все точки человеческого решения и предохранители, вытащенные из кода' },
    { id: 'protocol-map', file: 'protocol-map.html', title: 'Карта протокола', what: 'Кто → кому → что апрувит, и что не апрувится вообще' },
    { id: 'questionnaire', file: 'questionnaire.html', title: 'Опросник владельца', what: 'Семь открытых вопросов §8 инструкции; на выходе — JSON для матрицы' }
  ];

  /* ── Аксиоматика ──────────────────────────────────────────────────────── */
  KZ.axioms = [
    { id: 'AX-1', text: 'Время само по себе не разрешает публикацию. Подошёл срок, а человеческого «да» на эту запись не было — она не выходит.', src: 'publish_queue.py:136-145 is_approved(); publish_queue.py:673-679 cmd_run()' },
    { id: 'AX-2', text: 'Слово «approved» в статусе без отметки approved_at недействительно: это ровно тот случай, когда запись выходила в ленту без спроса.', src: 'publish_queue.py:116-120' },
    { id: 'AX-3', text: 'Каждая дочерняя команда публикации обязана нести флаг --send. Нет флага — cmd_run() отказывает и пишет отказ в журнал.', src: 'publish_queue.py:108, publish_queue.py:753' },
    { id: 'AX-4', text: 'Есть зона, которую не трогает ни один патч и, значит, не получает ни одна роль: _FORBIDDEN.', src: 'updater.py:123-130' },
    { id: 'AX-5', text: 'Агент исполняет, но не владеет правом. Финальная позиция, согласие и ответственность — за человеком.', src: 'owner-rule: ПРАВИЛА_ЗАВОДА.md:55-56; инструкция владельца §2, п.8' },
    { id: 'AX-6', text: 'Журнал — доказательство. Его читают отчёты, но не правят ни роли, ни агенты.', src: 'health_report.py:37-38 (append-only журнал согласия); health_report.py:92-93' },
    { id: 'AX-7', text: 'Наружу уходит ровно два вида материалов: то, на что владелец указал сам, и то, что он одобрил в очереди. Третьего пути нет. «Утверждён план на период» — не одобрение материала.', src: 'CLAUDE.md:820-827' },
    { id: 'AX-8', text: 'Машина обязана уметь отменить собственное разрешение: запись со словом «одобрено», но без решения человека, код возвращает в ожидание и пишет об этом в журнал.', src: 'publish_queue.py:722-739' },
    { id: 'AX-9', text: 'Деньги тратятся только на явное «да»: у платных операций по умолчанию считается смета и ничего не списывается.', src: 'bench_generate.py:1491-1492, 1410; fal_connect.py:278' }
  ];

  /* ── Словарь прав ─────────────────────────────────────────────────────── */
  KZ.rights = {
    allow: { title: 'Разрешено', cls: 'allow', short: 'allow' },
    deny: { title: 'Запрещено', cls: 'deny', short: 'deny' },
    conditional: { title: 'Только при ограничении', cls: 'conditional', short: 'cond' },
    published_only: { title: 'Только опубликованное', cls: 'subset', short: 'pub' },
    approved_only: { title: 'Только одобренное человеком', cls: 'subset', short: 'appr' },
    own_only: { title: 'Только своё / только черновик', cls: 'subset', short: 'own' },
    status_only: { title: 'Только смена статуса (done / failed / missed)', cls: 'subset', short: 'st' },
    append_only: { title: 'Только добавление записи', cls: 'subset', short: 'app' }
  };
  KZ.rightKeys = ['c', 'r', 'u', 'd'];
  KZ.rightNames = { c: 'Create — создать', r: 'Read — читать', u: 'Update — изменить', d: 'Delete — удалить / убрать' };

  /* ── Ось статусов: две разные оси, путать нельзя ──────────────────────── */
  KZ.levels = [
    {
      id: 'unit',
      title: 'Статус единицы контента',
      brief: 'Жизненный цикл карточки: тема → черновик → проверка → одобрено → в расписании → опубликовано.',
      statuses: [
        { id: 'idea', title: 'Идея' },
        { id: 'draft', title: 'Черновик' },
        { id: 'on_check', title: 'На проверке' },
        { id: 'approved', title: 'Одобрено редакцией' },
        { id: 'scheduled', title: 'В расписании' },
        { id: 'published', title: 'Опубликовано' },
        { id: 'archived', title: 'Архив' },
        { id: 'returned', title: 'На доработку' },
        { id: 'blocked', title: 'Заблокировано гейтом' }
      ]
    },
    {
      id: 'queue',
      title: 'Статус записи в очереди',
      brief: 'Статусы publish_queue.py, зафиксированы в STATUS_LABEL. Это не то же самое, что статус единицы контента.',
      statuses: [
        { id: 'pending', title: 'ЖДЁТ ВАШЕГО ОДОБРЕНИЯ' },
        { id: 'approved', title: 'Одобрено, выйдет по расписанию' },
        { id: 'done', title: 'Опубликовано' },
        { id: 'failed', title: 'Ошибка' },
        { id: 'missed', title: 'Компьютер был выключен — не вышло' },
        { id: 'expired', title: 'Одобрения не было, время вышло' }
      ]
    }
  ];

  /* ── Роли: люди и агенты ──────────────────────────────────────────────── */
  KZ.actorTypes = {
    human: { title: 'Человек', cls: 'human', note: 'Может владеть правом: одобрять, соглашаться, отвечать.' },
    agent: { title: 'ИИ-агент / движок', cls: 'agent', note: 'Исполняет. Право одобрения не получает никогда, даже если очень нужно.' }
  };

  KZ.roles = [
    { id: 'owner', type: 'human', title: 'Владелец', who: 'Антон Ахтямов', what: 'Всё, включая финальную позицию и апрув. Единственный, кто говорит «да» в очереди.', src: 'ПРАВИЛА_ЗАВОДА.md:3-4; publish_queue.py:605-610' },
    { id: 'editor', type: 'human', title: 'Главный редактор', what: 'Тема, факт, риск, финальный допуск редакции.', src: 'CONTENT_BIBLE_КНИГА_СМЫСЛОВ.md; checks.py:772 verify()' },
    { id: 'designer', type: 'human', title: 'Дизайнер / карусельщик', what: 'Сборка каруселей, шаблон, логотип.', src: 'modules/content_plan/carousel_bridge.py; brand_logo.py' },
    { id: 'smm', type: 'human', title: 'SMM / дистрибуция', what: 'Адаптация, подписи, выкладка по площадкам.', src: 'modules/content_plan/caption_bridge.py; autopost.py' },
    { id: 'video', type: 'human', title: 'Монтажёр Reels', what: 'Сборка роликов, субтитры, перебивки.', src: 'render_reels.py; engine_talk.py' },
    { id: 'analyst', type: 'human', title: 'Аналитик', what: 'Метрики, отчёты, follow-up.', src: 'modules/analytics/; daily_report.py; tg_report.py' },
    { id: 'admin', type: 'human', title: 'Администратор завода', what: 'НСИ (банк медиа, музыка), настройки, установка.', src: 'media_watch.py; import_photos.py; install/setup_config.py' },
    { id: 'guest', type: 'human', title: 'Гость / клиент', what: 'Только чтение опубликованного.', src: 'assumption: в коде отдельной роли нет — см. вопросы владельцу' },

    { id: 'agent_claude', type: 'agent', title: 'Claude Code (исполнитель)', what: 'Читает рабочую зону, делает черновики, зовёт гейты, готовит записи в очередь со статусом pending.', src: 'CLAUDE.md (инструкция агенту); publish_queue.py:561-566' },
    { id: 'agent_render', type: 'agent', title: 'Рендер-движки', what: 'render_reels, engine_*.py: читают банк, пишут out_*.', src: 'render_reels.py; engine_video.py; engine_talk.py' },
    { id: 'agent_publish', type: 'agent', title: 'Публикатор', what: 'Только отправляет одобренное и пишет журнал.', src: 'publish_queue.py:673-679; installer/schedule_publisher.py:12-18' },
    { id: 'agent_intake', type: 'agent', title: 'Приём медиа', what: 'intake.pull, media_watch --import: кладёт материалы в банк.', src: 'modules/intake/pull.py; media_watch.py:175-264' },
    { id: 'agent_analytics', type: 'agent', title: 'Аналитика', what: 'Читает журналы, строит отчёты.', src: 'modules/analytics/; daily_report.py' },
    { id: 'agent_backup', type: 'agent', title: 'Резервная копия', what: 'Читает белый список, пишет в приватный репозиторий.', src: 'github_backup.py:162-185, 744' },
    { id: 'agent_gate', type: 'agent', title: 'Гейты', what: 'Проверяет и блокирует. Разрешать не умеет — только pass/fail.', src: 'checks.py:281, 772, 1036; activation_gate.py:31-53' }
  ];

  KZ.roleGroups = [
    { id: 'humans', title: 'Люди', types: ['human'] },
    { id: 'agents', title: 'ИИ-агенты и движки', types: ['agent'] }
  ];

  /* ── Модули (сущности) и поля ─────────────────────────────────────────── */
  KZ.modules = [
    {
      id: 'media', title: 'Медиа: фото, видео, музыка', axis: ['unit'],
      files: ['media_watch.py', 'import_photos.py', 'music.py', 'talk_broll_index.py', 'idx.json', 'photos/', 'talking/', 'music/'],
      note: 'Create = приём из Диска; Delete в коде НЕ существует ни для одной роли. Это главный разрыв матрицы.',
      fields: [
        { id: 'bank_photo', title: 'Банк фото (photos/, idx.json)', kind: 'create/read', src: 'media_watch.py:175 import_photos(); import_photos.py' },
        { id: 'bank_video', title: 'Банк говорящих видео (talking/)', kind: 'create/read', src: 'media_watch.py:220 import_video()' },
        { id: 'bank_music', title: 'Банк музыки (music/)', kind: 'create/read', src: 'music.py; install/install_music.py' },
        { id: 'broll_index', title: 'Индекс перебивок (broll_index.json)', kind: 'create/update', src: 'talk_broll_index.py' },
        { id: 'media_seen', title: 'Журнал использования кадров (.state/media_seen.json)', kind: 'create/read', src: 'media_watch.py:75-91 load_state/save_state' },
        { id: 'source_copies', title: 'Исходники на Google Диске', kind: 'read', src: 'modules/intake/pull.py; CLAUDE.md: «никогда не просить клиента расшаривать ссылки»' }
      ]
    },
    {
      id: 'content_plan', title: 'Контент-план', axis: ['unit'],
      files: ['modules/content_plan/planner.py', 'modules/content_plan/model.py', 'modules/content_plan/gate.py', 'content_plan/content_plan.json', 'content_plan/brief.json'],
      note: 'Статус слота меняется только через model.set_status() — с проверкой допустимого перехода.',
      fields: [
        { id: 'plan_slots', title: 'Слоты плана', kind: 'create/read', src: 'modules/content_plan/model.py' },
        { id: 'slot_status', title: 'Статус слота', kind: 'update', src: 'modules/content_plan/model.py:139-150' },
        { id: 'slot_history', title: 'История слота', kind: 'append', src: 'modules/content_plan/model.py:134-136 add_history()' },
        { id: 'plan_approval', title: 'Одобрение плана (plan.approved / approved_by)', kind: 'update', src: 'modules/content_plan/model.py:153-166' },
        { id: 'plan_publish', title: 'Выпуск слота (gate.run → публикация)', kind: 'execute', src: 'modules/content_plan/gate.py:423-430; executor.py:173' },
        { id: 'veto_window', title: 'Вето и «на доработку»', kind: 'update', src: 'modules/content_plan/gate.py:46-86' },
        { id: 'topics_bank', title: 'Банк тем (topic_bank.default.json)', kind: 'create/read', src: 'modules/content_plan/topics.py' },
        { id: 'brief', title: 'Бриф (brief.json)', kind: 'create/update', src: 'content_plan/brief.json' }
      ]
    },
    {
      id: 'engines', title: 'Движки и стили', axis: ['unit'],
      files: ['engine_*.py (21 файл)', 'engine_video.py', 'engine_talk.py', 'styles/carousel_templates.json', 'styles/fmt_*.json'],
      note: 'Delete движка в коде нет. Новый движок = правка кода, а не операция роли.',
      fields: [
        { id: 'engine_code', title: 'Код движка (engine_*.py)', kind: 'create/update', src: 'engine_video.py; engine_talk.py' },
        { id: 'template_presets', title: 'Пресеты форматов (styles/fmt_*.json)', kind: 'create/update', src: 'styles/fmt_subs_plain.json; styles/fmt_subs1.json' },
        { id: 'brand_styles', title: 'Фирменные стили (styles/brand_*.json)', kind: 'create/update', src: 'styles/carousel_templates.json' },
        { id: 'subtitle_presets', title: 'Пресеты субтитров (styles/subtitle_*.json)', kind: 'create/update', src: 'styles/subtitle_*.json' }
      ]
    },
    {
      id: 'carousel', title: 'Карусель', axis: ['unit'],
      files: ['modules/content_plan/carousel_bridge.py', 'brand_logo.py', 'build_slideshow.py', 'out_c*/'],
      note: 'Delete карусели в коде нет — есть только новая сборка.',
      fields: [
        { id: 'carousel_slides', title: 'Слайды карусели (out_c*)', kind: 'create/read', src: 'modules/content_plan/carousel_bridge.py' },
        { id: 'carousel_caption', title: 'Подпись карусели', kind: 'create/update', src: 'modules/content_plan/caption_bridge.py' },
        { id: 'logo_mark', title: 'Фирменный знак на слайде', kind: 'update', src: 'brand_logo.py; ПРАВИЛА_ЗАВОДА.md:34-39; config/factory.config.json:12-14' },
        { id: 'carousel_rules', title: 'Правила сборки (5–8 слайдов, чередование, лицо)', kind: 'enforce', src: 'ПРАВИЛА_ЗАВОДА.md:13-25; checks.py:772 verify()' }
      ]
    },
    {
      id: 'reels', title: 'Reels', axis: ['unit'],
      files: ['render_reels.py', 'engine_video.py', 'engine_talk.py', 'talk_*.py', 'out_reels/'],
      note: 'Форматов в работе три (решение владельца 27.08.2026). Остальные раскладки движка сняты с раздачи.',
      fields: [
        { id: 'reel_assembly', title: 'Сборка ролика (out_reels/)', kind: 'create', src: 'render_reels.py; CLAUDE.md (три формата)' },
        { id: 'reels_template', title: 'Формат ролика (--template / reels_template)', kind: 'update', src: 'CLAUDE.md «ФОРМАТОВ РОВНО ТРИ»' },
        { id: 'subtitles', title: 'Субтитры и перебивки', kind: 'update', src: 'engine_talk.py; talk_broll.py' },
        { id: 'trial_flag', title: 'Пробный Reels (--trial auto/manual)', kind: 'update', src: 'publish_queue.py:64-70, 796-802; CLAUDE.md «ПРОБНЫЙ РИЛС»' }
      ]
    },
    {
      id: 'talk', title: 'Эфиры и длинные записи', axis: ['unit'],
      files: ['talk_longcut.py', 'talk_transcribe.py', 'talk_segment.py', 'out_talk/'],
      note: 'Отбор эпизодов из длинной записи делает агент в сессии: --scan → промпт → --from-answer.',
      fields: [
        { id: 'long_record', title: 'Длинная запись (эфир, вебинар)', kind: 'read', src: 'talk_longcut.py; НАРЕЗКА_ЭФИРОВ.md' },
        { id: 'transcript', title: 'Транскрипт', kind: 'create/read', src: 'talk_transcribe.py; talk_longcut.py --scan' },
        { id: 'cut_episodes', title: 'Нарезка эпизодов', kind: 'create', src: 'talk_longcut.py --from-answer; intake.push --to cuts' },
        { id: 'out_talk', title: 'Готовые разговорные сборки (out_talk/)', kind: 'create', src: 'engine_talk.py' }
      ]
    },
    {
      id: 'publish_queue', title: 'Очередь публикаций', axis: ['queue'],
      files: ['publish_queue.py', '.state/publish_queue.json'],
      note: 'Единственная сущность с полным CRUD. Именно здесь стоит предохранитель проекта.',
      fields: [
        { id: 'queue_item', title: 'Запись очереди (--add)', kind: 'create', src: 'publish_queue.py:532-575 cmd_add()' },
        { id: 'queue_status', title: 'Статус записи', kind: 'update', src: 'publish_queue.py:113-133' },
        { id: 'approved_at', title: 'Отметка одобрения (approved_at)', kind: 'update', src: 'publish_queue.py:116-120, 605-644' },
        { id: 'schedule_at', title: 'Время выхода (--at) и часовой пояс записи', kind: 'update', src: 'publish_queue.py:550-559' },
        { id: 'platforms', title: 'Площадки записи (--to)', kind: 'update', src: 'publish_queue.py:560' },
        { id: 'queue_remove', title: 'Удаление записи (--remove)', kind: 'delete', src: 'publish_queue.py:664-670 cmd_remove()' },
        { id: 'queue_run', title: 'Выпуск по расписанию (--run)', kind: 'execute', src: 'publish_queue.py:673-679; installer/schedule_publisher.py:12-18' }
      ]
    },
    {
      id: 'channels', title: 'Площадки и каналы', axis: ['unit', 'queue'],
      files: ['autopost.py', 'vkpost.py', 'vkcarousel.py', 'vk_wall_post.py', 'vk_auth.py', 'tg_send.py', 'smmbox_post.py', 'smmbox_connect.py', 'modules/story_publisher/', 'modules/publishing/'],
      note: 'Подключение площадки и публикация — разные права. Прямой вход в ВК запрещён (заблокировали живой аккаунт).',
      fields: [
        { id: 'channel_connect', title: 'Подключение площадки (ключи, вход)', kind: 'create', src: 'ПОДКЛЮЧЕНИЕ_UPLOAD_POST.md; ПОДКЛЮЧЕНИЕ_TELEGRAM.md; smmbox_connect.py' },
        { id: 'channel_keys', title: 'Ключи площадок (в .env)', kind: 'create/read', src: 'github_backup.py:190-200 (формы ключей); .env' },
        { id: 'post_send', title: 'Отправка поста (--send)', kind: 'execute', src: 'autopost.py:854; tg_send.py:100; vkpost.py:373; vkcarousel.py:377; vk_wall_post.py:76; smmbox_post.py:513' },
        { id: 'story_send', title: 'Отправка сторис (--send)', kind: 'execute', src: 'modules/story_publisher/cli.py:152' },
        { id: 'vk_direct_auth', title: 'Прямой вход в ВК', kind: 'deny', src: 'CLAUDE.md «ВКонтакте — только через SmmBox»: команда прямого входа завершается кодом 2' }
      ]
    },
    {
      id: 'bible', title: 'Смыслы и канон', axis: ['unit'],
      files: ['CONTENT_BIBLE_КНИГА_СМЫСЛОВ.md', 'bible_setup.py', 'anchor_bank.py', 'modules/script_writer/'],
      note: 'Create/Update есть, Delete в коде нет — канон не удаляют, его переписывают новой версией.',
      fields: [
        { id: 'bible_text', title: 'Книга смыслов', kind: 'create/update', src: 'bible_setup.py; CONTENT_BIBLE_КНИГА_СМЫСЛОВ.md' },
        { id: 'anchor_bank', title: 'Банк якорей', kind: 'create/update', src: 'anchor_bank.py' },
        { id: 'rubric_lines', title: 'Рубрики и линии', kind: 'create/update', src: 'modules/script_writer/rubric_lines.default.json' },
        { id: 'script_notes', title: 'Черновики сценариев', kind: 'create/update', src: 'modules/script_writer/writer.py' }
      ]
    },
    {
      id: 'journal', title: 'Журналы и отчёты', axis: ['unit', 'queue'],
      files: ['.state/published_ids.jsonl', '.state/vk_published.jsonl', 'config/update_log.jsonl', 'config/health_consent.jsonl', 'daily_report.py', 'tg_report.py', 'health_report.py'],
      note: 'Append-only. Update и Delete запрещены всем, кроме retention-политики владельца. Это доказательство, а не рабочий файл.',
      fields: [
        { id: 'published_ids', title: 'Журнал публикаций (.state/*.jsonl)', kind: 'append/read', src: 'publish_queue.py; health_report.py:37-38' },
        { id: 'update_log', title: 'Журнал обновлений (config/update_log.jsonl)', kind: 'append/read', src: 'updater.py' },
        { id: 'reports', title: 'Отчёты (--send в телеграм)', kind: 'execute', src: 'daily_report.py:492; tg_report.py:39' },
        { id: 'health_log', title: 'Журнал согласия на диагностику', kind: 'append/read', src: 'health_report.py:92-93 CONSENT_LOG' }
      ]
    },
    {
      id: 'secrets', title: 'Секреты и лицензия', axis: ['unit', 'queue'],
      files: ['.env', 'license.key', 'health_channel.json', 'config/activation.json'],
      note: 'C/R/U — только владелец. Delete — никогда и никому. Агентам закрыто даже чтение.',
      fields: [
        { id: 'env_keys', title: 'Ключи и токены (.env)', kind: 'create/read/update', src: 'github_backup.py:190-210; updater.py:123-130' },
        { id: 'license_key', title: 'Лицензия (license.key)', kind: 'read', src: 'installer/activation.py; github_backup.py:162-163 _DENY_NAMES' },
        { id: 'health_channel', title: 'Канал сводки о здоровье (health_channel.json)', kind: 'read', src: 'github_backup.py:155-163' },
        { id: 'activation_state', title: 'Состояние активации (config/activation.json)', kind: 'read', src: 'activation_gate.py:31-53; config/activation.json' }
      ]
    },
    {
      id: 'agent_artifacts', title: 'Агентские артефакты', axis: ['unit', 'queue'],
      files: ['config/health_consent.jsonl', '.state/media_seen.json', '.vk_pkce.json', '.cache_*', '.cache_models/'],
      note: 'Create/Read агент может, Update — только владелец, Delete — по retention. Это следы работы, а не контент.',
      fields: [
        { id: 'consent_log', title: 'Журнал согласия (health_consent.jsonl)', kind: 'append/read', src: 'health_report.py:92-93, 277-303' },
        { id: 'media_seen', title: 'Отметки использования кадров', kind: 'create/read', src: 'media_watch.py:75-91' },
        { id: 'vk_pkce', title: 'Одноразовый ключ входа ВК (.vk_pkce.json)', kind: 'create/delete', src: 'vk_auth.py (--finish)' },
        { id: 'caches', title: 'Кеши моделей и предпросмотров', kind: 'create/delete', src: '.cache_models/; music_preview/' }
      ]
    },
    {
      id: 'factory_config', title: 'Настройки владельца и правила завода', axis: ['unit', 'queue'],
      files: ['config/factory.config.json', 'config/answers.memory.json', 'ПРАВИЛА_ЗАВОДА.md'],
      note: 'Единственная зона, где «как хочет владелец» записано словами и читается кодом. Патч её не трогает.',
      fields: [
        { id: 'owner_settings', title: 'Настройки завода (factory.config.json)', kind: 'update', src: 'config/factory.config.json:1-15; updater.py:123-130 (config/ в _FORBIDDEN)' },
        { id: 'answers_memory', title: 'Память ответов (answers.memory.json)', kind: 'create/update', src: 'config/answers.memory.json' },
        { id: 'factory_rules', title: 'Правила завода (ПРАВИЛА_ЗАВОДА.md)', kind: 'create/update', src: 'ПРАВИЛА_ЗАВОДА.md:1-8, 67-68' }
      ]
    }
  ];

  /* ── ПРАВА: базовая матрица роль × модуль ─────────────────────────────────
     Нет строки — значит запрещено по умолчанию (deny). Это осознанная поза:
     матрица не выдаёт право молча, а требует явной строки.
     ──────────────────────────────────────────────────────────────────────── */
  var F = ['updater.py:123-130 _FORBIDDEN: .venv/, config/, .env, license.key, .state/, .git/, photos/, video/, talking/, music/, stock/, primer/, music_cache/, music_preview/, out_, .cache_models/, installer/vendor/'];

  KZ.grants = {

    media: {
      owner: g('allow', 'allow', 'allow', 'deny', ['R-MED-2'],
        ['updater.py:123-130 (photos/, talking/, music/ в _FORBIDDEN)', 'ПРАВИЛА_ЗАВОДА.md:45-46'],
        'Владелец распоряжается материалами, но удаление исходников кодом не предусмотрено — только архив.'),
      admin: g('allow', 'allow', 'allow', 'conditional', ['R-MED-2'],
        ['media_watch.py:175-264 (import_photos/import_video/mark_imported)', 'media_watch.py:142 seed()'],
        'Роль администратора завода: приём и переиндексация. Удаление — только политикой хранения.'),
      designer: g('deny', 'allow', 'deny', 'deny', [], ['media_watch.py:75-91 (состояние банка читается всеми сборками)']),
      editor: g('deny', 'allow', 'deny', 'deny', [], ['assumption']),
      smm: g('deny', 'allow', 'deny', 'deny', [], ['assumption']),
      video: g('allow', 'allow', 'allow', 'deny', ['R-MED-3'],
        ['media_watch.py:153-174 _copy_with_retry()', 'ПРАВИЛА_ЗАВОДА.md:45-46'],
        'Монтаж приносит свои исходники в talking/; удалять чужие не может.'),
      analyst: g('deny', 'allow', 'deny', 'deny', [], ['modules/analytics/published.py (читает журналы)']),
      guest: g('deny', 'published_only', 'deny', 'deny', [], ['assumption: роль в коде отсутствует']),
      agent_intake: g('allow', 'allow', 'conditional', 'deny', ['R-MED-1'],
        ['media_watch.py:175-264', 'CLAUDE.md (intake.pull — повторный вызов безопасен)'],
        'Пишет только новым номером; перезапись индекса задним числом запрещена.'),
      agent_render: g('deny', 'allow', 'deny', 'deny', [], ['render_reels.py (читает банк)', 'updater.py:123-130']),
      agent_claude: g('conditional', 'allow', 'conditional', 'deny', ['R-MED-1', 'R-MED-3'],
        ['media_watch.py:142 seed()', 'ПРАВИЛА_ЗАВОДА.md:45-46'],
        'Может готовить импорт и править индекс новыми записями. Не удаляет и не переписывает историю кадров.'),
      agent_backup: g('deny', 'allow', 'deny', 'deny', ['R-BKP-1', 'R-BKP-2'],
        ['github_backup.py:173-177 _DENY_PREFIXES (photos/, talking/, music/)'],
        'Медиа в резервную копию не уезжает вовсе.'),
      agent_analytics: g('deny', 'allow', 'deny', 'deny', [], ['modules/analytics/published.py']),
      agent_publish: g('deny', 'conditional', 'deny', 'deny', ['R-Q-3'],
        ['publish_queue.py:673-679 cmd_run()'], 'Читает только то, что нужно для отправки одобренной записи.'),
      agent_gate: g('deny', 'allow', 'deny', 'deny', [], ['checks.py:772 verify()'])
    },

    content_plan: {
      owner: g('allow', 'allow', 'allow', 'allow', [], ['modules/content_plan/model.py:157-166 approve()/revoke_approval()']),
      editor: g('allow', 'allow', 'allow', 'conditional', ['R-CP-1'],
        ['modules/content_plan/model.py:139-150 set_status()'],
        'Правки — только легальным переходом статуса; история слота append-only.'),
      designer: g('deny', 'allow', 'conditional', 'deny', ['R-CP-6'],
        ['modules/content_plan/model.py:134-136 add_history()'],
        'Может менять только статус сборки своего слота, не тему и не дату.'),
      smm: g('deny', 'allow', 'conditional', 'deny', ['R-CP-6'], ['modules/content_plan/caption_bridge.py']),
      video: g('deny', 'allow', 'conditional', 'deny', ['R-CP-6'], ['modules/content_plan/reels_bridge.py']),
      analyst: g('deny', 'allow', 'deny', 'deny', [], ['modules/content_plan/model.py:171-176 counts()']),
      admin: g('allow', 'allow', 'conditional', 'conditional', ['R-CP-1', 'R-CP-5'],
        ['modules/content_plan/model.py:139-150'],
        'Администратор правит план, но не одобряет его за владельца.'),
      guest: g('deny', 'published_only', 'deny', 'deny', [], ['assumption']),
      agent_claude: g('allow', 'allow', 'conditional', 'deny', ['R-CP-1', 'R-CP-4', 'R-CP-6'],
        ['modules/content_plan/model.py:139-150 set_status()', 'modules/content_plan/gate.py:423-430'],
        'Готовит черновики и слоты. Статус approved не ставит — это делает gate или человек.'),
      agent_render: g('conditional', 'allow', 'conditional', 'deny', ['R-CP-1'],
        ['modules/content_plan/executor.py:173 is_approved(plan)'],
        'Движок берёт слот в сборку и отмечает результат, но не трогает чужие слоты.'),
      agent_analytics: g('deny', 'allow', 'deny', 'deny', [], ['modules/content_plan/model.py counts()']),
      agent_publish: g('deny', 'approved_only', 'conditional', 'deny', ['R-CP-2', 'R-CP-3', 'R-CP-7', 'R-CP-8'],
        ['modules/content_plan/gate.py:411-437 (пять замков)', 'modules/content_plan/gate.py:26-30 (REAL_PUBLISH_IMPLEMENTED = False)'],
        'Выпускает только слоты одобренного плана; без is_approved(plan) — отказ. Реальной отправки из плана нет вовсе: жёсткий стоп прототипа.'),
      agent_gate: g('deny', 'allow', 'deny', 'deny', [], ['modules/content_plan/gate.py:361 material_ready()'])
    },

    engines: {
      owner: g('allow', 'allow', 'allow', 'deny', [], ['updater.py:151-153 _ALLOWED_SUFFIX (.py, .json)']),
      designer: g('conditional', 'allow', 'conditional', 'deny', ['R-ENG-1'],
        ['styles/carousel_templates.json'],
        'Пресеты и шаблоны — да; код движка — только через владельца и патч.'),
      video: g('conditional', 'allow', 'conditional', 'deny', ['R-ENG-1'], ['styles/fmt_subs1.json; styles/fmt_subs2.json']),
      editor: g('deny', 'allow', 'deny', 'deny', [], ['assumption']),
      admin: g('conditional', 'allow', 'conditional', 'deny', ['R-ENG-1'], ['updater.py:535 (проверка _FORBIDDEN перед патчем)']),
      guest: g('deny', 'deny', 'deny', 'deny', [], ['assumption']),
      agent_claude: g('conditional', 'allow', 'conditional', 'deny', ['R-ENG-1'],
        ['updater.py:151-153 _ALLOWED_SUFFIX', 'updater.py:535'],
        'Новый пресет — да. Правка кода движка — отдельным патчем, не в рабочей сессии над контентом.'),
      agent_render: g('deny', 'allow', 'deny', 'deny', [], ['engine_video.py; engine_talk.py (читают пресеты)']),
      agent_gate: g('deny', 'allow', 'deny', 'deny', [], ['checks.py:772 verify()'])
    },

    carousel: {
      owner: g('allow', 'allow', 'allow', 'deny', ['R-MED-2'], ['updater.py:123-130 (out_ в _FORBIDDEN)']),
      designer: g('allow', 'allow', 'allow', 'deny', ['R-CAR-1', 'R-CAR-2'],
        ['ПРАВИЛА_ЗАВОДА.md:13-39', 'brand_logo.py'],
        'Держит правила сборки: 5–8 слайдов, чередование, лицо не обрезано, логотип на каждом слайде.'),
      editor: g('deny', 'allow', 'conditional', 'deny', ['R-CAR-1'], ['checks.py:772 verify()'], 'Проверка перед выдачей, правка текста слоя — да.'),
      smm: g('deny', 'allow', 'deny', 'deny', [], ['modules/content_plan/caption_bridge.py']),
      video: g('deny', 'allow', 'deny', 'deny', [], ['assumption']),
      admin: g('allow', 'allow', 'allow', 'conditional', ['R-MED-2'], ['ПРАВИЛА_ЗАВОДА.md:31-39']),
      guest: g('deny', 'published_only', 'deny', 'deny', [], ['assumption']),
      agent_claude: g('conditional', 'allow', 'conditional', 'deny', ['R-CAR-1', 'R-WORK-1'],
        ['ПРАВИЛА_ЗАВОДА.md:55-56', 'checks.py:772 verify()'],
        'Собирает по прямой команде владельца. Сам сборку не запускает.'),
      agent_render: g('allow', 'allow', 'allow', 'deny', ['R-CAR-1', 'R-CAR-3'],
        ['modules/content_plan/carousel_bridge.py', 'checks.py:772'],
        'Пишет out_c*; исходники и журнал кадров не трогает. Правило «5–8 слайдов» задано движком, а не проверкой: код его не отбраковывает.'),
      agent_gate: g('deny', 'allow', 'conditional', 'deny', ['R-GATE-1'],
        ['checks.py:772 verify(); checks.py:281 CheckError'],
        'Пишет замечания гейта. Разрешать не умеет — только pass/fail.'),
      agent_backup: g('deny', 'deny', 'deny', 'deny', ['R-BKP-1'], ['github_backup.py:173-177 (out_ в _DENY_PREFIXES)'])
    },

    reels: {
      owner: g('allow', 'allow', 'allow', 'deny', ['R-MED-2'], ['updater.py:123-130']),
      video: g('allow', 'allow', 'allow', 'deny', ['R-REEL-1'],
        ['CLAUDE.md «ФОРМАТОВ РОВНО ТРИ»', 'render_reels.py'],
        'Форматов три; названный клиентом иной формат не собирается — сначала переспросить.'),
      editor: g('deny', 'allow', 'conditional', 'deny', ['R-REEL-1'], ['checks.py:1036 verify_talk()']),
      smm: g('deny', 'allow', 'deny', 'deny', [], ['modules/content_plan/reels_bridge.py']),
      designer: g('deny', 'allow', 'deny', 'deny', [], ['assumption']),
      admin: g('allow', 'allow', 'allow', 'conditional', ['R-MED-2'], ['render_reels.py']),
      guest: g('deny', 'published_only', 'deny', 'deny', [], ['assumption']),
      agent_claude: g('conditional', 'allow', 'conditional', 'deny', ['R-REEL-1', 'R-WORK-1'],
        ['CLAUDE.md «ФОРМАТОВ РОВНО ТРИ»', 'ПРАВИЛА_ЗАВОДА.md:55-56']),
      agent_render: g('allow', 'allow', 'allow', 'deny', ['R-REEL-1', 'R-REEL-3'],
        ['render_reels.py', 'CLAUDE.md «ffmpeg у завода свой»'],
        'Локальный рендер на файлах диска. Внешние сервисы сборки запрещены.'),
      agent_gate: g('deny', 'allow', 'conditional', 'deny', ['R-GATE-1'], ['checks.py:675 verify_reel()']),
      agent_backup: g('deny', 'deny', 'deny', 'deny', ['R-BKP-1'], ['github_backup.py:173-177'])
    },

    talk: {
      owner: g('allow', 'allow', 'allow', 'deny', ['R-MED-2'], ['updater.py:123-130 (talking/, out_ в _FORBIDDEN)']),
      video: g('allow', 'allow', 'allow', 'deny', ['R-MED-2'], ['talk_longcut.py; talk_transcribe.py']),
      editor: g('deny', 'allow', 'conditional', 'deny', [], ['talk_text_clean.py']),
      admin: g('allow', 'allow', 'allow', 'conditional', ['R-MED-2'], ['media_watch.py:220 import_video()']),
      guest: g('deny', 'deny', 'deny', 'deny', [], ['assumption']),
      agent_claude: g('allow', 'allow', 'conditional', 'deny', ['R-TALK-1'],
        ['talk_longcut.py (--scan → промпт → --from-answer)', 'CLAUDE.md «Длинное видео → нарезка»'],
        'Отбор эпизодов — работа агента в сессии: слушает, читает транскрипт, возвращает JSON.'),
      agent_render: g('conditional', 'allow', 'conditional', 'deny', ['R-TALK-1'], ['engine_talk.py; talk_segment.py']),
      agent_analytics: g('deny', 'allow', 'deny', 'deny', [], ['talk_analyze.py'])
    },

    publish_queue: {
      owner: g('allow', 'allow', 'allow', 'allow', ['R-Q-2', 'R-Q-4', 'R-Q-10'],
        ['publish_queue.py:605-644 cmd_approve()', 'publish_queue.py:664-670 cmd_remove()', 'publish_queue.py:722-739 (снятие самозваного одобрения)'],
        'Единственная роль с правом «одобрить» и «убрать запись». У --remove подтверждения нет: убирает молча — это пробел, а не защита.'),
      smm: g('allow', 'allow', 'deny', 'conditional', ['R-Q-1', 'R-Q-6'],
        ['publish_queue.py:532-575 cmd_add()', 'publish_queue.py:561-566 «ВСЕГДА pending»'],
        'Готовит записи. Одобрять не может — это делает человек.'),
      editor: g('conditional', 'allow', 'deny', 'deny', ['R-Q-1'], ['publish_queue.py:532-575 cmd_add()']),
      designer: g('conditional', 'allow', 'deny', 'deny', ['R-Q-1'], ['publish_queue.py:532-575']),
      video: g('conditional', 'allow', 'deny', 'deny', ['R-Q-1'], ['publish_queue.py:544 (kind = reel по .mp4/.mov)']),
      analyst: g('deny', 'allow', 'deny', 'deny', [], ['publish_queue.py:578-602 cmd_list()']),
      admin: g('conditional', 'allow', 'deny', 'conditional', ['R-Q-1', 'R-Q-6'],
        ['publish_queue.py:532-575', 'publish_queue.py:647-661 cmd_unapprove()']),
      guest: g('deny', 'deny', 'deny', 'deny', [], ['assumption']),
      agent_claude: g('allow', 'allow', 'deny', 'deny', ['R-Q-1', 'R-Q-5', 'R-AGT-1'],
        ['publish_queue.py:532-575 cmd_add()', 'publish_queue.py:605-610 «Единственное место…»'],
        'Кладёт запись со статусом pending. Слово approved не ставит ни при каких условиях.'),
      agent_publish: g('deny', 'approved_only', 'status_only', 'deny', ['R-Q-3', 'R-Q-4', 'R-Q-7'],
        ['publish_queue.py:673-679 cmd_run()', 'publish_queue.py:753 SEND_GUARD', 'publish_queue.py:136-145 is_approved()'],
        'Только одобренные записи; пишет done/failed/missed и журнал. Ни создать, ни одобрить не может.'),
      agent_intake: g('conditional', 'allow', 'deny', 'deny', ['R-Q-1'], ['publish_queue.py:532-575']),
      agent_analytics: g('deny', 'allow', 'deny', 'deny', [], ['publish_queue.py:578-602']),
      agent_backup: g('deny', 'deny', 'deny', 'deny', ['R-BKP-1'], ['github_backup.py:167-171 (.state в _DENY_SEGMENTS)']),
      agent_gate: g('deny', 'allow', 'conditional', 'deny', ['R-GATE-2'],
        ['publish_queue.py:136-145 is_approved()'],
        'Гейт может сказать «не одобрено». Одобрить — не может.'),
      agent_render: g('conditional', 'allow', 'deny', 'deny', ['R-Q-1'], ['publish_queue.py:532-575'])
    },

    channels: {
      owner: g('allow', 'allow', 'allow', 'conditional', ['R-CH-1'],
        ['ПОДКЛЮЧЕНИЕ_UPLOAD_POST.md; ПОДКЛЮЧЕНИЕ_TELEGRAM.md', 'ПРАВИЛА_ЗАВОДА.md:58-59'],
        'Новая площадка — решение владельца. Автопост идёт в телеграм-канал, сервис разносит дальше.'),
      smm: g('conditional', 'allow', 'conditional', 'deny', ['R-CH-2', 'R-Q-4'],
        ['autopost.py:854 --send', 'modules/story_publisher/cli.py:152 --send'],
        'Отправка — только с --send и только по прямой просьбе владельца.'),
      admin: g('conditional', 'allow', 'conditional', 'deny', ['R-CH-2'],
        ['smmbox_connect.py', 'modules/publishing/config_reader.py'],
        'Подключение площадок — через штатного мастера, ключи — в .env.'),
      editor: g('deny', 'allow', 'deny', 'deny', [], ['assumption']),
      designer: g('deny', 'allow', 'deny', 'deny', [], ['assumption']),
      video: g('conditional', 'allow', 'deny', 'deny', ['R-Q-4'], ['modules/story_publisher/cli.py:152']),
      analyst: g('deny', 'allow', 'deny', 'deny', [], ['modules/analytics/upload_post.py']),
      guest: g('deny', 'deny', 'deny', 'deny', [], ['assumption']),
      agent_claude: g('conditional', 'allow', 'conditional', 'deny', ['R-CH-2', 'R-CH-3', 'R-WORK-1'],
        ['autopost.py:854 --send', 'CLAUDE.md «ВКонтакте — только через SmmBox»'],
        'Готовит команду. Отправляет человек или планировщик по одобренной записи. Прямой вход в ВК — запрещён.'),
      agent_publish: g('conditional', 'approved_only', 'conditional', 'deny', ['R-Q-3', 'R-Q-4', 'R-Q-8', 'R-STORY-1', 'R-STORY-2'],
        ['publish_queue.py:476-527 (сборка команд с SEND_GUARD)', 'autopost.py:854', 'modules/story_publisher/publisher.py:92-121'],
        'Отправляет только то, что лежит в очереди одобренным, и всегда с --send. Ссылку в сторис Instagram поставить не может — кладёт памятку.'),
      agent_gate: g('deny', 'allow', 'deny', 'deny', [], ['activation_gate.py:31-53 allow()']),
      agent_backup: g('deny', 'conditional', 'deny', 'deny', ['R-BKP-1', 'R-SEC-2'], ['github_backup.py:190-200'])
    },

    bible: {
      owner: g('allow', 'allow', 'allow', 'conditional', ['R-MED-2'],
        ['bible_setup.py', 'ПРАВИЛА_ЗАВОДА.md:67-68'],
        'Канон переписывается новой версией; удаление — только осознанным решением владельца.'),
      editor: g('allow', 'allow', 'allow', 'deny', ['R-BIB-1'],
        ['modules/script_writer/bible.py', 'bible_setup.py'],
        'Ведёт смыслы. История версий не удаляется.'),
      designer: g('deny', 'allow', 'deny', 'deny', [], ['assumption']),
      smm: g('deny', 'allow', 'deny', 'deny', [], ['modules/script_writer/writer.py']),
      video: g('deny', 'allow', 'deny', 'deny', [], ['assumption']),
      analyst: g('deny', 'allow', 'deny', 'deny', [], ['modules/analytics/recommender.py']),
      admin: g('conditional', 'allow', 'conditional', 'deny', ['R-BIB-1'], ['bible_setup.py']),
      guest: g('deny', 'published_only', 'deny', 'deny', [], ['assumption']),
      agent_claude: g('allow', 'allow', 'conditional', 'deny', ['R-BIB-1', 'R-AGT-2'],
        ['modules/script_writer/bible.py', 'CLAUDE.md «Сначала смыслы, потом карусели»'],
        'Читает канон и пишет из него. Меняет смыслы — только по прямой просьбе владельца.'),
      agent_render: g('deny', 'allow', 'deny', 'deny', [], ['modules/script_writer/writer.py']),
      agent_analytics: g('deny', 'allow', 'deny', 'deny', [], ['modules/analytics/recommender.py']),
      agent_gate: g('deny', 'allow', 'deny', 'deny', [], ['checks.py:772 verify()'])
    },

    journal: {
      owner: g('allow', 'allow', 'deny', 'conditional', ['R-J-2'],
        ['health_report.py:37-38 (append-only журнал)', 'publish_queue.py:133 STATUS_CLOSED'],
        'Владелец задаёт политику хранения. Переписывать записи не может никто, включая его.'),
      admin: g('deny', 'allow', 'deny', 'conditional', ['R-J-2'], ['daily_report.py; health_report.py']),
      analyst: g('allow', 'allow', 'deny', 'deny', ['R-J-1'], ['modules/analytics/history.py']),
      editor: g('deny', 'allow', 'deny', 'deny', [], ['assumption']),
      smm: g('deny', 'allow', 'deny', 'deny', [], ['publish_queue.py:578-602 cmd_list()']),
      designer: g('deny', 'deny', 'deny', 'deny', [], ['assumption']),
      video: g('deny', 'deny', 'deny', 'deny', [], ['assumption']),
      guest: g('deny', 'deny', 'deny', 'deny', [], ['assumption']),
      agent_claude: g('append_only', 'allow', 'deny', 'deny', ['R-J-1'],
        ['health_report.py:37-38', 'publish_queue.py (журнал отправок)'],
        'Дописывает свои следы. Править и удалять записи не может.'),
      agent_analytics: g('deny', 'allow', 'deny', 'deny', ['R-J-1', 'R-AN-1'],
        ['modules/analytics/history.py', 'modules/analytics/published.py'],
        'Строит отчёты из журналов; в план и статусы публикаций не пишет.'),
      agent_publish: g('append_only', 'allow', 'deny', 'deny', ['R-J-1'], ['publish_queue.py cmd_run() (журнал отправок)']),
      agent_backup: g('deny', 'deny', 'deny', 'deny', ['R-BKP-1'], ['github_backup.py:167-171 (.state в _DENY_SEGMENTS)']),
      agent_gate: g('append_only', 'allow', 'deny', 'deny', ['R-GATE-1'], ['checks.py (замечания гейта)'])
    },

    secrets: {
      owner: g('allow', 'allow', 'allow', 'deny', ['R-SEC-1', 'R-SEC-3'],
        ['updater.py:123-130 (.env, license.key, config/ в _FORBIDDEN)', 'github_backup.py:155-163'],
        'Удалять нельзя никому, включая владельца: перевыпуск, а не удаление файла.'),
      admin: g('deny', 'deny', 'deny', 'deny', ['R-SEC-1'], ['updater.py:123-130'], 'Даже администратор завода сюда не ходит — он не владелец ключей.'),
      editor: g('deny', 'deny', 'deny', 'deny', [], ['assumption']),
      designer: g('deny', 'deny', 'deny', 'deny', [], ['assumption']),
      smm: g('deny', 'deny', 'deny', 'deny', [], ['assumption']),
      video: g('deny', 'deny', 'deny', 'deny', [], ['assumption']),
      analyst: g('deny', 'deny', 'deny', 'deny', [], ['assumption']),
      guest: g('deny', 'deny', 'deny', 'deny', [], ['assumption']),
      agent_claude: g('deny', 'deny', 'deny', 'deny', ['R-SEC-1'], ['updater.py:123-130', 'CLAUDE.md (в аккаунты не входим, пароли вводит человек)']),
      agent_render: g('deny', 'deny', 'deny', 'deny', ['R-SEC-1'], ['updater.py:123-130']),
      agent_publish: g('deny', 'conditional', 'deny', 'deny', ['R-SEC-2'],
        ['publish_queue.py:476-527 (ключи берутся дочерними скриптами, не очередью)'],
        'Читает ключ только через дочерний скрипт площадки; в файл не ходит.'),
      agent_intake: g('deny', 'deny', 'deny', 'deny', ['R-SEC-1'], ['updater.py:123-130']),
      agent_analytics: g('deny', 'deny', 'deny', 'deny', ['R-SEC-1'], ['updater.py:123-130']),
      agent_backup: g('deny', 'conditional', 'deny', 'deny', ['R-SEC-2', 'R-BKP-3'],
        ['github_backup.py:190-210 (_HARD_SECRET_PATTERNS, _SOFT_SECRET_PATTERN)', 'github_backup.py:435 scan_secrets()'],
        'Ключи читает ровно для того, чтобы узнать их и НЕ отправить. Находка отменяет отправку.'),
      agent_gate: g('deny', 'deny', 'deny', 'deny', ['R-SEC-1'], ['updater.py:123-130'])
    },

    agent_artifacts: {
      owner: g('allow', 'allow', 'allow', 'conditional', ['R-ART-1'], ['health_report.py:92-93; .state/ в updater.py:123-130']),
      admin: g('deny', 'allow', 'deny', 'conditional', ['R-ART-1'], ['media_watch.py:75-91']),
      analyst: g('deny', 'allow', 'deny', 'deny', [], ['modules/analytics/cache.py']),
      editor: g('deny', 'deny', 'deny', 'deny', [], ['assumption']),
      designer: g('deny', 'deny', 'deny', 'deny', [], ['assumption']),
      smm: g('deny', 'deny', 'deny', 'deny', [], ['assumption']),
      video: g('deny', 'deny', 'deny', 'deny', [], ['assumption']),
      guest: g('deny', 'deny', 'deny', 'deny', [], ['assumption']),
      agent_claude: g('allow', 'allow', 'conditional', 'conditional', ['R-ART-1', 'R-ART-2'],
        ['vk_auth.py (--finish убирает .vk_pkce.json)', 'health_report.py:277-303 record_consent()'],
        'Создаёт свои следы, чистит одноразовые — по правилу, а не по желанию.'),
      agent_intake: g('allow', 'allow', 'conditional', 'deny', ['R-MED-1'], ['media_watch.py:75-91 load_state/save_state']),
      agent_analytics: g('allow', 'allow', 'conditional', 'conditional', ['R-ART-1'], ['modules/analytics/cache.py']),
      agent_backup: g('deny', 'deny', 'deny', 'deny', ['R-BKP-1'], ['github_backup.py:167-171']),
      agent_render: g('allow', 'allow', 'conditional', 'deny', ['R-ART-1'], ['.cache_models/, music_preview/']),
      agent_gate: g('append_only', 'allow', 'deny', 'deny', ['R-GATE-1'], ['checks.py'])
    },

    factory_config: {
      owner: g('allow', 'allow', 'allow', 'conditional', ['R-CFG-1'],
        ['config/factory.config.json:1-15', 'updater.py:123-130 (config/ в _FORBIDDEN)'],
        'Настройки завода меняет только владелец — словами. Обновление коробки config/ не перезаписывает.'),
      admin: g('deny', 'allow', 'conditional', 'deny', ['R-CFG-1'],
        ['install/setup_config.py', 'install/factory_config.py'],
        'Может выполнить первичную настройку при установке, но не переписывать решения владельца.'),
      editor: g('deny', 'allow', 'deny', 'deny', [], ['assumption']),
      designer: g('deny', 'conditional', 'deny', 'deny', [], ['config/factory.config.json:2 carousel_template']),
      smm: g('deny', 'conditional', 'deny', 'deny', [], ['config/factory.config.json:5 publish_timezone']),
      video: g('deny', 'conditional', 'deny', 'deny', [], ['assumption']),
      analyst: g('deny', 'conditional', 'deny', 'deny', [], ['config/factory.config.json:10-11 daily_report']),
      guest: g('deny', 'deny', 'deny', 'deny', [], ['assumption']),
      agent_claude: g('deny', 'allow', 'conditional', 'deny', ['R-CFG-1', 'R-CFG-2'],
        ['CLAUDE.md «ПРОБНЫЙ РИЛС: сначала предупреждение, потом включение»', 'config/factory.config.json'],
        'Пишет в настройку только после явного «да» владельца и только названный ключ.'),
      agent_render: g('deny', 'allow', 'deny', 'deny', [], ['install/factory_config.py']),
      agent_publish: g('deny', 'allow', 'deny', 'deny', [], ['config/factory.config.json:5 publish_timezone']),
      agent_backup: g('deny', 'conditional', 'deny', 'deny', ['R-BKP-1'], ['github_backup.py:183-185 _DENY_PATHS (config/github.json)'])
    }
  };

  /* ── Полевые исключения: там, где поле строже модуля ───────────────────── */
  KZ.fieldOverrides = [
    { role: 'agent_claude', field: 'approved_at', patch: { u: 'deny', c: 'deny' },
      src: ['publish_queue.py:116-120', 'publish_queue.py:605-610'],
      note: 'Отметку одобрения проставляет только cmd_approve() — то есть человек.' },
    { role: 'agent_publish', field: 'approved_at', patch: { r: 'approved_only', u: 'deny', c: 'deny', d: 'deny' },
      src: ['publish_queue.py:753 SEND_GUARD', 'publish_queue.py:136-145 is_approved()'],
      note: 'Читает отметку, чтобы отличить решение человека от машинного статуса. Ставить не может.' },
    { role: 'smm', field: 'approved_at', patch: { u: 'deny' },
      src: ['publish_queue.py:605-610'], note: 'SMM готовит записи, но не одобряет их.' },
    { role: 'admin', field: 'approved_at', patch: { u: 'deny' },
      src: ['publish_queue.py:605-610'], note: 'Администратор завода не подменяет владельца.' },
    { role: 'agent_publish', field: 'queue_item', patch: { c: 'deny' },
      src: ['publish_queue.py:561-566 «ВСЕГДА pending. Ветки «а если без --hold — сразу approved» здесь больше нет и быть не должно»'],
      note: 'Публикатор не создаёт записей. Иначе рушится предохранитель.' },
    { role: 'agent_publish', field: 'queue_remove', patch: { d: 'deny' },
      src: ['publish_queue.py:664-670 cmd_remove()'], note: 'Убирать записи из очереди — не его работа.' },
    { role: 'agent_claude', field: 'queue_remove', patch: { d: 'deny' },
      src: ['publish_queue.py:664-670'], note: 'Удаление записи из очереди — решение человека.' },
    { role: 'agent_claude', field: 'env_keys', patch: { r: 'deny', c: 'deny', u: 'deny' },
      src: ['updater.py:123-130', 'github_backup.py:190-210'], note: 'Зона _FORBIDDEN: агент не читает ключи даже для проверки.' },
    { role: 'agent_claude', field: 'license_key', patch: { r: 'deny' }, src: ['installer/activation.py'] },
    { role: 'agent_claude', field: 'activation_state', patch: { c: 'deny', u: 'deny' },
      src: ['activation_gate.py:31-53'], note: 'Технический допуск нельзя выдать ролью — только активацией.' },
    { role: 'agent_backup', field: 'activation_state', patch: { r: 'deny' }, src: ['github_backup.py:162-163 _DENY_NAMES'] },
    { role: 'guest', field: 'carousel_slides', patch: { r: 'published_only' }, src: ['assumption'], note: 'Гость видит только вышедшее; где именно — вопрос владельцу.' },
    { role: 'video', field: 'reels_template', patch: { c: 'conditional', u: 'conditional' },
      src: ['CLAUDE.md «ФОРМАТОВ РОВНО ТРИ»'], note: 'Формат выбирается из трёх; четвёртого нет ни по просьбе, ни по названию.' },
    { role: 'designer', field: 'logo_mark', patch: { u: 'allow', c: 'deny' },
      src: ['ПРАВИЛА_ЗАВОДА.md:34-39', 'config/factory.config.json:12-14'],
      note: 'Логотип задан настройкой, а не слайдом: правка настройки — владелец, включение знака — сборка.' },
    { role: 'agent_render', field: 'bank_photo', patch: { u: 'deny' }, src: ['updater.py:123-130'] },
    { role: 'agent_render', field: 'bank_video', patch: { u: 'deny' }, src: ['updater.py:123-130'] },
    { role: 'agent_render', field: 'media_seen', patch: { r: 'allow', u: 'conditional' },
      src: ['media_watch.py:75-91'], note: 'Отмечает использование кадра, чтобы правило «не чаще раза в две недели» работало.' }
  ];

  /* ── Статусные исключения: права, зависящие от статуса ─────────────────── */
  KZ.statusOverrides = [
    { level: 'unit', status: 'published', role: null, module: null, patch: { u: 'deny', d: 'deny' },
      src: ['assumption'], note: 'Опубликованное не переписывают: правка оформляется новой версией.' },
    { level: 'unit', status: 'published', role: 'owner', module: null, patch: { u: 'conditional' },
      src: ['ПРАВИЛА_ЗАВОДА.md:67-68'], note: 'Владелец правит через новую версию, а не поверх вышедшего.' },
    { level: 'unit', status: 'archived', role: null, module: null, patch: { c: 'conditional', r: 'allow', u: 'deny', d: 'conditional' },
      src: ['assumption'], note: 'Архив — единственная зона, где удаление вообще обсуждается; политики пока нет (вопрос 6 опросника).' },
    { level: 'unit', status: 'blocked', role: null, module: null, patch: { u: 'deny' },
      src: ['checks.py:772 verify()', 'modules/content_plan/gate.py:361 material_ready()'],
      note: 'Пока гейт не пройден — правки бессмысленны, материал не пойдёт дальше.' },
    { level: 'unit', status: 'blocked', role: 'editor', module: 'content_plan', patch: { u: 'conditional' },
      src: ['modules/content_plan/gate.py:157-200 approval_decision()'], note: 'Редактор возвращает слот на доработку — это легальный переход.' },
    { level: 'unit', status: 'returned', role: null, module: null, patch: { u: 'conditional' },
      src: ['modules/content_plan/gate.py:60-70 veto()'], note: 'Правка возможна, но только по тому замечанию, из-за которого вернули.' },
    { level: 'unit', status: 'scheduled', role: 'agent_claude', module: 'publish_queue', patch: { u: 'conditional' },
      src: ['publish_queue.py:550-559 (зона и время пишутся в запись)'],
      note: 'Перенести время можно только новой записью: одобренный план не сдвигают молча.' },
    { level: 'queue', status: 'pending', role: 'agent_publish', module: null, patch: { r: 'deny' },
      src: ['publish_queue.py:708 if not is_approved(item)'],
      note: 'Публикатор не смотрит на неодобренное: даже читать его он не должен.' },
    { level: 'queue', status: 'pending', role: 'agent_claude', module: 'publish_queue', patch: { c: 'allow', u: 'deny' },
      src: ['publish_queue.py:561-566 «ВСЕГДА pending»'],
      note: 'Его работа заканчивается на pending. Дальше — человек.' },
    { level: 'queue', status: 'approved', role: 'agent_publish', module: 'publish_queue', patch: { r: 'approved_only', u: 'status_only' },
      src: ['publish_queue.py:673-679 cmd_run()', 'publish_queue.py:133 STATUS_CLOSED'],
      note: 'Из одобренного он может сделать done / failed / missed — и только это.' },
    { level: 'queue', status: 'done', role: null, module: null, patch: { u: 'deny', d: 'deny' },
      src: ['publish_queue.py:133 STATUS_CLOSED', 'health_report.py:37-38'],
      note: 'Запись закрыта: --run такие не смотрит вовсе.' },
    { level: 'queue', status: 'done', role: 'owner', module: null, patch: { d: 'conditional' },
      src: ['assumption'], note: 'Убрать опубликованную запись из очереди владелец может, но журнал остаётся.' },
    { level: 'queue', status: 'failed', role: 'agent_publish', module: null, patch: { u: 'status_only' },
      src: ['publish_queue.py:133'], note: 'Единственный статус ошибки, который ставит сам публикатор.' },
    { level: 'queue', status: 'expired', role: null, module: 'publish_queue', patch: { c: 'conditional', u: 'deny' },
      src: ['publish_queue.py:709-721 cmd_run()'], note: 'Вышедшее из окна догона не оживляют: нужна новая запись с новым временем.' },
    { level: 'queue', status: 'expired', role: 'owner', module: 'publish_queue', patch: { c: 'allow', u: 'conditional' },
      src: ['publish_queue.py:621-631 cmd_approve() («человек вправе сказать «да» задним числом»)'],
      note: 'Владелец может одобрить задним числом — запись оживёт, если попадает в окно.' },
    { level: 'queue', status: 'missed', role: null, module: null, patch: { u: 'deny' },
      src: ['publish_queue.py:128 STATUS_LABEL["missed"]'], note: 'Статус честно говорит «не вышло». Переписывать его нельзя.' }
  ];

  /* ── Правила (на что ссылаются ограничения) ───────────────────────────── */
  KZ.rules = {
    'R-AGT-1': { title: 'Агент не ставит approved', text: 'Единственное место во всём заводе, где появляется слово «одобрено», — cmd_approve(), то есть команда человека. Агент не имеет права выставить этот статус ни при какой формулировке просьбы.', src: 'publish_queue.py:605-610; publish_queue.py:114-115' },
    'R-AGT-2': { title: 'Агент не подменяет финальную позицию человека', text: 'ИИ исполняет, но не владеет правом: согласие, ответственность и финальное «да» остаются за владельцем.', src: 'ПРАВИЛА_ЗАВОДА.md:55-56; инструкция владельца §2 п.8' },
    'R-AGT-3': { title: 'vidiq_* — только разведка', text: 'Инструменты vidIQ не собирают контент. Видео и картинки делает свои движок завода, локально и бесплатно.', src: 'CLAUDE.md, раздел «vidiq_* — ТОЛЬКО РАЗВЕДКА»' },
    'R-AGT-4': { title: 'Не просить клиента расшаривать ссылки', text: 'Материал лежит на его диске. Просьба «пришлите публичную ссылку» означает, что агент пошёл не тем путём.', src: 'CLAUDE.md «НИКОГДА не проси клиента расшаривать ссылки»' },
    'R-Q-1': { title: '--add всегда создаёт pending', text: 'Другого начального статуса нет: машина не имеет права выписать себе разрешение на публикацию.', src: 'publish_queue.py:561-566; publish_queue.py:113' },
    'R-Q-2': { title: 'Два условия одобрения', text: 'is_approved() = статус approved И непустая отметка approved_at. Одного статуса мало сознательно.', src: 'publish_queue.py:136-145' },
    'R-Q-3': { title: '--run видит только одобренное', text: 'Ни одна ветка cmd_run() не приводит к запуску команды для записи без is_approved().', src: 'publish_queue.py:673-679; publish_queue.py:708' },
    'R-Q-4': { title: 'SEND_GUARD = "--send"', text: 'Каждая дочерняя команда обязана содержать флаг --send, иначе cmd_run() отказывает и пишет отказ в журнал.', src: 'publish_queue.py:108; publish_queue.py:753' },
    'R-Q-5': { title: 'Срок прошёл — согласия не было', text: 'Запись без одобрения по истечении окна догона (--catchup-hours, по умолчанию 6 ч) становится expired и сама не выйдет.', src: 'publish_queue.py:709-721; publish_queue.py:129' },
    'R-Q-6': { title: 'Одобрение снимается человеком', text: '--unapprove возвращает запись в ожидание: она снова не выйдет по расписанию.', src: 'publish_queue.py:647-661' },
    'R-Q-7': { title: 'Публикатор не создаёт и не одобряет', text: 'Право Create/Update в очереди у публикатора отсутствует: иначе рушится предохранитель is_approved().', src: 'publish_queue.py:673-679; publish_queue.py:532-575' },
    'R-Q-8': { title: 'Наружу уходит ровно два вида материалов', text: 'Первое: то, на что владелец указал сам («опубликуй вот это»). Второе: то, что он одобрил в очереди и чему подошло время. Третьего пути нет. «Утверждён план на период» — НЕ одобрение материала: одобрять за человека скопом запрещено.', src: 'CLAUDE.md:820-827, 833-834' },
    'R-Q-9': { title: 'Самозваное одобрение снимается кодом', text: 'Если запись помечена approved, но решения человека в ней нет, cmd_run() возвращает её в pending и пишет в журнал: «СНЯТО САМОЗВАНОЕ «одобрено»… решения человека в записи нет».', src: 'publish_queue.py:722-739' },
    'R-Q-10': { title: 'Удаление записи очереди — без подтверждения', text: 'cmd_remove() убирает запись из очереди молча: точки апрува или подтверждения у него НЕТ (в отличие от --approve). Это пробел, а не защита.', src: 'publish_queue.py:664-670; publish_queue.py:811' },
    'R-PUB-1': { title: 'Без --send ничего не уходит', text: 'Отправка начинается только при явном --send в команде площадки.', src: 'autopost.py:854; release.py:295; tg_send.py:100; vkpost.py:373; vkcarousel.py:377; vk_wall_post.py:76; smmbox_post.py:513; modules/story_publisher/cli.py:152; daily_report.py:492; tg_report.py:39; modules/content_plan/cli.py:654' },
    'R-SEC-1': { title: 'Зона _FORBIDDEN', text: 'Не трогается патчем и, значит, не выдаётся ни одной роли: .venv/, config/, .env, license.key, .state/, .git/, photos/, video/, talking/, music/, stock/, primer/, music_cache/, music_preview/, out_, .cache_models/, installer/vendor/.', src: 'updater.py:123-130' },
    'R-SEC-2': { title: 'Гейт секретов отменяет отправку целиком', text: 'Находка известной формы ключа (Anthropic, GitHub, ВК, Google, Slack, Telegram, приватный ключ) — твёрдая: отправка копии не состоится.', src: 'github_backup.py:190-200; github_backup.py:435' },
    'R-SEC-3': { title: 'Секреты не удаляют', text: 'Ключ перевыпускают, а не стирают файл: удаление .env/license.key не предусмотрено ни для одной роли, включая владельца.', src: 'updater.py:123-130; github_backup.py:162-163' },
    'R-BKP-1': { title: 'Копия — только в приватный репозиторий', text: 'Перед отправкой проверяется private; медиа, out_*, .state/, config/, ключи в копию не уезжают никогда.', src: 'github_backup.py:744; github_backup.py:167-185' },
    'R-BKP-2': { title: 'Запрещённые имена и пути копии', text: '_DENY_NAMES, _DENY_SUFFIX, _DENY_SEGMENTS, _DENY_PREFIXES, _DENY_PATHS — проверяются как отдельные части пути, а не подстроки.', src: 'github_backup.py:162-177, 183-185' },
    'R-BKP-3': { title: 'Образец помечается вслух', text: 'Строка с примером ключа помечается `github_sync: образец`; тихого исключения нет — --list называет число пропущенных строк.', src: 'github_backup.py:212-220' },
    'R-J-1': { title: 'Журнал append-only', text: 'Записи журнала не правятся и не удаляются: это доказательство, а не рабочий файл.', src: 'health_report.py:37-38; publish_queue.py:133' },
    'R-J-2': { title: 'Удаление — только политикой хранения', text: 'Право Delete на журналы существует лишь как retention-политика владельца, которой в коде пока нет.', src: 'assumption: политики хранения в коде нет' },
    'R-CP-1': { title: 'Статус слота — только легальным переходом', text: 'model.set_status() проверяет допустимость перехода и пишет историю; прямой правки статуса в json не существует.', src: 'modules/content_plan/model.py:139-150' },
    'R-CP-2': { title: 'Одобрение плана — отдельное решение', text: 'Без plan.approved публикация слота заблокирована: is_approved(plan) проверяется и в гейте, и в исполнителе.', src: 'modules/content_plan/model.py:153-154; gate.py:423-430; executor.py:173' },
    'R-CP-3': { title: 'Вето и одобрение слота — человек', text: 'veto() и approve_slot() существуют как человеческие действия; агент их не выполняет.', src: 'modules/content_plan/gate.py:60-86' },
    'R-CP-4': { title: 'Агент не одобряет слот', text: 'Статус approved у слота ставится только по решению человека или одобренным планом.', src: 'modules/content_plan/gate.py:71-86' },
    'R-CP-5': { title: 'Пять замков контент-плана', text: 'Отправка слота возможна только когда сняты все замки: план утверждён человеком, время вышло, слот в статусе approved, реальная отправка вооружена (конфиг content_plan_live_publish=true И запуск с --arm), материал действительно собран.', src: 'modules/content_plan/gate.py:411-437' },
    'R-CP-6': { title: 'Роль меняет свой слот, а не план', text: 'Переходы статуса ограничены таблицей ALLOWED: всё, что в неё не входит, запрещено. Роль двигает статус своей сборки, но не тему, не дату и не финальную позицию.', src: 'modules/content_plan/model.py:18, 54-70, 139-150' },
    'R-CP-7': { title: 'Жёсткий стоп прототипа', text: 'REAL_PUBLISH_IMPLEMENTED = False: гейт контент-плана НИКОГДА не вызывает реальную отправку, только печатает и логирует команду, которая ушла бы. Слоты удерживаются (HELD) — это не поломка, а осознанный стоп.', src: 'modules/content_plan/gate.py:26-30, 513-539' },
    'R-CP-8': { title: 'Нет материала — нет отправки', text: 'material_ready() — пятый замок: если сборка выключена, слот просит ввода, артефакта нет или он пробный, отправки не будет при любых прочих условиях.', src: 'modules/content_plan/gate.py:361-408' },
    'R-CP-9': { title: 'Формат не подменяется тихо', text: 'Если слот просит формат, снятый с клиентской раздачи, мост ОТКАЗЫВАЕТ. Тихо подменить формат на разрешённый нельзя: человек увидел бы в плане одно, а в очереди другое.', src: 'modules/content_plan/reels_bridge.py:158-176, 409-415' },
    'R-GATE-1': { title: 'Гейт умеет только блокировать', text: 'checks.verify() и verify_talk() бросают CheckError и не пропускают материал. Разрешать что-либо гейт не умеет.', src: 'checks.py:281; checks.py:772; checks.py:1036' },
    'R-GATE-2': { title: 'Гейты не отключаются на клиентской сборке', text: 'Проверки обязательны для всех ролей и агентов; отдельного «режима без гейта» в матрице нет.', src: 'checks.py:772; activation_gate.py:31-53' },
    'R-ACT-1': { title: 'Публикация и рендер — только по активации', text: 'activation_gate.allow() зовётся точками выхода (autopost, story_publisher, render_reels) перед реальной работой.', src: 'activation_gate.py:5-13, 31-53' },
    'R-ACT-2': { title: 'Активация — не роль', text: 'Технический допуск нельзя выдать ролью: только переустановкой/активацией. При недоступном гейте — разрешение с предупреждением.', src: 'activation_gate.py:10-13, 41-53' },
    'R-CONSENT-1': { title: 'Диагностика — по явному согласию', text: 'Запись согласия ведётся с версией текста и его sha256; события granted/denied/revoked попадают в append-only журнал.', src: 'health_report.py:92-93; health_report.py:277-303; health_report.py:1645-1647' },
    'R-MED-1': { title: 'Импорт только новым номером', text: 'Повторный приём безопасен и не заводит один и тот же файл дважды; переписывать индекс задним числом нельзя.', src: 'modules/intake/pull.py (идемпотентность приёма); media_watch.py:99-152' },
    'R-MED-2': { title: 'Медиа не удаляют — архивируют', text: 'Delete для фото, видео, музыки и out_* в коде отсутствует, а _FORBIDDEN запрещает их трогать патчем.', src: 'updater.py:123-130; ПРАВИЛА_ЗАВОДА.md:45-46' },
    'R-MED-3': { title: 'Кадр не повторяется чаще двух недель', text: 'Перед сборкой проверяется, когда кадр использовался в последний раз.', src: 'ПРАВИЛА_ЗАВОДА.md:45-46; media_watch.py:75-91' },
    'R-CAR-1': { title: 'Правила карусели', text: 'Слайдов 5–8 диапазоном, чередование фото и текста, лицо не обрезается, обложка — всегда фото владельца, для ВК заголовок выше.', src: 'ПРАВИЛА_ЗАВОДА.md:13-29' },
    'R-CAR-2': { title: 'Фирменный знак и шаблон', text: 'Шаблон ПРЕМИУМ-ФОТО · terracotta; логотип в правом нижнем углу, 13% ширины кадра, на каждом слайде.', src: 'ПРАВИЛА_ЗАВОДА.md:31-39; config/factory.config.json:2, 12-14' },
    'R-REEL-1': { title: 'Форматов ровно три', text: 'СТАНДАРТ, СУБТИТРЫ СТАНДАРТ, СУБТИТРЫ С ПЕРЕБИВКОЙ и ПОЛОВИНКИ — остальные раскладки движка сняты с раздачи и клиенту не показываются.', src: 'CLAUDE.md «ФОРМАТОВ РОВНО ТРИ»' },
    'R-REEL-3': { title: 'ffmpeg у завода свой', text: 'Системный ffmpeg не ищут: путь берётся из пакета imageio-ffmpeg, входящего в коробку.', src: 'CLAUDE.md «ffmpeg У ЗАВОДА СВОЙ»' },
    'R-WORK-1': { title: 'Без команды владельца не начинать', text: 'Без отдельной команды владельца не приступать к генерации, монтажу и публикации: план собирает контент, но не запускает работу сам.', src: 'ПРАВИЛА_ЗАВОДА.md:55-56; CLAUDE.md «Один этап за раз»' },
    'R-CH-1': { title: 'Новая площадка — решение владельца', text: 'Подключение канала меняет то, куда уходит контент; в коде отдельной точки апрува на это НЕТ — это пробел.', src: 'assumption: в коде точки апрува нет (вопрос 7 опросника)' },
    'R-CH-2': { title: 'Прямой вход в ВК запрещён', text: 'После такого входа ВКонтакте заблокировал живой аккаунт. ВК идёт через SmmBox; команда прямого входа существует только чтобы отказать вслух (код возврата 2).', src: 'CLAUDE.md «ВКонтакте — только через SmmBox»' },
    'R-CH-3': { title: 'Пробный Reels — сначала предупреждение', text: 'Перед включением постоянного режима помощник обязан назвать условие «публичный аккаунт от 1000 подписчиков» и получить явное «да».', src: 'CLAUDE.md «ПРОБНЫЙ РИЛС — сначала предупреждение»' },
    'R-TALK-1': { title: 'Нарезка эфира — работа агента в сессии', text: 'Стадия --scan слушает запись, промпт отбора отдаётся агенту, ответ проверяется стадией --from-answer.', src: 'talk_longcut.py; НАРЕЗКА_ЭФИРОВ.md' },
    'R-ENG-1': { title: 'Правка пресетов — да, правка кода — патчем', text: 'Пресеты форматов и шаблонов — рабочая настройка; код движка патч возит отдельно, и _FORBIDDEN его не пускает в чужие зоны.', src: 'updater.py:151-153; updater.py:123-130' },
    'R-BIB-1': { title: 'Канон переписывают, а не удаляют', text: 'Смыслы живут версиями; отдельной операции удаления канона в коде нет.', src: 'modules/script_writer/bible.py; bible_setup.py' },
    'R-AN-1': { title: 'Аналитика не меняет статусы', text: 'Аналитик читает журналы и строит отчёты; в контент-план и статусы публикаций он не пишет.', src: 'modules/analytics/published.py; modules/analytics/history.py' },
    'R-CFG-1': { title: 'Настройки завода — только владелец', text: 'config/ лежит в _FORBIDDEN: обновление коробки настройки не перезаписывает, а роли их не правят.', src: 'updater.py:123-130; config/factory.config.json' },
    'R-CFG-2': { title: 'Настройку меняют названным ключом', text: 'Перед изменением постоянной настройки (например, пробных Reels) помощник проговаривает последствие и получает «да».', src: 'CLAUDE.md «ПРОБНЫЙ РИЛС»: «прежде чем менять что-либо в настройках, ОБЯЗАТЕЛЬНО сначала произнеси предупреждение»' },
    'R-ART-1': { title: 'Retention агентских артефактов', text: 'Одноразовые следы (.vk_pkce.json) удаляются после завершения входа; кеши — по дате. Политики хранения в коде пока нет.', src: 'assumption: политика не задана (вопрос 6 опросника)' },
    'R-ART-2': { title: 'Следы агента — не контент', text: 'Агентские артефакты описывают работу, а не смысл; они не попадают в контент-план и не публикуются.', src: 'config/health_consent.jsonl; .state/media_seen.json' },
    'R-SEC-4': { title: 'Защита клиента живёт в одной функции', text: '_path_allowed() — «здесь живёт вся защита клиента»: ловит выход за пределы коробки (zip-slip), запрещённые зоны и недопустимые типы файлов; проверка каждого файла патча идёт ДО распаковки.', src: 'updater.py:521-540; updater.py:543-592' },
    'R-CONSENT-2': { title: 'Согласие проверяется раньше канала', text: 'Порядок важен: сначала согласие, потом всё остальное. Пока согласия нет — «ни одного байта наружу»; отказ и отзыв останавливают отправку немедленно.', src: 'health_report.py:11, 419-438, 1587-1610' },
    'R-VK-2': { title: 'Отказ в ВК зашит в код, а не в память', text: 'Команды прямой выкладки в ВК завершаются жёстким отказом до всякой логики — код возврата 2. Проверка живёт в тестах, поэтому «забыть» правило нельзя.', src: 'vk_wall_post.py:80-89; vkpost.py:414; vkcarousel.py:412; modules/publishing/test_vk_keys.py:617-634' },
    'R-MONEY-1': { title: 'Платные запросы — только с явным «да»', text: 'Всё, что тратит деньги, по умолчанию считает смету и НЕ тратит: стенд генерации требует --spend, генерация перебивок — отдельной переменной, разведка vidIQ — кредитов владельца и предварительной сметы.', src: 'bench_generate.py:1491-1492, 1410; fal_connect.py:278; modules/niche_hooks/doctor.py:202-203' },
    'R-CAR-3': { title: 'Не всё из правил карусели проверяет код', text: 'Честный разрыв: код проверяет геометрию, лицо, цвет и правило «не больше 2/3 портретных слайдов», но НЕ проверяет «слайдов от 5 до 8» и «чередование фото и текста» — число слайдов задано движком (8). Правила 1–2 держатся на человеке и агенте.', src: 'checks.py:772-861; modules/content_plan/carousel_bridge.py:51-65' },
    'R-STORY-1': { title: 'Ссылку в сторис Instagram поставить нельзя', text: 'Ни один сервис не ставит ссылки и стикеры в историю через API. Завод не публикует молча, а кладёт памятку в папку reminders — человек добавит ссылку в приложении руками.', src: 'modules/story_publisher/drivers/instagram.py:39-54; modules/story_publisher/reminders.py:19-51' },
    'R-STORY-2': { title: 'Серия сторис останавливается на первом отказе', text: 'Опубликованную историю отозвать нечем, поэтому в боевом режиме серия встаёт на неудачном кадре и честно говорит, сколько ушло и где встали. Подпись вешается только на первый кадр.', src: 'modules/story_publisher/publisher.py:92-121, 158-164' },
    'R-ARCH-1': { title: 'Архивация объявлена, но не сделана', text: 'Папка «4 Опубликовано» описана контрактом Диска как архив вышедшего, но НИ ОДНА функция в неё не пишет: реальный архив завода — телеграм-канал, а не папка.', src: 'modules/intake/drive_structure.json:193-204; modules/intake/push.py:48-52' },
    'R-CAP-1': { title: 'Подпись не пишется сама', text: 'caption_bridge.build() возвращает текст и никуда его не сохраняет, а очередь читает готовый файл caption_<id>.txt. Мост «подпись → файл» в коде отсутствует: файл кладёт человек или сборка вручную.', src: 'modules/content_plan/caption_bridge.py; publish_queue.py:432-459' }
  };

  /* ── Gap-анализ: есть / частично / нет (шаг 6 инструкции) ──────────────── */
  KZ.gaps = [
    { module: 'media', aspect: 'Delete', state: 'нет', note: 'Удаления медиа в коде нет ни у одной роли. Нужна политика: архив вместо удаления.', src: 'updater.py:123-130 (photos/, talking/, music/ в _FORBIDDEN)' },
    { module: 'media', aspect: 'Retention', state: 'нет', note: 'Сколько хранить исходники и журналы — не задано нигде. Правило придётся вводить владельцу.', src: 'assumption' },
    { module: 'media', aspect: 'Приём (Create)', state: 'есть', note: 'intake.pull + media_watch --import: идемпотентно, повтор безопасен.', src: 'modules/intake/pull.py; media_watch.py:175-264' },
    { module: 'content_plan', aspect: 'Delete слота', state: 'нет', note: 'Слоты не удаляются: есть veto и returned. Архивной операции в модуле нет.', src: 'modules/content_plan/gate.py:60-86' },
    { module: 'content_plan', aspect: 'Апрув плана', state: 'есть', note: 'Двойное одобрение: plan.approved и статус слота approved. Проверяется в гейте и исполнителе.', src: 'modules/content_plan/model.py:153-154; gate.py:423-430' },
    { module: 'engines', aspect: 'Delete', state: 'нет', note: 'Движок — код, а не сущность: удаления в интерфейсе нет и не требуется.', src: 'assumption' },
    { module: 'carousel', aspect: 'Delete', state: 'нет', note: 'Пересборка вместо удаления. Старые out_c* остаются на диске.', src: 'updater.py:123-130 (out_)' },
    { module: 'carousel', aspect: 'Гейт перед выдачей', state: 'есть', note: 'checks.verify() смотрит обрезку лица, число слайдов, логотип и правила завода.', src: 'checks.py:772; ПРАВИЛА_ЗАВОДА.md:13-39' },
    { module: 'reels', aspect: 'Update (пересборка)', state: 'есть', note: 'Пересборка возможна, история версий ролика на диске не ведётся.', src: 'render_reels.py' },
    { module: 'reels', aspect: 'Delete', state: 'нет', note: 'Удаление и откат версии ролика отсутствуют.', src: 'updater.py:123-130' },
    { module: 'talk', aspect: 'Delete исходников', state: 'нет', note: 'Длинный исходник в завод не копируется — читается с Диска на месте. Удаления нет.', src: 'CLAUDE.md «Длинный исходник в завод НЕ копируется»' },
    { module: 'publish_queue', aspect: 'CRUD', state: 'есть', note: 'Полный CRUD: --add / --list / --approve / --unapprove / --remove / --run.', src: 'publish_queue.py:788-814' },
    { module: 'publish_queue', aspect: 'Апрув', state: 'есть', note: 'Двойное условие: статус approved И отметка approved_at. Ставит только человек.', src: 'publish_queue.py:136-145, 605-644' },
    { module: 'channels', aspect: 'Апрув нового канала', state: 'нет', note: 'В коде нет точки апрува на подключение новой площадки: подключение и публикация разделены слабо.', src: 'assumption: в коде точки нет' },
    { module: 'channels', aspect: 'Отзыв публикации', state: 'нет', note: 'Опубликованное не отзывается. Ошибку исправляют новым постом.', src: 'assumption' },
    { module: 'journal', aspect: 'Update / Delete', state: 'нет', note: 'И не должно быть: журнал append-only. Retention-политики в коде нет.', src: 'health_report.py:37-38' },
    { module: 'journal', aspect: 'Чтение журналов', state: 'есть', note: 'daily_report, tg_report, modules/analytics читают журналы; отчёт уходит с --send.', src: 'daily_report.py:492; tg_report.py:39' },
    { module: 'secrets', aspect: 'C/R/U', state: 'частично', note: 'Есть владелец и есть код активации; отдельной роли «владелец ключей» нет — вопрос 4 опросника.', src: 'installer/activation.py; .env' },
    { module: 'secrets', aspect: 'Delete', state: 'нет', note: 'Запрещено всем, включая владельца: ключ перевыпускают.', src: 'updater.py:123-130; github_backup.py:162-163' },
    { module: 'agent_artifacts', aspect: 'Retention', state: 'нет', note: 'Единственное исключение — .vk_pkce.json после --finish; остальное живёт вечно.', src: 'vk_auth.py (--finish); assumption' },
    { module: 'agent_artifacts', aspect: 'Видимость агенту', state: 'частично', note: 'Агент пишет свои следы, но единого правила «что он о себе оставляет» нет.', src: 'assumption' },
    { module: 'factory_config', aspect: 'Апрув изменений', state: 'частично', note: 'Правило есть в CLAUDE.md (проговорить и получить «да»), но кодовой точки апрува нет.', src: 'CLAUDE.md «ПРОБНЫЙ РИЛС»' },
    { module: 'factory_config', aspect: 'Delete', state: 'нет', note: 'config/ в _FORBIDDEN: настройки не удаляются и не перезаписываются обновлением.', src: 'updater.py:123-130' },
    { module: 'content_plan', aspect: 'Мост «слот → очередь»', state: 'нет', note: 'Гейт плана только СОБИРАЕТ строку команды и держит слот (HELD): REAL_PUBLISH_IMPLEMENTED=False. Автоматического перехода «слот одобрен → запись в очереди» в коде нет: --add делает человек или агент отдельно.', src: 'modules/content_plan/gate.py:26-30, 331-358, 513-539' },
    { module: 'content_plan', aspect: 'Окно вето', state: 'есть', note: 'Вето и утверждение конкретного выпуска человеком работают: слот можно снять до выхода, правки возвращаются в revising.', src: 'modules/content_plan/gate.py:46-86, 157-200' },
    { module: 'carousel', aspect: 'Правила 1–2 кодом', state: 'частично', note: '«Слайдов от 5 до 8» и «чередование фото и текста» кодом НЕ проверяются: число слайдов задано движком (8), проверяется только правило «не больше 2/3 портретных».', src: 'checks.py:772-861; modules/content_plan/carousel_bridge.py:51-65' },
    { module: 'carousel', aspect: 'Подпись → файл', state: 'нет', note: 'caption_bridge возвращает текст и никуда его не пишет, а очередь читает caption_<id>.txt. Мост отсутствует.', src: 'modules/content_plan/caption_bridge.py; publish_queue.py:432-459' },
    { module: 'carousel', aspect: 'Логотип: настройка и правило', state: 'частично', note: 'Правило завода требует 13% ширины кадра, а значение по умолчанию в коде — 9%. Расхождение живёт в настройке и правиле одновременно: кто прав, решает владелец.', src: 'brand_logo.py:40-44; ПРАВИЛА_ЗАВОДА.md:34-39' },
    { module: 'channels', aspect: 'Сторис Instagram: документ и код', state: 'частично', note: 'Документ говорит про Upload-Post, код с 04.09.2026 отправляет через SmmBox и честно возвращает статус unconfirmed. Это расхождение документа и кода, а не поломка.', src: 'modules/story_publisher/drivers/instagram.py:1-23; CLAUDE.md' },
    { module: 'channels', aspect: 'Архивация в «4 Опубликовано»', state: 'нет', note: 'Папка объявлена контрактом как архив, но ни одна функция в неё не пишет: push умеет только cuts/review/ready.', src: 'modules/intake/push.py:48-52; modules/intake/drive_structure.json:193-204' },
    { module: 'channels', aspect: 'Откат публикации', state: 'нет', note: 'Опубликованное не отзывается: «опубликованную историю отозвать нечем». Ошибку исправляют новым постом.', src: 'modules/story_publisher/publisher.py:92-97, 161-164' },
    { module: 'Все роли', aspect: 'Сущность «роль»', state: 'нет', note: 'В коде нет ни ролей, ни прав: гейты построены на флагах и на «человек/агент». Матрица вводит роль впервые.', src: 'assumption: grep по репозиторию роли не находит' },
    { module: 'Агенты', aspect: 'Границы агента', state: 'частично', note: 'Ограничения агента разбросаны по коду и CLAUDE.md: is_approved, SEND_GUARD, _FORBIDDEN, _DENY_*, правила завода. Матрица собирает их в одном месте.', src: 'publish_queue.py:108,136; updater.py:123; github_backup.py:162-185; ПРАВИЛА_ЗАВОДА.md' }
  ];

  /* ── Открытые вопросы (вход в опросник, §8 инструкции) ─────────────────── */
  KZ.openQuestions = [
    { id: 'Q1', q: 'Полный список ролей: кто ещё, кроме владельца, редактора, дизайнера, SMM, монтажёра, аналитика и администратора?', why: 'Сейчас список взят из файлов и кода; отдельной сущности «роль» в репозитории нет.', defaultAnswer: 'owner, editor, designer, smm, video, analyst, admin + guest' },
    { id: 'Q2', q: 'Кто, кроме владельца, имеет право удалять медиа и записи очереди?', why: 'Delete в коде отсутствует для медиа; для очереди есть --remove, но право не назначено.', defaultAnswer: 'никто; медиа — архив, запись очереди — только владелец' },
    { id: 'Q3', q: 'Нужна ли роль «гость/клиент» и что ей видно?', why: 'В коде роли нет; published_only в матрице помечен как допущение.', defaultAnswer: 'да, только опубликованное' },
    { id: 'Q4', q: 'Кто владелец токенов (.env) и как они ротируются?', why: 'Ключи лежат в .env, файл в _FORBIDDEN; процедуры ротации в коде нет.', defaultAnswer: 'владелец; ротация — выпуск нового ключа и замена строки в .env' },
    { id: 'Q5', q: 'Агент может создавать записи в очереди (pending) без спроса или «сначала спросить»?', why: 'По CLAUDE.md — может; матрица это повторяет, но решение стоит подтвердить.', defaultAnswer: 'может создавать pending; approved — никогда' },
    { id: 'Q6', q: 'Retention: сколько хранить журналы, кеши и исходники разговорных записей после сборки?', why: 'Политики хранения в коде нет ни для чего, кроме одноразового .vk_pkce.json.', defaultAnswer: 'журналы — бессрочно; кеши — 30 дней; исходники — не удалять' },
    { id: 'Q7', q: 'Нужен ли отдельный апрув на подключение нового канала?', why: 'В коде такой точки апрува нет: подключение площадки не требует подтверждения.', defaultAnswer: 'да, подключение канала — решение владельца' }
  ];

  KZ.stats = (function () {
    var fields = 0, mods = KZ.modules.length;
    KZ.modules.forEach(function (m) { fields += m.fields.length; });
    var cells = 0;
    Object.keys(KZ.grants).forEach(function (mod) {
      var roles = Object.keys(KZ.grants[mod]);
      var f = 0;
      KZ.modules.forEach(function (m) { if (m.id === mod) f = m.fields.length; });
      cells += roles.length * f;
    });
    var assumptions = 0;
    Object.keys(KZ.grants).forEach(function (mod) {
      Object.keys(KZ.grants[mod]).forEach(function (role) {
        var cell = KZ.grants[mod][role];
        (cell.src || []).forEach(function (s) { if (s.indexOf('assumption') === 0) assumptions++; });
      });
    });
    return {
      roles: KZ.roles.length, humans: KZ.roles.filter(function (r) { return r.type === 'human'; }).length,
      agents: KZ.roles.filter(function (r) { return r.type === 'agent'; }).length,
      modules: mods, fields: fields, grants: cells,
      rules: Object.keys(KZ.rules).length, gaps: KZ.gaps.length,
      gapNone: KZ.gaps.filter(function (x) { return x.state === 'нет'; }).length,
      gapPart: KZ.gaps.filter(function (x) { return x.state === 'частично'; }).length,
      gapYes: KZ.gaps.filter(function (x) { return x.state === 'есть'; }).length,
      assumptions: assumptions
    };
  }());

  root.KZ = KZ;
}(typeof window !== 'undefined' ? window : this));
