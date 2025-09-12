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
    { id: 1, name: 'user_1', time: '10:15', platform: 'Android 13 • ФРИИ 1.3.7' },
    { id: 2, name: 'user_2', time: '09:42', platform: 'iOS 16.7 • ФРИИ 2.8.6' },
    { id: 3, name: 'user_3', time: '08:30', platform: 'Android 12 • ФРИИ 1.2.1' },
    { id: 4, name: 'user_4', time: '07:55', platform: 'iOS 16.9 • ФРИИ 1.6.0' },
    { id: 5, name: 'user_5', time: '07:12', platform: 'Android 11 • ФРИИ 2.4.7' },
    { id: 6, name: 'user_6', time: '06:48', platform: 'iOS 15.4 • ФРИИ 1.1.0' },
    { id: 7, name: 'user_7', time: '06:20', platform: 'Android 13 • ФРИИ 1.3.7' },
    { id: 8, name: 'user_8', time: '05:59', platform: 'iOS 16.8 • ФРИИ 2.4.7' },
    { id: 9, name: 'user_9', time: '05:30', platform: 'Android 10 • ФРИИ 1.0.0' },
    { id: 10, name: 'user_10', time: '05:01', platform: 'iOS 16.7 • ФРИИ 1.6.9' },
    { id: 11, name: 'user_11', time: '04:45', platform: 'Android 13 • ФРИИ 2.8.6' },
    { id: 12, name: 'user_12', time: '04:20', platform: 'iOS 16.9 • ФРИИ 1.6.0' },
    { id: 13, name: 'user_13', time: '03:58', platform: 'Android 12 • ФРИИ 1.2.1' },
    { id: 14, name: 'user_14', time: '03:40', platform: 'iOS 15.4 • ФРИИ 1.1.0' },
    { id: 15, name: 'user_15', time: '03:20', platform: 'Android 11 • ФРИИ 2.4.7' },
    { id: 16, name: 'user_16', time: '03:05', platform: 'iOS 16.7 • ФРИИ 2.8.6' },
    { id: 17, name: 'user_17', time: '02:50', platform: 'Android 13 • ФРИИ 1.3.7' },
    { id: 18, name: 'user_18', time: '02:35', platform: 'iOS 16.8 • ФРИИ 2.4.7' },
    { id: 19, name: 'user_19', time: '02:20', platform: 'Android 10 • ФРИИ 1.0.0' },
    { id: 20, name: 'user_20', time: '02:05', platform: 'iOS 16.7 • ФРИИ 1.6.9' },
    { id: 21, name: 'user_21', time: '01:50', platform: 'Android 13 • ФРИИ 2.8.6' },
    { id: 22, name: 'user_22', time: '01:35', platform: 'iOS 16.9 • ФРИИ 1.6.0' },
    { id: 23, name: 'user_23', time: '01:20', platform: 'Android 12 • ФРИИ 1.2.1' },
    { id: 24, name: 'user_24', time: '01:05', platform: 'iOS 15.4 • ФРИИ 1.1.0' },
    { id: 25, name: 'user_25', time: '00:50', platform: 'Android 11 • ФРИИ 2.4.7' },
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
    projectSelect: document.getElementById('projectSelect'),
    projectDisplay: document.getElementById('projectDisplay'),
    selectRoot: document.querySelector('.select'),
    dropdown: document.getElementById('projectDropdown'),
    logout: document.getElementById('btnLogout'),
    projectMenuBtn: document.getElementById('projectMenuBtn'),
    projectMenu: document.getElementById('projectMenu'),
    dialogMenu: null,
  };

  let dialogMenuAnchorBtn = null; // кнопка-источник для позиционирования меню диалога

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

  /* ====== Рендер ======
     Перерисовывает список текущей страницы. Подписки на события — ниже.
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

      li.innerHTML = `
        <div class="dialog__body">
          <div class="dialog__top">
            <span class="dialog__name">${item.name}</span>
            <span class="badge">
              <img class="dialog__bot-icon" src="images/bot.svg" width="18" height="18" alt="Бот" aria-hidden="true" />
              Нейросеть
            </span>
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

  function selectDialog(id) {
    state.selectedId = id;
    for (const node of dom.list.children) {
      node.setAttribute('aria-selected', String(node.dataset.id == String(id)));
    }
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
  const MENU_ITEMS = [
    { icon: 'images/task.svg', label: 'Закрыть тикет (+)', id: 'dlgClosePlus' },
    { icon: 'images/close.svg', label: 'Закрыть тикет (-)', id: 'dlgCloseMinus' },
    { icon: 'images/time.svg', label: 'Запрос закрытия (+)', id: 'dlgReqPlus' },
    { icon: 'images/warning.svg', label: 'Запрос закрытия (-)', id: 'dlgReqMinus' },
    { icon: 'images/person.svg', label: 'Перевести на оператора', id: 'dlgToOperator' },
    { icon: 'images/person-dash.svg', label: 'Отменить подписку', id: 'dlgUnsubscribe' },
  ];

  function createDialogMenu() {
    const el = document.createElement('div');
    el.className = 'popup-menu';
    el.id = 'dialogMenu';
    el.setAttribute('role', 'menu');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = MENU_ITEMS.map((item) => `
      <button class="popup-menu__item" role="menuitem" id="${item.id}">
        <img class="popup-menu__icon" src="${item.icon}" alt="" aria-hidden="true" />
        <span class="popup-menu__label">${item.label}</span>
      </button>
    `).join('');
    document.body.appendChild(el);
    return el;
  }

  function getCurrentDialogIdByAnchor(){
    if (!dialogMenuAnchorBtn) return null;
    const li = dialogMenuAnchorBtn.closest('li.dialog');
    return li ? Number(li.dataset.id) : null;
  }

  function setDialogMenuOpen(isOpen){
    if (!dom.dialogMenu) return;
    setAriaHidden(dom.dialogMenu, !isOpen);
    if (isOpen) positionDialogMenu();
  }

  function positionDialogMenu(){
    if (!dialogMenuAnchorBtn || !dom.dialogMenu) return;
    const btnRect = dialogMenuAnchorBtn.getBoundingClientRect();
    dom.dialogMenu.style.position = 'fixed';
    const top = Math.round(btnRect.bottom + 6);
    let left = Math.round(btnRect.right - dom.dialogMenu.offsetWidth);
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

    // ====== Контекстное меню диалога (одно на все элементы) ======
    dom.dialogMenu = createDialogMenu();

    // Обработчики пунктов меню
    dom.dialogMenu.addEventListener('click', (ev) => {
      const item = ev.target.closest('.popup-menu__item');
      if (!item) return;
      setDialogMenuOpen(false);
      console.log('Dialog menu action:', item.id, 'for dialogId=', getCurrentDialogIdByAnchor());
    });
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