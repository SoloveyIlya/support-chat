/*
  ====== UI Модуль: Активные диалоги ======
  Назначение:
    - Рендер списка активных диалогов с пагинацией
    - Управление кастомным select (проект)
    - Popup-меню проекта и контекстное меню диалога
    - Управление фокусом и ARIA для доступности

  Ключевые принципы:
    - Единый state + кеш DOM ссылок
    - Делегирование событий на контейнерах (список/документ)
    - Все визуальные цвета — только через CSS, JS отвечает за классы/ARIA
*/
(function ActiveDialogsApp() {
  'use strict';

  /* ====== Mock-данные ======
     В реальной интеграции заменить на загрузку с бэка и реактивный ререндер.
  */
  const MOCK_DIALOGS = [
    { id: 1, name: 'user_1', time: '10:15', platform: 'Android 13 • ФРИИ 1.3.7', origin: 'bot' },
    { id: 2, name: 'user_2', time: '09:42', platform: 'iOS 16.7 • ФРИИ 2.8.6', origin: 'operator' },
    { id: 3, name: 'user_3', time: '08:30', platform: 'Android 12 • ФРИИ 1.2.1', origin: 'bot' },
    { id: 4, name: 'user_4', time: '07:55', platform: 'iOS 16.9 • ФРИИ 1.6.0', origin: 'operator' },
    { id: 5, name: 'user_5', time: '07:12', platform: 'Android 11 • ФРИИ 2.4.7', origin: 'bot' },
    { id: 6, name: 'user_6', time: '06:48', platform: 'iOS 15.4 • ФРИИ 1.1.0', origin: 'bot' },
    { id: 7, name: 'user_7', time: '06:20', platform: 'Android 13 • ФРИИ 1.3.7', origin: 'operator' },
    { id: 8, name: 'user_8', time: '05:59', platform: 'iOS 16.8 • ФРИИ 2.4.7', origin: 'bot' },
    { id: 9, name: 'user_9', time: '05:30', platform: 'Android 10 • ФРИИ 1.0.0', origin: 'bot' },
    { id: 10, name: 'user_10', time: '05:01', platform: 'iOS 16.7 • ФРИИ 1.6.9', origin: 'operator' },
    { id: 11, name: 'user_11', time: '04:45', platform: 'Android 13 • ФРИИ 2.8.6', origin: 'bot' },
    { id: 12, name: 'user_12', time: '04:20', platform: 'iOS 16.9 • ФРИИ 1.6.0', origin: 'operator' },
    { id: 13, name: 'user_13', time: '03:58', platform: 'Android 12 • ФРИИ 1.2.1', origin: 'bot' },
    { id: 14, name: 'user_14', time: '03:40', platform: 'iOS 15.4 • ФРИИ 1.1.0', origin: 'bot' },
    { id: 15, name: 'user_15', time: '03:20', platform: 'Android 11 • ФРИИ 2.4.7', origin: 'operator' },
    { id: 16, name: 'user_16', time: '03:05', platform: 'iOS 16.7 • ФРИИ 2.8.6', origin: 'bot' },
    { id: 17, name: 'user_17', time: '02:50', platform: 'Android 13 • ФРИИ 1.3.7', origin: 'bot' },
    { id: 18, name: 'user_18', time: '02:35', platform: 'iOS 16.8 • ФРИИ 2.4.7', origin: 'operator' },
    { id: 19, name: 'user_19', time: '02:20', platform: 'Android 10 • ФРИИ 1.0.0', origin: 'bot' },
    { id: 20, name: 'user_20', time: '02:05', platform: 'iOS 16.7 • ФРИИ 1.6.9', origin: 'bot' },
    { id: 21, name: 'user_21', time: '01:50', platform: 'Android 13 • ФРИИ 2.8.6', origin: 'operator' },
    { id: 22, name: 'user_22', time: '01:35', platform: 'iOS 16.9 • ФРИИ 1.6.0', origin: 'bot' },
    { id: 23, name: 'user_23', time: '01:20', platform: 'Android 12 • ФРИИ 1.2.1', origin: 'bot' },
    { id: 24, name: 'user_24', time: '01:05', platform: 'iOS 15.4 • ФРИИ 1.1.0', origin: 'operator' },
    { id: 25, name: 'user_25', time: '00:50', platform: 'Android 11 • ФРИИ 2.4.7', origin: 'bot' },
  ];

  /* ====== Состояние ======
     Единый источник истины для пагинации и выбранного диалога.
  */
  const state = {
    pageSize: 10,
    currentPage: 1,
    selectedId: null,
  };

  /* ====== DOM ======
     Все необходимые элементы кешируются здесь для производительности.
  */
  const dom = {
    list: document.getElementById('dialogList'),
    pageInfo: document.getElementById('pageInfo'),
    btnPrev: document.getElementById('btnPrev'),
    btnNext: document.getElementById('btnNext'),
    totalCounter: document.getElementById('totalCounter'),
    // Правая панель чата
    workspaceEmpty: document.querySelector('.workspace__empty'),
    chatPanel: document.getElementById('chatPanel'),
    chatUser: document.getElementById('chatUser'),
    chatMeta: document.getElementById('chatMeta'),
    chatBadge: document.getElementById('chatBadge'),
    chatBody: document.getElementById('chatBody'),
    projectSelect: document.getElementById('projectSelect'),
    projectDisplay: document.getElementById('projectDisplay'),
    selectRoot: document.querySelector('.select'),
    dropdown: document.getElementById('projectDropdown'),
    logout: document.getElementById('btnLogout'),
    projectMenuBtn: document.getElementById('projectMenuBtn'),
    projectMenu: document.getElementById('projectMenu'),
    dialogMenu: null,
    chatFooter: document.getElementById('chatFooter'),
  };

  let dialogMenuAnchorBtn = null; // кнопка-источник для позиционирования меню диалога

  /* ====== Сообщения (store v2 — нормализованный) ======
     Сообщение (расширяемый формат):
       id: string (может быть 'temp:<n>' для локальных черновиков)
       dialogId: number
       author: 'client'|'bot'|'operator'|'system'
       text: string
       attachments?: Array<{
         id:string|number,
         name:string,
         size?:string,              // строка вида '256 KB' — парсится best-effort
         contentType?:string,       // MIME (используется для классификации image/*)
         downloadUrl?:string,       // ссылка скачивания (может совпадать с url)
         url?:string,               // исходный URL (например, CDN для картинки)
         displayHint?:'inline-image'|'file' // ЯВНАЯ подсказка от бэка как отобразить
       }>
       createdAt: string|Date
       status?: 'pending'|'sent'|'delivered'|'read'|'failed'
       seq?: number (монотонный порядковый номер с сервера — зарезервировано)
     Хранение:
       store[dialogId] = { byId:{}, order:[ids], lowestSeq, highestSeq }
     Цели: быстрые обновления, дедупликация, будущая пагинация (append/prepend).

     displayHint — расширяемый контракт с бекендом. Если задано:
       'inline-image' — принудительно отображаем как встроенную картинку
       'file'         — принудительно карточка файла
     Если отсутствует, применяется эвристика: isInlineImage(att) => inline-image, иначе file.
     Это позволяет бэку переопределять автоматическую логику (например, запретить inline для очень длинных панорам или SVG).
  */
  const MessageStore = (() => {
    const dialogs = Object.create(null); // dialogId -> bucket
    let tempCounter = 1; // для генерации временных id (демо)
    const listeners = new Set();

    function ensure(dialogId){
      if(!dialogs[dialogId]){
        dialogs[dialogId] = {
          byId: Object.create(null),
          order: [],
          lowestSeq: null,
          highestSeq: null,
          hasMoreBackward: true,
          hasMoreForward: false,
        };
      }
      return dialogs[dialogId];
    }

    function nextTempId(){ return 'temp:' + (tempCounter++); }

    function notify(evt){ listeners.forEach(l=>{ try{ l(evt); }catch(e){ /* silent */ } }); }

    function sortOrder(bucket){
      bucket.order.sort((a,b)=>{
        const A = bucket.byId[a];
        const B = bucket.byId[b];
        if(!A || !B) return 0;
        const ak = A.seq != null ? A.seq : new Date(A.createdAt).getTime();
        const bk = B.seq != null ? B.seq : new Date(B.createdAt).getTime();
        return ak - bk;
      });
    }

    function ingestBatch(dialogId, list, { position='append', replace=false } = {}){
      const bucket = ensure(dialogId);
      if(replace){ bucket.byId = Object.create(null); bucket.order = []; }
      const added = [];
      for(const msg of list){
        if(!msg || !msg.id) continue;
        const id = String(msg.id);
        if(!bucket.byId[id]){
          bucket.byId[id] = msg;
          if(position === 'prepend') bucket.order.unshift(id); else bucket.order.push(id);
          added.push(id);
        } else {
          bucket.byId[id] = { ...bucket.byId[id], ...msg }; // merge
        }
      }
      if(added.length) sortOrder(bucket);
      notify({ type:'batch', dialogId, added });
      return added;
    }

    function addLocal(dialogId, { author, text, attachments = [], createdAt = new Date(), status='pending' }){
      const bucket = ensure(dialogId);
      const id = nextTempId();
      const msg = { id, dialogId, author, text, attachments, createdAt, status };
      bucket.byId[id] = msg;
      bucket.order.push(id);
      notify({ type:'add', dialogId, id, local:true });
      return msg;
    }

    function updateStatus(dialogId, id, status){
      const bucket = ensure(dialogId);
      if(bucket.byId[id]){
        bucket.byId[id] = { ...bucket.byId[id], status };
        notify({ type:'status', dialogId, id, status });
      }
    }

    // Точечное обновление полей вложения внутри сообщения
    function updateAttachment(dialogId, msgId, attId, patch){
      const bucket = ensure(dialogId);
      const msg = bucket.byId[msgId];
      if(!msg || !Array.isArray(msg.attachments)) return false;
      let changed = false;
      msg.attachments = msg.attachments.map(att => {
        if(String(att.id) === String(attId)){
          changed = true;
          return { ...att, ...patch };
        }
        return att;
      });
      if(changed){
        notify({ type:'attachment-update', dialogId, msgId, attId, patch });
      }
      return changed;
    }

    function getList(dialogId){
      const bucket = ensure(dialogId);
      return bucket.order.map(i => bucket.byId[i]).filter(Boolean);
    }

    function subscribe(fn){ listeners.add(fn); return ()=>listeners.delete(fn); }

    return { ingestBatch, addLocal, updateStatus, getList, subscribe, updateAttachment };
  })();

  function escapeHtml(str){
    return str
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function formatMsgDate(date){
    try {
      const d = date instanceof Date ? date : new Date(date);
      // Формат: 13 сентября 15:41
      // toLocaleString для ru-RU с day+month+time даёт нужный регистр.
      const opts = { day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' };
      let s = d.toLocaleString('ru-RU', opts);
      // Удаляем возможные запятые (некоторые окружения вставляют)
      s = s.replace(/,/g,'');
      return s;
    } catch(e){ return ''; }
  }

  function buildAuthorIcon(author){
    if(author === 'bot'){
      return `<svg class="msg__author-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`;
    }
    // operator
    return `<svg class="msg__author-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  }

  function createAttachmentBlock(att){
    const nameEsc = escapeHtml(att.name);
    const sizeEsc = escapeHtml(att.size || '');
    return createFileAttachment(att);
  }

  /* ====== Attachments v2 ======
     Типы отображения:
       - Inline image (фотография) если contentType image/* и size <= INLINE_IMAGE_MAX_BYTES
       - Файловый блок (универсальный) для остальных случаев
     Порог и расширяемость вынесены в константы
  */
  const INLINE_IMAGE_MAX_BYTES = 800 * 1024; // 800KB порог (регулируемый)
  const IMAGE_MIME_PREFIX = 'image/';
  const IMAGE_EXTENSIONS = ['jpg','jpeg','png','webp','gif'];

  function isImageAttachment(att){
    if(!att) return false;
    if(att.contentType && att.contentType.startsWith(IMAGE_MIME_PREFIX)) return true;
    // fallback по расширению
    if(att.name){
      const m = att.name.toLowerCase().match(/\.([a-z0-9]+)$/);
      if(m && IMAGE_EXTENSIONS.includes(m[1])) return true;
    }
    return false;
  }

  function parseSizeToBytes(sizeStr){
    if(!sizeStr) return null;
    // ожидаем форматы типа "123 KB" / "2.4 MB"
    const m = sizeStr.trim().match(/([0-9]+(?:\.[0-9]+)?)\s*(kb|mb|b)/i);
    if(!m) return null;
    const num = parseFloat(m[1]);
    const unit = m[2].toLowerCase();
    if(unit === 'b') return num;
    if(unit === 'kb') return num * 1024;
    if(unit === 'mb') return num * 1024 * 1024;
    return null;
  }

  function isInlineImage(att){
    if(!isImageAttachment(att)) return false;
    const bytes = parseSizeToBytes(att.size);
    if(bytes != null && bytes > INLINE_IMAGE_MAX_BYTES) return false;
    return true;
  }

  function createInlineImageAttachment(att){
    const rawUrl = att.downloadUrl || att.url || '';
    const safeUrl = escapeHtml(rawUrl);
    const alt = escapeHtml(att.name || 'image');
    const nameEsc = escapeHtml(att.name || 'image');
    return `<figure class="msg-image msg-image--clickable" data-attachment-id="${att.id}" data-variant="inline-image" data-url="${safeUrl}" data-name="${nameEsc}">
      <img src="${safeUrl}" alt="${alt}" loading="lazy" decoding="async" />
      <a class="msg-image__download" href="${safeUrl}" download="${nameEsc}" aria-label="Скачать изображение" title="Скачать изображение">
        <svg class="msg-image__download-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" x2="12" y1="15" y2="3"/>
        </svg>
      </a>
    </figure>`;
  }

  function createFileAttachment(att){
    const nameEsc = escapeHtml(att.name || 'Файл');
    const sizeEsc = escapeHtml(att.size || '');
    const rawUrl = att.downloadUrl || att.url || '#';
    const downloadUrl = escapeHtml(rawUrl);
    const safeUrlAttr = escapeHtml(rawUrl === '#' ? '' : rawUrl);
    return `<div class="msg-file" data-attachment-id="${att.id}" data-variant="file" data-url="${safeUrlAttr}">
      <div class="msg-file__icon" aria-hidden="true"><img src="images/image.svg" alt="" /></div>
      <div class="msg-file__body">
        <div class="msg-file__name" title="${nameEsc}">${nameEsc}</div>
        <div class="msg-file__size">${sizeEsc}</div>
      </div>
      <a class="msg-file__download" href="${downloadUrl}" download title="Скачать">
        <img src="images/download.svg" alt="" />
      </a>
    </div>`;
  }

  /* ====== Attachment Variant Resolver ======
     Приоритет источника отображения:
       1. att.displayHint (явно задано бекендом: 'inline-image' | 'file')
       2. Автоклассификация (isInlineImage → inline-image, иначе file)
     Возвращает строковое значение варианта для унифицированной обработки.
  */
  function classifyAttachmentVariant(att){
    if(!att) return 'file';
    if(att.displayHint === 'inline-image') return 'inline-image';
    if(att.displayHint === 'file') return 'file';
    return isInlineImage(att) ? 'inline-image' : 'file';
  }

  function buildAttachmentHtml(att){
    const variant = classifyAttachmentVariant(att);
    if(variant === 'inline-image') return createInlineImageAttachment(att);
    return createFileAttachment(att);
  }
  function createMessageHtml(msg){
    const textHtml = `<div class="msg__text">${escapeHtml(msg.text)}</div>`;
    const metaHtml = `<div class="msg__meta"><time datetime="${new Date(msg.createdAt).toISOString()}">${formatMsgDate(msg.createdAt)}</time></div>`;
    if(msg.author === 'client'){
      return `<div class="msg msg--client" data-msg-id="${msg.id}">
        <div class="msg__bubble">
          ${textHtml}
          ${metaHtml}
        </div>
      </div>`;
    }
    const isBot = msg.author === 'bot';
    const authorLabel = isBot ? 'Нейросеть' : 'Оператор';
    const authorHtml = `<div class="msg__author">${buildAuthorIcon(isBot ? 'bot' : 'operator')}<span class="msg__author-label">${authorLabel}</span></div>`;
    let attachmentsHtml = '';
    if(Array.isArray(msg.attachments) && msg.attachments.length){
      const parts = [];
      for(const att of msg.attachments){
        parts.push(buildAttachmentHtml(att));
      }
      attachmentsHtml = `<div class="msg__attachments">${parts.join('')}</div>`;
    }
    return `<div class="msg msg--agent ${isBot ? 'msg--bot':'msg--operator'}" data-msg-id="${msg.id}">
      ${authorHtml}
      <div class="msg__bubble">
        ${textHtml}
        ${attachmentsHtml}
        ${metaHtml}
      </div>
    </div>`;
  }

  function appendMessageToDom(dialogId, msg){
    if(!dom.chatBody || state.selectedId !== dialogId) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = createMessageHtml(msg);
    dom.chatBody.appendChild(wrap.firstElementChild);
    dom.chatBody.scrollTop = dom.chatBody.scrollHeight;
    const el = dom.chatBody.querySelector(`[data-msg-id="${msg.id}"]`);
    if(el) processMessageAttachments(dialogId, msg, el);
  }

  // Backward совместимый интерфейс для текущего composer
  function addMessage(dialogId, { author, text, attachments = [], createdAt = new Date() }){
    const msg = MessageStore.addLocal(dialogId, { author, text, attachments, createdAt, status: author === 'operator' ? 'pending':'sent' });
    appendMessageToDom(dialogId, msg);
    return msg;
  }

  function renderMessagesForDialog(dialogId){
    if(!dom.chatBody) return;
    dom.chatBody.innerHTML = '';
    if(dialogId == null) return;
    const list = MessageStore.getList(dialogId);
    const frag = document.createDocumentFragment();
    for(const m of list){
      const w = document.createElement('div');
      w.innerHTML = createMessageHtml(m);
      frag.appendChild(w.firstElementChild);
    }
    dom.chatBody.appendChild(frag);
    dom.chatBody.scrollTop = dom.chatBody.scrollHeight;
    // Post-process вложения (апгрейд/фоллбек)
    for(const m of list){
      const node = dom.chatBody.querySelector(`[data-msg-id="${m.id}"]`);
      if(node) processMessageAttachments(dialogId, m, node);
    }
  }

  /* ====== Runtime Attachment Capability Check ======
     Цель: гарантировать правило «или inline изображение, или карточка файла». Если:
       - Мы попытались отобразить inline и загрузка изображения упала → фоллбек в карточку файла.
       - У нас карточка файла, но URL потенциально указывает на изображение (по расширению/MIME) → пробуем загрузить и апгрейдим до inline.
     Это делает поведение более надёжным против неточных contentType.
  */
  function looksLikeImageUrl(url){
    if(!url) return false;
    return /\.(png|jpe?g|gif|webp|avif)$/i.test(url.split('?')[0]);
  }

  function processMessageAttachments(dialogId, msg, msgEl){
    if(!msg || !Array.isArray(msg.attachments) || !msg.attachments.length) return;
    const attNodes = msgEl.querySelectorAll('[data-attachment-id]');
    if(!attNodes.length) return;
    for(const att of msg.attachments){
      const node = msgEl.querySelector(`[data-attachment-id="${att.id}"]`);
      if(!node) continue;
      const currentVariant = node.getAttribute('data-variant');
      const url = att.url || att.downloadUrl || node.getAttribute('data-url') || '';
      // === Case 1: inline → проверяем onerror (установим обработчик если не установлен)
      if(currentVariant === 'inline-image'){
        const img = node.querySelector('img');
        if(img && !img.dataset._handler){
          img.dataset._handler = '1';
          img.addEventListener('error', ()=>{
            // Фоллбек: заменить на file-attachment
            const fallbackHtml = createFileAttachment({ ...att, displayHint:'file' });
            const wrap = document.createElement('div');
            wrap.innerHTML = fallbackHtml;
            node.replaceWith(wrap.firstElementChild);
            MessageStore.updateAttachment(dialogId, msg.id, att.id, { displayHint:'file' });
          }, { once:true });
        }
        continue; // inline проверяем только на ошибку
      }
      // === Case 2: file → можем попытаться апгрейдить если это потенциально изображение
      if(currentVariant === 'file'){
        // Сценарий: displayHint='file' принудительно НЕ апгрейдим
        if(att.displayHint === 'file') continue;
        if(!(att.displayHint === 'inline-image') && !(att.contentType && att.contentType.startsWith('image/')) && !looksLikeImageUrl(url)) continue;
        if(!url || url === '#') continue;
        try {
            const testImg = new Image();
            testImg.loading = 'eager';
            testImg.decoding = 'async';
            testImg.addEventListener('load', ()=>{
              // Апгрейд до inline-image
              const html = createInlineImageAttachment({ ...att, displayHint:'inline-image' });
              const wrap = document.createElement('div');
              wrap.innerHTML = html;
              node.replaceWith(wrap.firstElementChild);
              MessageStore.updateAttachment(dialogId, msg.id, att.id, { displayHint:'inline-image' });
            }, { once:true });
            testImg.addEventListener('error', ()=>{ /* остаёмся в режиме file */ }, { once:true });
            testImg.src = url;
        } catch(e){ /* silent */ }
      }
    }
  }

  function seedDemoMessages(){
    // Если первый диалог уже имеет сообщения — считаем, что сид выполнен
    if(MessageStore.getList(1).length) return;

    const intro = [
      'Здравствуйте, у меня вопрос по заказу',
      'Добрый день! Подскажите статус по заказу',
      'Привет! Нужна помощь по заказу',
      'Добрый вечер. Хочу уточнить информацию по заказу',
      'Здравствуйте! Не пришло уведомление по заказу'
    ];
    const follow = [
      'Пока ничего не изменилось.',
      'Сейчас нахожусь в пункте выдачи.',
      'Приложил(а) скриншот, посмотрите.',
      'Если нужно — могу прислать ещё данные.',
      'В приложении файл, там подробности.'
    ];
    const thanks = [ 'Спасибо!', 'Благодарю за оперативность!', 'Отлично, жду.', 'Спасибо, буду ждать обновления.', 'Супер, благодарю.' ];
    const botReplies = [
      'Здравствуйте! Я виртуальный помощник, сейчас уточню детали.',
      'Проверяю информацию, это может занять минуту…',
      'Секунду, собираю данные по вашему запросу.',
      'Уточняю статусы доставки — сообщу как только узнаю.'
    ];
    const opReplies = [
      'Добрый день! Сейчас посмотрю информацию по вашему заказу.',
      'Принял запрос, проверяю у логистики.',
      'Перепроверяю статусы в системе, минутку.',
      'Занёс запрос в очередь, скоро вернусь с ответом.'
    ];

    const now = Date.now();
    let inlineImageCount = 0;
    let fileCount = 0;
    for(const dlg of MOCK_DIALOGS){
      const seed = dlg.id * 13;
      const pick = (arr, sOff=0) => arr[(seed + sOff) % arr.length];
      const t = (mins) => new Date(now - mins*60000).toISOString();
      const agentAuthor = dlg.origin === 'bot' ? 'bot' : 'operator';
      const batch = [
        { id:`m${dlg.id}a`, dialogId:dlg.id, author:'client', text:pick(intro), createdAt:t(120+dlg.id), status:'sent' },
        // Сообщение агента с демонстрацией ДВУХ типов вложений (фиксировано для первых нескольких диалогов)
        { id:`m${dlg.id}b`, dialogId:dlg.id, author:agentAuthor, text:pick(agentAuthor==='bot'?botReplies:opReplies,1), createdAt:t(118+dlg.id), status:'sent', attachments: (dlg.id <= 3) ? [
          { id:`f${dlg.id}img1`, name:`preview-${dlg.id}.png`, size:'120 KB', contentType:'image/png', url:'https://picsum.photos/seed/inline'+dlg.id+'/300/180', displayHint:'inline-image' },
          { id:`f${dlg.id}file1`, name:`report-${dlg.id}.pdf`, size:'256 KB', contentType:'application/pdf', displayHint:'file' }
        ] : undefined },
        { id:`m${dlg.id}c`, dialogId:dlg.id, author:'client', text:pick(follow,2), createdAt:t(90+dlg.id), status:'sent' },
        { id:`m${dlg.id}d`, dialogId:dlg.id, author:agentAuthor, text:'Передаю дальше, уточняю детали…', createdAt:t(70+dlg.id), status:'sent' },
        { id:`m${dlg.id}e`, dialogId:dlg.id, author:'client', text:pick(thanks,3), createdAt:t(10+dlg.id), status:'sent' }
      ];
      // Дополнительное сообщение только с inline-image для каждого пятого диалога
      if(dlg.id % 5 === 0){
        batch.splice(3,0,{ id:`m${dlg.id}imgOnly`, dialogId:dlg.id, author:agentAuthor, text:'Вот изображение по вашему вопросу.', createdAt:t(80+dlg.id), status:'sent', attachments:[{ id:`f${dlg.id}imgOnly`, name:`photo-${dlg.id}.jpg`, size:'200 KB', contentType:'image/jpeg', url:'https://picsum.photos/seed/photo'+dlg.id+'/240/160', displayHint:'inline-image' }] });
      }
      // Дополнительное сообщение только с file вложением для каждого третьего диалога (если ещё нет файла в предыдущей вставке)
      if(dlg.id % 3 === 0){
        batch.splice(4,0,{ id:`m${dlg.id}fileOnly`, dialogId:dlg.id, author:agentAuthor, text:'Прикрепляю файл с деталями.', createdAt:t(75+dlg.id), status:'sent', attachments:[{ id:`f${dlg.id}fileOnly`, name:`details-${dlg.id}.xlsx`, size:'512 KB', contentType:'application/vnd.ms-excel', displayHint:'file' }] });
      }
      // Подсчёт статистики по вложениям
      for(const m of batch){
        if(Array.isArray(m.attachments)){
          for(const a of m.attachments){
            const v = a.displayHint || (a.contentType && a.contentType.startsWith('image/')) ? 'inline-image' : 'file';
            // Используем нашу классификацию для точности
            const variant = (a.displayHint) ? a.displayHint : (a.contentType && a.contentType.startsWith('image/') ? 'inline-image':'file');
            if(variant === 'inline-image') inlineImageCount++; else fileCount++;
          }
        }
      }
      MessageStore.ingestBatch(dlg.id, batch, { position:'append' });
    }
    console.log('[seedDemoMessages] Attachments summary:', { inlineImage: inlineImageCount, file: fileCount });
  }

  /* ====== Утилиты ======
     Мелкие вспомогательные функции без побочных эффектов.
  */
  function paginate(items, page, size) {
    const start = (page - 1) * size;
    return items.slice(start, start + size);
  }

  function setAriaExpanded(el, isExpanded) {
    if (!el) return;
    el.setAttribute('aria-expanded', String(isExpanded));
  }

  function setAriaHidden(el, isHidden) {
    if (!el) return;
    el.setAttribute('aria-hidden', String(isHidden));
  }

  /* ====== Image Preview Modal ======
     Ленивая инициализация: создаём один экземпляр и переиспользуем.
     Особенности:
       - Закрытие по ESC, клику на оверлей, кнопке крестика.
       - Trap focus внутри модалки (два интерактивных элемента).
       - Кнопка скачивания использует download и прямую ссылку.
  */
  const ImagePreviewModal = (() => {
    let overlay = null;
    let btnClose = null;
    let btnDownload = null;
    let imgEl = null;
    let fileNameEl = null;
    let previouslyFocused = null;

    function ensureDom(){
      if(overlay) return;
      overlay = document.createElement('div');
      overlay.className = 'image-modal__overlay';
      overlay.setAttribute('role','dialog');
      overlay.setAttribute('aria-modal','true');
      overlay.innerHTML = `\n        <div class="image-modal">\n          <button type="button" class="image-modal__close" aria-label="Закрыть предпросмотр">\n            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>\n          </button>\n          <div class="image-modal__img-wrap">\n            <img class="image-modal__img" alt="" />\n          </div>\n          <div class="image-modal__bottom">\n            <div class="image-modal__filename" id="imageModalFilename"></div>\n            <a class="image-modal__download" id="imageModalDownload" target="_blank" rel="noopener" download>\n              <img class="image-modal__download-icon" src="images/download.svg" alt="" aria-hidden="true" />\n              <span>Скачать</span>\n            </a>\n          </div>\n        </div>`;
      btnClose = overlay.querySelector('.image-modal__close');
      btnDownload = overlay.querySelector('#imageModalDownload');
      imgEl = overlay.querySelector('.image-modal__img');
      fileNameEl = overlay.querySelector('#imageModalFilename');

      overlay.addEventListener('click', (e)=>{ if(e.target === overlay) close(); });
      btnClose.addEventListener('click', close);
      document.addEventListener('keydown', onKeydown);
    }

    function onKeydown(e){
      if(!overlay || !overlay.isConnected) return;
      if(e.key === 'Escape'){
        e.preventDefault();
        close();
      } else if(e.key === 'Tab'){
        const focusables = [btnClose, btnDownload];
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
      }
    }

    function open({ url, name }){
      ensureDom();
      previouslyFocused = document.activeElement;
      imgEl.src = url;
      imgEl.alt = name || '';
      fileNameEl.textContent = name || '';
      btnDownload.setAttribute('href', url);
      if(name) btnDownload.setAttribute('download', name); else btnDownload.removeAttribute('download');
      document.body.appendChild(overlay);
      requestAnimationFrame(()=>btnClose.focus());
    }

    function close(){
      if(!overlay) return;
      if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if(previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
    }

    return { open, close };
  })();

  /* ====== Рендер ======
     Перерисовывает список текущей страницы. Подписки на события — ниже.
  */
  /**
   * Рендерит текущую страницу списка диалогов на основе state.currentPage/state.pageSize.
   * Обновляет пагинационные контролы и счётчик.
   * Побочные эффекты: изменяет DOM внутри списка и элементов управления.
   */
  function renderList() {
    const totalPages = Math.max(1, Math.ceil(MOCK_DIALOGS.length / state.pageSize));
    state.currentPage = Math.min(state.currentPage, totalPages);

    dom.list.innerHTML = '';

    const pageItems = paginate(MOCK_DIALOGS, state.currentPage, state.pageSize);
    const fragment = document.createDocumentFragment();

    for (const item of pageItems) {
      const li = document.createElement('li');
      li.className = 'dialog';
      li.setAttribute('role', 'option');
      li.setAttribute('tabindex', '0');
      li.dataset.id = String(item.id);
      li.setAttribute('aria-selected', String(state.selectedId === item.id));

      const badge = buildOriginBadge(item.origin);

      li.innerHTML = `
        <div class="dialog__body">
          <div class="dialog__top">
            <span class="dialog__name">${item.name}</span>
            <span class="${badge.className}" aria-label="${badge.label}">${badge.iconSvg}${badge.label}</span>
          </div>
          <div class="dialog__row">
            <div class="dialog__time">${item.time}</div>
            <span class="dialog__timer" data-visible="false" hidden aria-hidden="true">
              <svg class="dialog__timer-icon" viewBox="0 0 256 256" id="Flat" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="currentColor"><path d="M128,36a92,92,0,1,0,92,92A92.10416,92.10416,0,0,0,128,36Zm0,176a84,84,0,1,1,84-84A84.095,84.095,0,0,1,128,212ZM170.42627,85.57324a4.00106,4.00106,0,0,1,.00049,5.65723l-39.59864,39.59814a4.00009,4.00009,0,0,1-5.65673-5.65722l39.59814-39.59815A4.00091,4.00091,0,0,1,170.42627,85.57324ZM100,8a4.0002,4.0002,0,0,1,4-4h48a4,4,0,0,1,0,8H104A4.0002,4.0002,0,0,1,100,8Z"/></svg>
              <time class="dialog__timer-value" datetime="" aria-label="">00ч</time>
            </span>
          </div>
          <div class="dialog__meta">${item.platform}</div>
        </div>
        <div class="dialog__menu">
          <button class="icon-btn text-muted" title="Меню диалога" aria-label="Меню диалога" aria-haspopup="menu" aria-controls="dialogMenu">
            <svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
            </svg>
          </button>
        </div>
      `;
      fragment.appendChild(li);
    }

    dom.list.appendChild(fragment);

    dom.pageInfo.textContent = `${state.currentPage} из ${totalPages}`;
    const isFirst = state.currentPage <= 1;
    const isLast = state.currentPage >= totalPages;
    dom.btnPrev.disabled = isFirst;
    dom.btnNext.disabled = isLast;
    dom.btnPrev.classList.toggle('btn--disabled', isFirst);
    dom.btnNext.classList.toggle('btn--disabled', isLast);
    dom.totalCounter.textContent = String(MOCK_DIALOGS.length);
  }

  /**
   * Выбирает диалог, обновляет визуальное состояние списка и правую панель.
   * Если открыто контекстное меню, пересобирает его под текущий диалог.
   * @param {number|null} id
   */
  function selectDialog(id) {
    state.selectedId = id;
    for (const node of dom.list.children) {
      node.setAttribute('aria-selected', String(node.dataset.id == String(id)));
    }
    // Если контекстное меню уже открыто во время смены seleção — обновить его содержимое
    if (dom.dialogMenu && dom.dialogMenu.getAttribute('aria-hidden') === 'false') {
      if (!dialogMenuAnchorBtn) {
        const currentLi = dom.list.querySelector(`.dialog[data-id="${String(id)}"]`);
        if (currentLi) dialogMenuAnchorBtn = currentLi.querySelector('.dialog__menu .icon-btn');
      }
      renderDialogMenuForDialog(id);
      positionDialogMenu();
    }
    // Показ/скрытие правой панели
    if (dom.chatPanel && dom.workspaceEmpty) {
      if (id != null) {
        dom.chatPanel.hidden = false;
        dom.workspaceEmpty.hidden = true;
        // Найти данные выбранного диалога
  const data = getDialogById(id);
        if (data) {
          dom.chatUser.textContent = data.name;
          // meta: платформа + UID (условно формируем UID на базе id для примера)
          dom.chatMeta.textContent = `${data.platform} • UID ${String(500000 + data.id)}`;
          if (dom.chatBadge) {
            const badge = buildOriginBadge(data.origin);
            dom.chatBadge.className = badge.className;
            dom.chatBadge.innerHTML = `${badge.iconSvg}${badge.label}`;
          }
          // Обновить футер под выбранный диалог
          renderChatFooterForDialog(data);
          // Отрисовать сообщения для выбранного диалога
          renderMessagesForDialog(data.id);
        }
      } else {
        dom.chatPanel.hidden = true;
        dom.workspaceEmpty.hidden = false;
        if (dom.chatFooter) dom.chatFooter.innerHTML = '';
      }
    }
  }

  /**
   * Формирует данные бейджа происхождения диалога (бот / оператор).
   * Без побочных эффектов. Используется при рендере списка и правой панели.
   * @param {string} origin 'bot' | 'operator'
   * @returns {{className:string,label:string,iconSvg:string,html:string,isBot:boolean}}
   */
  function buildOriginBadge(origin){
    const isBot = origin !== 'operator';
    const className = isBot ? 'badge__bot' : 'badge__person';
    const label = isBot ? 'Нейросеть' : 'Оператор';
    const iconSvg = isBot
      ? `<svg class="dialog__bot-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`
      : `<svg class="dialog__user-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    return { className, label, iconSvg, html: `${iconSvg}${label}`, isBot };
  }

  /**
   * Устанавливает origin диалога и возвращает объект (или null).
   * @param {number} id
   * @param {string} origin 'bot'|'operator'
   */
  function setDialogOrigin(id, origin){
    const dlg = getDialogById(id);
    if (!dlg) return null;
    dlg.origin = origin;
    return dlg;
  }

  /**
   * Обновляет бейдж в списке для конкретного диалога без полного ререндера страницы.
   */
  function updateDialogListBadge(id){
    const li = dom.list && dom.list.querySelector(`li.dialog[data-id="${id}"]`);
    if(!li) return;
    const badgeNode = li.querySelector('.badge__bot, .badge__person');
    if(!badgeNode) return;
    const badge = buildOriginBadge('operator');
    badgeNode.className = badge.className;
    badgeNode.innerHTML = `${badge.iconSvg}${badge.label}`;
  }

  /**
   * Завершает переход с бота на оператора: обновляет данные, список, шапку и футер.
   * source: 'menu' | 'banner'
   */
  function performSwitchToOperator(dialogId, { source } = { source: 'banner' }){
    if (dialogId == null) return;
    const dlg = getDialogById(dialogId);
    if (!dlg || dlg.origin === 'operator') return; // уже оператор — ничего не делаем

    if (source === 'menu') {
      // 1) удалить кнопку из меню (если ещё есть) и закрыть меню ДО изменений UI
      if (dom.dialogMenu) {
        const toOpBtn = dom.dialogMenu.querySelector('[data-action="dlgToOperator"], #dlgToOperator, [id="dlgToOperator"]');
        if (toOpBtn) toOpBtn.remove();
      }
      if (typeof setDialogMenuOpen === 'function') {
        setDialogMenuOpen(false);
      }
    }

    // 2) обновить данные
    setDialogOrigin(dialogId, 'operator');

    // 3) обновить элемент списка (бейдж)
    updateDialogListBadge(dialogId);

    // 4) если открыт именно этот диалог — обновить шапку и футер
    if (state.selectedId === dialogId) {
      const badge = buildOriginBadge('operator');
      if (dom.chatBadge) {
        dom.chatBadge.className = badge.className;
        dom.chatBadge.innerHTML = `${badge.iconSvg}${badge.label}`;
      }
      // Перерисовать футер на composer
      const dlgData = getDialogById(dialogId);
      renderChatFooterForDialog(dlgData);
    }

    console.log('[switch] dialog', dialogId, 'переведён на оператора (source:', source, ')');
  }

  /* ====== Футер чата (динамический) ====== */
  function createAiBanner(dialogId){
    const banner = document.createElement('div');
    banner.className = 'chat__ai-banner';
    banner.setAttribute('role','button');
    banner.setAttribute('tabindex','0');
    banner.setAttribute('aria-pressed','false');
    banner.dataset.dialogId = String(dialogId);
    banner.setAttribute('aria-label','Ответы даёт нейросеть. Нажмите чтобы перевести на ручное управление');
    banner.innerHTML = `<h3 class="chat__ai-banner-title">Ответы даёт нейросеть</h3><p class="chat__ai-banner-subtitle">Нажмите «Перевести на ручное управление», чтобы отвечать вручную</p>`;
    function activate(){
      performSwitchToOperator(dialogId, { source: 'banner' });
      banner.setAttribute('aria-pressed','true');
    }
    banner.addEventListener('click', activate);
    banner.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); activate(); }});
    return banner;
  }

  function createOperatorComposer(){
    const wrapper = document.createElement('div');
    wrapper.className = 'chat__composer-wrapper';
    wrapper.innerHTML = `
      <input type="file" id="fileInput" multiple style="display:none" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" />
      <div class="chat__composer" role="group" aria-label="Отправка сообщения оператором">
        <div class="chat__composer-main">
          <textarea class="chat__input" id="chatInput" placeholder="Введите сообщение... (Enter - отправить, Ctrl+K - шаблоны)" aria-label="Поле ввода сообщения" rows="1"></textarea>
          <div class="chat__composer-actions">
            <button type="button" class="chat__icon-btn" id="btnAttach" title="Прикрепить файл" aria-label="Прикрепить файл">
              <img src="images/attach.svg" alt="" aria-hidden="true" width="20" height="20" />
            </button>
            <button type="button" class="chat__icon-btn" id="btnTemplates" title="Шаблоны (Ctrl+K)" aria-label="Открыть шаблоны (Ctrl+K)">
              <img src="images/templates.svg" alt="" aria-hidden="true" width="20" height="20" />
            </button>
          </div>
        </div>
      </div>
      <div class="chat__pending" id="pendingAttachments" aria-live="polite" aria-label="Вложения к сообщению"></div>
      <div class="chat__composer-bottom">
        <div class="chat__composer-hint" id="chatShortcuts" aria-hidden="false">
          <span class="chat__shortcut-key"><kbd>Enter</kbd> — отправить</span>
          <span class="chat__shortcut-key"><kbd>Ctrl+K</kbd> — шаблоны</span>
        </div>
        <button type="button" class="chat__send-btn" id="btnSend" aria-label="Отправить сообщение">
          <img src="images/send.svg" class="chat__send-btn-icon" alt="" aria-hidden="true" />
          <span>Отправить</span>
        </button>
      </div>
    `;

    // Логика: авто-высота textarea + управление состоянием кнопки отправки
    const textarea = wrapper.querySelector('#chatInput');
    const btnSend = wrapper.querySelector('#btnSend');
    const btnAttach = wrapper.querySelector('#btnAttach');
    const btnTemplates = wrapper.querySelector('#btnTemplates');
    const fileInput = wrapper.querySelector('#fileInput');
    const pendingRoot = wrapper.querySelector('#pendingAttachments');

    // Локальное состояние вложений композера (не попадает в MessageStore до отправки)
    const pending = []; // { id, file, name, sizeBytes, sizeLabel, contentType, url, status, progress, displayHint }
    let pendingCounter = 1;

    function formatBytes(bytes){
      if(bytes == null) return '';
      const thresh = 1024;
      if(bytes < thresh) return bytes + ' B';
      const units = ['KB','MB','GB'];
      let u = -1; let value = bytes;
      do { value /= thresh; ++u; } while(value >= thresh && u < units.length-1);
      return value.toFixed(value < 10 ? 1 : 0) + ' ' + units[u];
    }

    function isLikelyImage(file){
      if(!file) return false;
      if(file.type && file.type.startsWith('image/')) return true;
      return /\.(png|jpe?g|gif|webp|avif)$/i.test(file.name);
    }

    function createPendingModel(file){
      const id = 'p'+(pendingCounter++);
      const url = URL.createObjectURL(file);
      const sizeBytes = file.size;
      return {
        id,
        file,
        name: file.name,
        sizeBytes,
        sizeLabel: formatBytes(sizeBytes),
        contentType: file.type || '',
        url,
        status: 'uploading', // uploading|ready|error
        progress: 0,
        displayHint: undefined,
      };
    }

    function renderPending(){
      if(!pendingRoot) return;
      if(!pending.length){ pendingRoot.innerHTML=''; return; }
      const parts = [];
      for(const att of pending){
        const isImg = isLikelyImage(att.file);
        const variantClass = isImg? 'pending-attach--img':'pending-attach--file';
        const progBar = att.status === 'uploading' ? `<div class="pending-attach__progress"><div class="pending-attach__progress-bar" style="width:${att.progress}%"></div></div>` : '';
        const statusLabel = att.status === 'error' ? '<span class="pending-attach__status pending-attach__status--error">Ошибка</span>' : att.status === 'ready' ? '' : '<span class="pending-attach__status pending-attach__status--spin" aria-label="Загрузка"></span>';
        const removeBtn = `<button type="button" class="pending-attach__remove" data-remove-id="${att.id}" title="Удалить" aria-label="Удалить вложение"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg></button>`;
        let body = '';
        if(isImg){
          body = `<div class="pending-attach__thumb"><img src="${att.url}" alt="" /></div>`;
        } else {
          body = `<div class="pending-attach__icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg></div>`;
        }
        parts.push(`<div class="pending-attach ${variantClass} pending-attach--${att.status}" data-pending-id="${att.id}">
          ${body}
          <div class="pending-attach__info">
            <div class="pending-attach__name" title="${att.name}">${att.name}</div>
            <div class="pending-attach__meta">${att.sizeLabel}</div>
            ${progBar}
          </div>
          ${statusLabel}
          ${removeBtn}
        </div>`);
      }
      pendingRoot.innerHTML = parts.join('');
    }

    function updateSendBtnState(){
      const hasText = textarea.value.trim().length > 0;
      const hasReadyAtt = pending.some(a=>a.status==='ready');
      const uploading = pending.some(a=>a.status==='uploading');
      // Разрешаем отправку если есть текст или хотя бы один готовый аттач
      const enabled = hasText || hasReadyAtt;
      btnSend.disabled = !enabled;
      btnSend.classList.toggle('is-disabled', !enabled);
      btnSend.dataset.uploading = uploading ? 'true':'false';
    }

    function simulateUpload(model){
      // Имитация: скорость ~1000-2000мс
      const totalMs = 1000 + Math.random()*1500;
      const started = performance.now();
      function step(){
        if(model.status !== 'uploading') return; // мог быть удалён
        const elapsed = performance.now() - started;
        model.progress = Math.min(100, Math.round(elapsed / totalMs * 100));
        renderPending();
        updateSendBtnState();
        if(elapsed >= totalMs){
          // 5% шанс ошибки для демонстрации
          if(Math.random() < 0.05){
            model.status = 'error';
            model.progress = 0;
          } else {
            model.status = 'ready';
            model.progress = 100;
            // Определяем displayHint
            if(isLikelyImage(model.file) && model.sizeBytes <= INLINE_IMAGE_MAX_BYTES){
              model.displayHint = 'inline-image';
            } else {
              model.displayHint = 'file';
            }
          }
          renderPending();
          updateSendBtnState();
        } else {
          requestAnimationFrame(step);
        }
      }
      requestAnimationFrame(step);
    }

    function addFiles(list){
      for(const file of list){
        const model = createPendingModel(file);
        pending.push(model);
        simulateUpload(model);
      }
      renderPending();
      updateSendBtnState();
    }

    function removePending(id){
      const idx = pending.findIndex(a=>a.id===id);
      if(idx>=0){
        const [m] = pending.splice(idx,1);
        try{ if(m.url) URL.revokeObjectURL(m.url); }catch(e){}
        renderPending();
        updateSendBtnState();
      }
    }

    pendingRoot.addEventListener('click', (e)=>{
      const btn = e.target.closest('[data-remove-id]');
      if(btn){
        removePending(btn.getAttribute('data-remove-id'));
      }
    });

    function autoResize(){
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 180) + 'px';
    }
    textarea.addEventListener('input', () => {
      autoResize();
      updateSendBtnState();
    });
    autoResize();
    updateSendBtnState();

    btnAttach.addEventListener('click', () => { fileInput.click(); });
    fileInput.addEventListener('change', (e)=>{
      const files = Array.from(e.target.files || []);
      if(files.length){ addFiles(files); }
      fileInput.value=''; // чтобы одно и то же имя файла можно было выбрать повторно
    });
    function triggerTemplates(){ console.log('[TODO] open templates modal/popup'); }
    btnTemplates.addEventListener('click', triggerTemplates);
    btnSend.addEventListener('click', sendMessagePlaceholder);

    function sendMessagePlaceholder(){
      const value = textarea.value.trim();
      const readyAtts = pending.filter(a=>a.status==='ready');
      if(!value && !readyAtts.length){
        console.log('[composer] пустое сообщение без готовых вложений');
        return;
      }
      // Добавление сообщения оператора в текущий диалог
      if(state.selectedId != null){
        const attachments = readyAtts.map(m => ({
          id: 'upl:' + m.id,
            name: m.name,
            size: m.sizeLabel,
            contentType: m.contentType,
            url: m.url,
            downloadUrl: m.url,
            displayHint: m.displayHint
        }));
        addMessage(state.selectedId, { author:'operator', text:value || (attachments.length? '': ''), attachments, createdAt: new Date() });
        // Очистить pending. ВАЖНО: не отзывать objectURL тех вложений, которые мы только что добавили в чат,
        // иначе blob станет недоступным для предпросмотра (модалка откроется пустой).
        const usedUrls = new Set(readyAtts.map(m=>m.url));
        for(const m of pending){
          if(!usedUrls.has(m.url)){
            try{ if(m.url) URL.revokeObjectURL(m.url); }catch(e){}
          }
        }
        pending.length = 0;
        renderPending();
      } else {
        console.warn('[composer] нет выбранного диалога');
      }
      textarea.value='';
      autoResize();
      updateSendBtnState();
    }

    // Горячие клавиши внутри textarea
    textarea.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' && !e.shiftKey){
        e.preventDefault();
        sendMessagePlaceholder();
      } else if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        triggerTemplates();
      }
    });

    // Глобальный Ctrl+K когда фокус в textarea (дублирование логики для надёжности)
    wrapper.addEventListener('keydown', (e)=>{
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
        if(document.activeElement === textarea){
          e.preventDefault();
          triggerTemplates();
        }
      }
    });

    return wrapper;
  }

  function renderChatFooterForDialog(dialogData){
    if (!dom.chatFooter) return;
    dom.chatFooter.innerHTML = '';
    if (!dialogData) return;
    const isBot = dialogData.origin !== 'operator';
    const el = isBot ? createAiBanner(dialogData.id) : createOperatorComposer();
    dom.chatFooter.appendChild(el);
  }

  // Делегирование клика по inline изображениям внутри тела чата
  if(dom.chatBody){
    dom.chatBody.addEventListener('click', (e)=>{
      // Если клик по кнопке скачивания внутри inline image — позволяем скачать и не открываем модалку
      const dlBtn = e.target.closest('.msg-image__download');
      if(dlBtn) return; // браузер выполнит стандартное скачивание
      const fig = e.target.closest && e.target.closest('.msg-image');
      if(!fig || !dom.chatBody.contains(fig)) return;
      const url = fig.getAttribute('data-url');
      const name = fig.getAttribute('data-name') || 'image';
      if(url){
        ImagePreviewModal.open({ url, name });
      }
    });
  }

  /* ====== События: список (делегирование) ====== */
  function onListClick(event) {
    const li = event.target.closest('li.dialog');
    if (!li || !dom.list.contains(li)) return;
    const id = Number(li.dataset.id);
    selectDialog(id);
  }

  function onListKeydown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const li = event.target.closest('li.dialog');
    if (!li || !dom.list.contains(li)) return;
    event.preventDefault();
    const id = Number(li.dataset.id);
    selectDialog(id);
  }

  /* ====== Пагинация ====== */
  function goPrev() {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderList();
    }
  }
  function goNext() {
    const totalPages = Math.max(1, Math.ceil(MOCK_DIALOGS.length / state.pageSize));
    if (state.currentPage < totalPages) {
      state.currentPage++;
      renderList();
    }
  }

  /* ====== Кастомный select ======
     Нативный select остаётся, но скрыт визуально. Видимым управляет .open.
  */
  function setDropdownOpen(isOpen) {
    if (!dom.selectRoot) return;
    dom.selectRoot.classList.toggle('open', isOpen);
    setAriaExpanded(dom.selectRoot, isOpen);
  }

  function onNativeChange(e) {
    const value = e.target.value;
    dom.projectDisplay.textContent = value;
    const options = Array.from(dom.dropdown.querySelectorAll('.select__option'));
    for (const opt of options) {
      const isSelected = opt.dataset.value === value;
      opt.classList.toggle('select__option--selected', isSelected);
      opt.setAttribute('aria-selected', String(isSelected));
    }
    setDropdownOpen(false);
  }

  function onOptionActivate(optEl) {
    const value = optEl.dataset.value;
    dom.projectSelect.value = value;
    dom.projectDisplay.textContent = value;
    const options = Array.from(dom.dropdown.querySelectorAll('.select__option'));
    for (const o of options) o.classList.remove('select__option--selected');
    optEl.classList.add('select__option--selected');
    optEl.setAttribute('aria-selected', 'true');
    setDropdownOpen(false);
    dom.projectSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* ====== Popup menu: проект ======
     Меню открывается у кнопки проекта. Закрытие — по клику вне/ESC.
  */
  function setProjectMenuOpen(isOpen){
    if (!dom.projectMenu || !dom.projectMenuBtn) return;
    setAriaHidden(dom.projectMenu, !isOpen);
    setAriaExpanded(dom.projectMenuBtn, isOpen);
    if (isOpen) positionProjectMenu();
  }

  function positionProjectMenu(){
    if (!dom.projectMenu || !dom.projectMenuBtn) return;
    const container = dom.projectMenuBtn.closest('.sidebar__project');
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const btnRect = dom.projectMenuBtn.getBoundingClientRect();

    // Временно показать для измерения ширины, если скрыто
    const wasHidden = dom.projectMenu.getAttribute('aria-hidden') !== 'false';
    if (wasHidden) {
      dom.projectMenu.style.visibility = 'hidden';
      dom.projectMenu.setAttribute('aria-hidden', 'false');
    }
    const menuWidth = dom.projectMenu.offsetWidth;
    // Привязать правый край меню к правому краю кнопки
    const top = btnRect.bottom - containerRect.top + 6; // отступ 6px
    const left = btnRect.right - containerRect.left - menuWidth;
    dom.projectMenu.style.top = top + 'px';
    dom.projectMenu.style.left = left + 'px';
    dom.projectMenu.style.right = 'auto';
    if (wasHidden) {
      dom.projectMenu.setAttribute('aria-hidden', 'true');
      dom.projectMenu.style.visibility = '';
    }
  }

  /* ====== Контекстное меню диалога ======
     Одно меню создаётся на документ и переиспользуется для всех диалогов.
  */
  const ACTION_IDS = Object.freeze({
    CLOSE_PLUS: 'dlgClosePlus',
    CLOSE_MINUS: 'dlgCloseMinus',
    REQ_PLUS: 'dlgReqPlus',
    REQ_MINUS: 'dlgReqMinus',
    TO_OPERATOR: 'dlgToOperator',
    UNSUBSCRIBE: 'dlgUnsubscribe',
  });

  const MENU_ITEMS = Object.freeze([
    Object.freeze({ icon: 'images/task.svg', label: 'Закрыть тикет (+)', id: ACTION_IDS.CLOSE_PLUS }),
    Object.freeze({ icon: 'images/close.svg', label: 'Закрыть тикет (-)', id: ACTION_IDS.CLOSE_MINUS }),
    Object.freeze({ icon: 'images/time.svg', label: 'Запрос закрытия (+)', id: ACTION_IDS.REQ_PLUS }),
    Object.freeze({ icon: 'images/warning.svg', label: 'Запрос закрытия (-)', id: ACTION_IDS.REQ_MINUS }),
    Object.freeze({ icon: 'images/person.svg', label: 'Перевести на оператора', id: ACTION_IDS.TO_OPERATOR }),
    Object.freeze({ icon: 'images/person-dash.svg', label: 'Отменить подписку', id: ACTION_IDS.UNSUBSCRIBE }),
  ]);

  /* ====== Обработчики действий меню диалога ======
     Каждая функция получает { dialogId, actionId, source }.
     Содержимое пока TODO — здесь будет интеграция (fetch / emit / state update).
     Архитектурный подход: единый диспетчер ACTION_HANDLERS по id кнопки.
  */
  function handleDlgClosePlus(ctx){
    // TODO: Реализовать логику «Закрыть тикет (+)» (позитивное закрытие тикета)
    console.log('[dialog action] ClosePlus', ctx);
  }
  function handleDlgCloseMinus(ctx){
    // TODO: Реализовать логику «Закрыть тикет (-)» (негативное закрытие тикета)
    console.log('[dialog action] CloseMinus', ctx);
  }
  function handleDlgReqPlus(ctx){
    // TODO: Реализовать логику «Запрос закрытия (+)» (инициировать позитивный запрос)
    console.log('[dialog action] ReqClosePlus', ctx);
  }
  function handleDlgReqMinus(ctx){
    // TODO: Реализовать логику «Запрос закрытия (-)» (инициировать негативный запрос)
    console.log('[dialog action] ReqCloseMinus', ctx);
  }
  function handleDlgToOperator(ctx){
    // TODO: Реализовать перевод диалога на живого оператора
      console.log('[dialog action] ToOperator', ctx);
      const { dialogId } = ctx || {};
      performSwitchToOperator(dialogId, { source: 'menu' });
  }
  function handleDlgUnsubscribe(ctx){
    // TODO: Реализовать отмену подписки пользователя на рассылку/уведомления
    console.log('[dialog action] Unsubscribe', ctx);
  }

  const ACTION_HANDLERS = {
    [ACTION_IDS.CLOSE_PLUS]: handleDlgClosePlus,
    [ACTION_IDS.CLOSE_MINUS]: handleDlgCloseMinus,
    [ACTION_IDS.REQ_PLUS]: handleDlgReqPlus,
    [ACTION_IDS.REQ_MINUS]: handleDlgReqMinus,
    [ACTION_IDS.TO_OPERATOR]: handleDlgToOperator,
    [ACTION_IDS.UNSUBSCRIBE]: handleDlgUnsubscribe,
  };

  // === Ленивая инициализация контейнера меню диалога ===
  function ensureDialogMenuContainer(){
    if (dom.dialogMenu) return dom.dialogMenu;
    const el = document.createElement('div');
    el.className = 'popup-menu';
    el.id = 'dialogMenu';
    el.setAttribute('role', 'menu');
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    // Делегирование кликов по пунктам меню
    el.addEventListener('click', (ev) => {
      if (el.getAttribute('aria-hidden') === 'true') return;
      const itemBtn = ev.target.closest('.popup-menu__item');
      if (!itemBtn) return;
      ev.stopPropagation();
      const dialogId = getCurrentDialogIdByAnchor();
      const actionId = itemBtn.id;
      const handler = ACTION_HANDLERS[actionId];
      const context = { dialogId, actionId, source: 'dialogMenu' };
      if (typeof handler === 'function') {
        try { handler(context); } catch(err){ console.error('[dialog action error]', actionId, err); }
      } else {
        console.warn('[dialog action] Нет обработчика для', actionId, context);
      }
      setDialogMenuOpen(false);
      if (dialogMenuAnchorBtn) dialogMenuAnchorBtn.focus();
    });
    dom.dialogMenu = el;
    return el;
  }

  // Пересобирает пункты меню для конкретного диалога (фильтрация на этапе компоновки)
  /**
   * Пересобирает HTML контекстного меню для заданного dialogId.
   * Фильтрует пункт перевода на оператора, если origin уже operator.
   * @param {number|null} dialogId
   */
  function renderDialogMenuForDialog(dialogId){
    const menuEl = ensureDialogMenuContainer();
  const data = dialogId != null ? getDialogById(dialogId) : null;
    const filtered = MENU_ITEMS.filter(item => {
      if (item.id === ACTION_IDS.TO_OPERATOR && data && data.origin === 'operator') return false;
      return true;
    });
    menuEl.innerHTML = filtered.map(item => {
  const isTransfer = item.id === ACTION_IDS.TO_OPERATOR;
      const iconHtml = isTransfer
        ? `<svg class="popup-menu__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`
        : `<img class="popup-menu__icon" src="${item.icon}" alt="" aria-hidden="true" />`;
      return `<button class="popup-menu__item" role="menuitem" id="${item.id}">${iconHtml}<span class="popup-menu__label">${item.label}</span></button>`;
    }).join('');
  }

  function getCurrentDialogIdByAnchor(){
    if (!dialogMenuAnchorBtn) return null;
    const li = dialogMenuAnchorBtn.closest('li.dialog');
    return li ? Number(li.dataset.id) : null;
  }
  /**
   * Открывает/закрывает контекстное меню диалога. При открытии пересобирает содержимое.
   * @param {boolean} isOpen
   */
  function setDialogMenuOpen(isOpen){
    if (isOpen){
      const dialogId = getCurrentDialogIdByAnchor() ?? state.selectedId ?? null;
      renderDialogMenuForDialog(dialogId);
      setAriaHidden(dom.dialogMenu, false);
      positionDialogMenu();
    } else if (dom.dialogMenu) {
      setAriaHidden(dom.dialogMenu, true);
    }
  }

  /**
   * Позиционирует контекстное меню относительно кнопки-анкера.
   */
  function positionDialogMenu(){
    if (!dialogMenuAnchorBtn || !dom.dialogMenu) return;
    const btnRect = dialogMenuAnchorBtn.getBoundingClientRect();
    dom.dialogMenu.style.position = 'fixed';
    const top = Math.round(btnRect.bottom + 6);
    const menuWidth = dom.dialogMenu.offsetWidth || 0;
    let left = Math.round(btnRect.right - menuWidth);
    if (left < 8) left = 8; // небольшой отступ от края
    dom.dialogMenu.style.top = top + 'px';
    dom.dialogMenu.style.left = left + 'px';
    dom.dialogMenu.style.right = 'auto';
  }

  /* ====== Инициализация ======
     Точка входа: рендер, подписки, подготовка меню.
  */
  function init() {
    // Рендер начальной страницы
    renderList();
    // Состояние правой панели по умолчанию
    if (dom.chatPanel) dom.chatPanel.hidden = true;

    // Демо-сообщения
    seedDemoMessages();

  // Контекстное меню диалога создаётся лениво при первом открытии (ensureDialogMenuContainer)

    // Список: делегирование
    dom.list.addEventListener('click', (event) => {
      // клик по кнопке меню в элементе списка
      const menuBtn = event.target.closest('.dialog__menu .icon-btn');
      if (menuBtn) {
        event.stopPropagation();
        event.preventDefault();
        dialogMenuAnchorBtn = menuBtn;
        const isOpen = dom.dialogMenu && dom.dialogMenu.getAttribute('aria-hidden') === 'false';
        setDialogMenuOpen(!isOpen);
        return;
      }
      onListClick(event);
    });
    dom.list.addEventListener('keydown', onListKeydown);

    // Пагинация
    dom.btnPrev.addEventListener('click', goPrev);
    dom.btnNext.addEventListener('click', goNext);

    // Select: клик по всему контейнеру открывает список (кроме самого dropdown)
    dom.selectRoot.addEventListener('click', (e) => {
      if (dom.dropdown.contains(e.target)) return;
      setDropdownOpen(true);
    });
    dom.projectSelect.addEventListener('focus', () => setDropdownOpen(true));
    dom.projectSelect.addEventListener('blur', () => setDropdownOpen(false));
    dom.projectSelect.addEventListener('change', onNativeChange);

    dom.dropdown.querySelectorAll('.select__option').forEach((opt) => {
      opt.setAttribute('role', 'option');
      opt.addEventListener('click', () => onOptionActivate(opt));
      opt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOptionActivate(opt);
        }
      });
    });

    // Глобальные обработчики
    document.addEventListener('click', (e) => {
      if (!dom.selectRoot.contains(e.target)) setDropdownOpen(false);
      if (dom.projectMenu && dom.projectMenuBtn) {
        if (!dom.projectMenu.contains(e.target) && !dom.projectMenuBtn.contains(e.target)) {
          setProjectMenuOpen(false);
        }
      }
      if (dom.dialogMenu && dialogMenuAnchorBtn) {
        if (!dom.dialogMenu.contains(e.target) && !dialogMenuAnchorBtn.contains(e.target)) {
          setDialogMenuOpen(false);
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        setProjectMenuOpen(false);
        setDialogMenuOpen(false);
      }
    });

    // Logout
    dom.logout.addEventListener('click', () => {
      // TODO: интегрировать реальный logout
      console.log('Logout clicked');
    });

    // Футер будет наполняться при выборе диалога (selectDialog -> renderChatFooterForDialog)

    // Popup menu (проект)
    dom.projectMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dom.projectMenu.getAttribute('aria-hidden') === 'false';
      setProjectMenuOpen(!isOpen);
    });
    // Закрывать меню проекта после выбора пункта
    if (dom.projectMenu) {
      dom.projectMenu.addEventListener('click', (e) => {
        const item = e.target.closest('.popup-menu__item');
        if (!item) return;
        // Логика обработки действия пункта (пока только лог)
        console.log('Project menu action:', item.id || '(no-id)');
        setProjectMenuOpen(false);
        // Убираем фокус с пункта, чтобы не оставалось визуального состояния
        if (document.activeElement === item) item.blur();
      });
    }
    window.addEventListener('resize', () => {
      if (dom.projectMenu.getAttribute('aria-hidden') === 'false') positionProjectMenu();
      if (dom.dialogMenu && dom.dialogMenu.getAttribute('aria-hidden') === 'false') positionDialogMenu();
    });
    window.addEventListener('scroll', () => {
      if (dom.projectMenu.getAttribute('aria-hidden') === 'false') positionProjectMenu();
      if (dom.dialogMenu && dom.dialogMenu.getAttribute('aria-hidden') === 'false') positionDialogMenu();
    }, true);

    // (listener кликов меню добавляется при создании контейнера)

    // Экспорт обработчиков наружу (опционально для будущих модулей/тестов)
    window.app = window.app || {};
    window.app.dialogActions = ACTION_HANDLERS;
  }

  // === helper: безопасно обновляет таймер внутри li ===
  // Методы работы с таймером доступны через window.app.dialogs.* для интеграции.
  function _getTimerNodeForLi(li) {
    return li.querySelector('.dialog__timer');
  }

  function setDialogTimer(id, valueString, { datetime = null, show = true } = {}) {
    const li = dom.list.querySelector(`.dialog[data-id="${String(id)}"]`);
    if (!li) return false;
    const timer = _getTimerNodeForLi(li);
    if (!timer) return false;

    const timeEl = timer.querySelector('.dialog__timer-value');
    timeEl.textContent = String(valueString);
    if (datetime) timeEl.setAttribute('datetime', datetime);
    timeEl.setAttribute('aria-label', `${String(valueString)} (таймер)`);

    if (show) showDialogTimer(id);
    return true;
  }

  function showDialogTimer(id) {
    const li = dom.list.querySelector(`.dialog[data-id="${String(id)}"]`);
    if (!li) return false;
    const timer = _getTimerNodeForLi(li);
    if (!timer) return false;
    timer.hidden = false;
    timer.dataset.visible = 'true';
    timer.setAttribute('aria-hidden', 'false');
    return true;
  }

  function hideDialogTimer(id) {
    const li = dom.list.querySelector(`.dialog[data-id="${String(id)}"]`);
    if (!li) return false;
    const timer = _getTimerNodeForLi(li);
    if (!timer) return false;
    timer.hidden = true;
    timer.dataset.visible = 'false';
    timer.setAttribute('aria-hidden', 'true');
    return true;
  }

  /**
   * Возвращает объект диалога по id или null.
   * @param {number|null} id
   * @returns {{id:number,name:string,time:string,platform:string,origin:string}|null}
   */
  function getDialogById(id){
    if (id == null) return null;
    return MOCK_DIALOGS.find(d => d.id === id) || null;
  }

  // Экспорт API для использования из консоли/других модулей
  const dialogsApi = { setDialogTimer, showDialogTimer, hideDialogTimer };
  window.app = window.app || {};
  window.app.dialogs = dialogsApi;
  // Удобные глобальные алиасы (для отладки)
  window.setDialogTimer = setDialogTimer;
  window.showDialogTimer = showDialogTimer;
  window.hideDialogTimer = hideDialogTimer;

  // Старт
  init();
})();