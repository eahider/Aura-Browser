// Aura Browser - Internationalization (i18n) Module
// Complete dictionary for Russian and English languages (Developer/Native Minimalist)

const TRANSLATIONS = {
  ru: {
    // Top Bar & Controls
    new_tab: "Новая вкладка",
    new_tab_title: "Новая вкладка (Ctrl+T)",
    ram_saved: "сэкономлено ОЗУ",
    minimize: "Свернуть",
    maximize: "Развернуть",
    close: "Закрыть",
    back_title: "Назад (Alt+Left)",
    forward_title: "Вперёд (Alt+Right)",
    reload_title: "Перезагрузить (Ctrl+R)",
    home_title: "Главная страница",
    search_placeholder: "Поиск в Интернете или ввод адреса...",
    privacy_shield_title: "Защита приватности Aura",
    bookmark_this_page: "Добавить в закладки (Ctrl+D)",
    vpn_tor_button: "VPN / Tor",
    passwords_btn_title: "Хранилище паролей и логинов (Ctrl+Shift+L)",
    bookmarks_btn_title: "Закладки (Ctrl+B)",
    history_btn_title: "История просмотров (Ctrl+H)",
    clear_data_btn_title: "Очистить куки, кэш и следы в 1 клик",
    settings_btn_title: "Настройки браузера",
    sleep_badge: "Сон",
    loading: "Загрузка...",

    // Privacy Shield Modal
    shield_title: "Щит приватности Aura",
    trackers_blocked: "Заблокировано трекеров и аналитики",
    block_trackers_toggle: "Блокировать трекеры и рекламу",
    strip_utm_toggle: "Срезать UTM-метки и телеметрию из URL",
    blocked_on_page: "ЗАБЛОКИРОВАНО НА ЭТОЙ СТРАНИЦЕ",
    no_trackers: "На этой странице трекеров не обнаружено",

    // RAM Optimizer Modal
    ram_title: "Оптимизация оперативной памяти",
    ram_saved_val: "ОЗУ сэкономлено",
    sleeping_tabs_val: "Спящих вкладок",
    auto_sleep_text: "Авто-сон неактивных вкладок",
    after_5_min: "Через 5 минут",
    sleep_all_now_btn: "Перевести фоновые вкладки в спящий режим",

    // Bookmarks Modal
    bookmarks_title: "Закладки",
    no_bookmarks: "Пока нет сохранённых закладок",

    // History Modal
    history_title: "История просмотров",
    clear_history_btn: "Очистить",
    no_history: "История посещений пуста",

    // Settings Modal
    settings_title: "Настройки браузера",
    language_label: "Язык интерфейса / Language",
    search_engine_label: "Поисковая система",
    sleep_timeout_label: "Таймаут усыпления вкладок",
    sleep_2_min: "2 минуты (Максимальная экономия)",
    sleep_5_min: "5 минут (Рекомендуется)",
    sleep_15_min: "15 минут",
    sleep_disabled: "Отключено",
    tor_startup_label: "Режим Tor при запуске браузера",
    tor_ask: "Спрашивать при каждом запуске",
    tor_always: "Всегда запускать в режиме Tor",
    tor_never: "Стандартный режим (Tor выключен)",
    clear_on_exit_label: "Очищать кэш и куки при выходе",

    // Passwords Modal & Banner
    passwords_title: "Сохранённые логины и пароли",
    passwords_search: "Поиск по доменам и логинам...",
    no_passwords: "Нет сохранённых паролей",
    save_password_prompt: "Сохранить пароль для",
    save_btn: "Сохранить",
    dismiss_btn: "Отклонить",
    copy_username: "Копировать логин",
    copy_password: "Копировать пароль",
    delete: "Удалить",

    // VPN & Tor Modal
    vpn_modal_title: "Aura VPN и Tor Shield",
    vpn_direct_status: "Прямое подключение (Без защиты)",
    vpn_active_status: "Защищено через VPN",
    tor_active_status: "Анонимно через Tor Onion",
    tab_vpn: "VPN / Прокси",
    tab_tor: "Сеть Tor",
    select_location: "Выберите сервер:",
    servers_list_title: "Серверы",
    btn_ping_all: "Пинг",
    btn_ping_all_title: "Замерить задержку до серверов",
    btn_refresh_servers: "Обновить",
    btn_refresh_servers_title: "Обновить серверы из подписки",
    pinging: "Замер...",
    updating_sub: "Обновление...",
    sub_servers_count: "серверов",
    sub_updated_prefix: "Обновлено:",
    sub_expire_prefix: "Осталось:",
    sub_traffic_prefix: "Трафик:",
    sub_days_unit: "д",
    add_another_subscription: "+ Сменить подписку",
    delete_sub_confirm: "Вы уверены, что хотите удалить эту подписку?",
    sub_updated_toast: "Подписка успешно обновлена!",
    add_subscription_btn: "+ Добавить подписку на VPN",
    sub_input_placeholder: "Вставьте ссылку на подписку или VLESS/VMess/SS/SOCKS5...",
    load_servers_btn: "Загрузить серверы",
    connect_vpn_btn: "Подключить VPN",
    connecting: "Подключение...",
    tor_info: "<strong>Маршрутизация Tor Onion</strong> шифрует трафик через 3 узла, предотвращает утечки WebRTC и открывает сайты .onion.",
    tor_bridges_title: "Мосты Tor (Обход блокировок)",
    tor_bridges_bot_btn: "Получить мосты в @GetBridgesBot",
    tor_bridges_desc: "Если провайдер блокирует стандартное подключение к Tor, запросите персональные мосты у бота в Telegram.",
    tor_btn_obfs4: "obfs4 мосты",
    tor_btn_webtunnel: "webtunnel мосты",
    tor_bridges_placeholder: "Вставьте строки мостов от @GetBridgesBot (например: obfs4 192.0.2.1:443 ... или webtunnel ...)",
    tor_save_bridges_btn: "Сохранить мосты",
    tor_use_bridges_label: "Использовать мосты для подключения",
    tor_bridges_configured: "Настроено мостов:",
    tor_bridges_none: "Мосты не настроены (прямое подключение)",
    tor_port_status: "Статус локального Tor:",
    tor_port_running: "Служба Tor активна и готова к работе",
    tor_port_not_found: "Служба Tor не обнаружена на порту 9050/9150",
    tor_port_label: "Порт Tor SOCKS5",
    connect_tor_btn: "Подключиться через Tor",
    disconnect_btn: "Отключить прокси",

    // Smart Bypass & Scope
    smart_bypass_title: "Обход блокировок (YouTube, Discord, Telegram) - Только браузер",
    smart_bypass_btn: "Обход: Выкл",
    smart_bypass_active: "Обход: ВКЛ",
    smart_bypass_inactive: "Обход: Выкл",
    vpn_scope_label: "Область действия:",
    scope_browser: "Только браузер",
    scope_system: "Весь ПК (Система)",
    scope_browser_hint: "Прокси активен только внутри Aura Browser. Внешние программы ПК работают напрямую.",
    scope_system_hint: "Системный прокси Windows: весь трафик ПК (игры, клиенты, приложения) идет через прокси.",
    bypass_modal_title: "Встроенный обход блокировок",
    bypass_inactive: "Обход: Не активен",
    bypass_active: "Обход: Активен (Внутри браузера)",
    bypass_scope_label: "Режим: Только внутри браузера",
    bypass_scope_note: "Работает строго внутри браузера. Трафик остального ПК не затрагивается.",
    bypass_services_title: "РАЗБЛОКИРОВАННЫЕ СЕРВИСЫ",
    bypass_direct_text: "Банки, Госуслуги, VK и Яндекс работают напрямую на максимальной скорости.",

    // Startup Tor Modal
    launch_tor_title: "Приватный режим Tor",
    launch_tor_question: "Запустить браузер в режиме Tor?",
    launch_tor_desc: "Маршрутизация всего трафика через зашифрованные Onion-узлы с блокировкой утечек WebRTC и доступом к сайтам .onion.",
    enable_tor_btn: "Включить Tor",
    continue_normal_btn: "Продолжить в обычном режиме",
    remember_choice: "Запомнить мой выбор",

    // Wipe Data Prompt
    wipe_confirm: "Полностью стереть весь локальный кэш, куки, сессии и историю?",
    wipe_success: "Кэш, файлы cookie и данные сессии успешно очищены."
  },

  en: {
    // Top Bar & Controls
    new_tab: "New Tab",
    new_tab_title: "New Tab (Ctrl+T)",
    ram_saved: "RAM saved",
    minimize: "Minimize",
    maximize: "Maximize",
    close: "Close",
    back_title: "Back (Alt+Left)",
    forward_title: "Forward (Alt+Right)",
    reload_title: "Reload (Ctrl+R)",
    home_title: "Home",
    search_placeholder: "Search the web or enter address...",
    privacy_shield_title: "Aura Privacy Shield",
    bookmark_this_page: "Bookmark this page (Ctrl+D)",
    vpn_tor_button: "VPN / Tor",
    passwords_btn_title: "Passwords & Logins Vault (Ctrl+Shift+L)",
    bookmarks_btn_title: "Bookmarks (Ctrl+B)",
    history_btn_title: "Browsing History (Ctrl+H)",
    clear_data_btn_title: "Wipe Cookies, Cache & Telemetry in 1-click",
    settings_btn_title: "Browser Settings",
    sleep_badge: "Sleep",
    loading: "Loading...",

    // Privacy Shield Modal
    shield_title: "Aura Privacy Shield",
    trackers_blocked: "Trackers & Telemetry Blocked",
    block_trackers_toggle: "Block Trackers & Ads",
    strip_utm_toggle: "Strip Tracking URL Params (UTM)",
    blocked_on_page: "BLOCKED ON THIS PAGE",
    no_trackers: "No trackers detected on this page",

    // RAM Optimizer Modal
    ram_title: "RAM Optimizer",
    ram_saved_val: "RAM Saved",
    sleeping_tabs_val: "Sleeping Tabs",
    auto_sleep_text: "Auto-sleep inactive tabs",
    after_5_min: "After 5 minutes",
    sleep_all_now_btn: "Hibernate Background Tabs Now",

    // Bookmarks Modal
    bookmarks_title: "Bookmarks",
    no_bookmarks: "No bookmarks yet",

    // History Modal
    history_title: "Browsing History",
    clear_history_btn: "Clear",
    no_history: "No history recorded",

    // Settings Modal
    settings_title: "Browser Settings",
    language_label: "Language / Язык интерфейса",
    search_engine_label: "Search Engine",
    sleep_timeout_label: "Tab Sleep Timeout",
    sleep_2_min: "2 minutes (Aggressive RAM save)",
    sleep_5_min: "5 minutes (Recommended)",
    sleep_15_min: "15 minutes",
    sleep_disabled: "Disabled",
    tor_startup_label: "Tor Mode on Startup",
    tor_ask: "Ask on browser launch",
    tor_always: "Always launch in Tor mode",
    tor_never: "Standard mode (Tor disabled)",
    clear_on_exit_label: "Clear cache & cookies on exit",

    // Passwords Modal & Banner
    passwords_title: "Saved Passwords & Logins",
    passwords_search: "Search saved logins...",
    no_passwords: "No saved passwords found",
    save_password_prompt: "Save password for",
    save_btn: "Save",
    dismiss_btn: "Dismiss",
    copy_username: "Copy Username",
    copy_password: "Copy Password",
    delete: "Delete",

    // VPN & Tor Modal
    vpn_modal_title: "Aura VPN & Tor Shield",
    vpn_direct_status: "Direct (Unprotected)",
    vpn_active_status: "Protected via VPN",
    tor_active_status: "Anonymous via Tor Onion",
    tab_vpn: "VPN / Proxy",
    tab_tor: "Tor Network",
    select_location: "Select Server Location:",
    servers_list_title: "Servers",
    btn_ping_all: "Ping",
    btn_ping_all_title: "Test latency to all servers",
    btn_refresh_servers: "Refresh",
    btn_refresh_servers_title: "Refresh servers from subscription",
    pinging: "Pinging...",
    updating_sub: "Updating...",
    sub_servers_count: "servers",
    sub_updated_prefix: "Updated:",
    sub_expire_prefix: "Left:",
    sub_traffic_prefix: "Traffic:",
    sub_days_unit: "d",
    add_another_subscription: "+ Change subscription",
    delete_sub_confirm: "Are you sure you want to delete this subscription?",
    sub_updated_toast: "Subscription successfully updated!",
    add_subscription_btn: "+ Add VPN Subscription",
    sub_input_placeholder: "Paste subscription URL or VLESS/VMess/SS/SOCKS5...",
    load_servers_btn: "Load Servers",
    connect_vpn_btn: "Connect VPN",
    connecting: "Connecting...",
    tor_info: "<strong>Tor Onion Routing</strong> routes traffic through 3 encrypted hops, eliminates WebRTC leaks and allows opening .onion sites.",
    tor_bridges_title: "Tor Bridges (Circumvention)",
    tor_bridges_bot_btn: "Get Bridges from @GetBridgesBot",
    tor_bridges_desc: "If your ISP blocks direct Tor relays, request personal bridges from the official Telegram bot.",
    tor_btn_obfs4: "obfs4 bridges",
    tor_btn_webtunnel: "webtunnel bridges",
    tor_bridges_placeholder: "Paste bridge lines from @GetBridgesBot (e.g. obfs4 192.0.2.1:443 ... or webtunnel ...)",
    tor_save_bridges_btn: "Save Bridges",
    tor_use_bridges_label: "Use bridges for connection",
    tor_bridges_configured: "Bridges configured:",
    tor_bridges_none: "No bridges configured (direct connection)",
    tor_port_status: "Local Tor daemon status:",
    tor_port_running: "Tor daemon detected and ready",
    tor_port_not_found: "Tor daemon not detected on port 9050/9150",
    tor_port_label: "Tor SOCKS5 Port",
    connect_tor_btn: "Connect via Tor",
    disconnect_btn: "Disconnect",

    // Smart Bypass & Scope
    smart_bypass_title: "Smart Circumvention (YouTube, Discord, Telegram) - Inside Browser Only",
    smart_bypass_btn: "Bypass: Off",
    smart_bypass_active: "Bypass: ON",
    smart_bypass_inactive: "Bypass: Off",
    vpn_scope_label: "Routing Scope:",
    scope_browser: "Browser Only",
    scope_system: "Whole PC (System)",
    scope_browser_hint: "Proxy applies strictly inside Aura Browser. External PC apps connect directly.",
    scope_system_hint: "Windows system-wide proxy: all PC traffic (games, clients, apps) routes through proxy.",
    bypass_modal_title: "Built-in Circumvention",
    bypass_inactive: "Bypass: Inactive",
    bypass_active: "Bypass: Active (Browser Only)",
    bypass_scope_label: "Scope: Inside Browser Only",
    bypass_scope_note: "Operates strictly inside Aura Browser. Rest of the PC is untouched.",
    bypass_services_title: "UNBLOCKED SERVICES",
    bypass_direct_text: "Local services, banks and domestic sites connect directly at full speed.",

    // Startup Tor Modal
    launch_tor_title: "Tor Private Mode",
    launch_tor_question: "Launch in Tor Mode?",
    launch_tor_desc: "Route all traffic through encrypted Onion relays with full WebRTC leak prevention and access to .onion sites.",
    enable_tor_btn: "Enable Tor",
    continue_normal_btn: "Continue Standard",
    remember_choice: "Remember my choice",

    // Wipe Data Prompt
    wipe_confirm: "Wipe all local cache, cookies, session storage and history?",
    wipe_success: "Browser cache, cookies and telemetry traces wiped completely."
  }
};

let currentLang = 'ru';

function setAppLanguage(lang) {
  if (lang === 'ru' || lang === 'en') {
    currentLang = lang;
  }
  return currentLang;
}

function getAppLanguage() {
  return currentLang;
}

function t(key) {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.ru;
  return dict[key] || TRANSLATIONS.en[key] || key;
}

function applyTranslationsToDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.innerHTML = t(key);
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.setAttribute('title', t(key));
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.setAttribute('placeholder', t(key));
  });
}

if (typeof window !== 'undefined') {
  window.TRANSLATIONS = TRANSLATIONS;
  window.setAppLanguage = setAppLanguage;
  window.getAppLanguage = getAppLanguage;
  window.t = t;
  window.applyTranslationsToDOM = applyTranslationsToDOM;
}

if (typeof module !== 'undefined') {
  module.exports = { TRANSLATIONS, setAppLanguage, getAppLanguage, t, applyTranslationsToDOM };
}
