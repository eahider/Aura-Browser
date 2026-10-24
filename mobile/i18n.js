// Aura Browser Mobile - Internationalization (i18n) Module
// Russian and English translations for Android & iOS

export const TRANSLATIONS = {
  ru: {
    // App Header & Omnibox
    search_placeholder: "Поиск в Интернете или URL...",
    shield_blocked_label: "заблокировано",
    new_tab: "Новая вкладка",
    tabs_count: "вкладок",
    close: "Закрыть",
    done: "Готово",
    cancel: "Отмена",
    save: "Сохранить",
    delete: "Удалить",
    copy: "Копировать",
    copied: "Скопировано в буфер!",

    // Bottom Navigation Bar
    nav_back: "Назад",
    nav_forward: "Вперед",
    nav_home: "Домой",
    nav_tabs: "Вкладки",
    nav_menu: "Меню",

    // New Tab / Start Page
    aura_title: "Aura Mobile",
    aura_tagline: "Приватный браузер без телеметрии и слежки",
    shield_status_active: "Щит приватности активен",
    trackers_blocked_total: "Заблокировано трекеров за всё время",
    open_tabs: "Открытые вкладки",
    quick_shortcuts: "Быстрый доступ",
    speed_dial_ddg: "DuckDuckGo",
    speed_dial_github: "GitHub",
    speed_dial_wiki: "Wikipedia",
    speed_dial_tg: "Telegram",
    speed_dial_reddit: "Reddit",
    speed_dial_proton: "Proton",

    // Tabs Switcher
    tabs_overview_title: "Вкладки",
    btn_new_tab: "+ Новая вкладка",
    btn_close_all: "Закрыть все",
    no_tabs_msg: "Нет открытых вкладок",
    tab_memory_freed: "Память освобождена",

    // Privacy Shield Modal
    shield_modal_title: "Щит приватности Aura",
    shield_active_desc: "Блокирует аналитику, счетчики, веб-маяки и рекламные скрипты O(1).",
    toggle_block_trackers: "Блокировать трекеры и аналитику",
    toggle_strip_utm: "Срезать шпионские UTM-метки из URL",
    shield_stats_page: "Заблокировано на этой странице:",
    shield_stats_total: "Всего заблокировано:",
    shield_recent_blocked: "НЕДАВНО ЗАБЛОКИРОВАННЫЕ ЗАПРОСЫ",
    shield_no_trackers: "На текущей странице слежка не обнаружена.",
    btn_wipe_data: "Очистить все локальные данные и кэш",
    wipe_success: "История, кэш и данные очищены!",

    // Passwords Vault
    passwords_title: "Менеджер паролей",
    passwords_search_placeholder: "Поиск по сайтам и логинам...",
    no_passwords: "Нет сохранённых паролей",
    btn_add_password: "+ Добавить пароль",
    label_domain: "Сайт / Домен",
    label_username: "Логин / Email",
    label_password: "Пароль",
    password_saved: "Пароль сохранён",
    password_deleted: "Пароль удалён",

    // VPN & Proxy Modal
    vpn_modal_title: "Прокси & VPN",
    proxy_mode_direct: "Прямое (Без прокси)",
    proxy_mode_vpn: "Прокси / VPN",
    proxy_mode_tor: "Tor SOCKS5",
    proxy_active_status: "Подключено к прокси",
    proxy_direct_status: "Прямое подключение к сети",
    select_server: "Выберите сервер:",
    btn_import_sub: "+ Импортировать подписку",
    sub_placeholder: "Вставьте ссылку подписки или VLESS / VMess / SOCKS5 / SS...",
    btn_parse_sub: "Загрузить конфигурацию",
    sub_success: "Серверы успешно импортированы!",
    sub_error: "Ошибка импорта подписки",

    // History & Bookmarks
    history_title: "История просмотров",
    bookmarks_title: "Закладки",
    btn_add_bookmark: "В закладки",
    no_history: "История посещений пуста",
    no_bookmarks: "Закладок пока нет",
    btn_clear_history: "Очистить историю",
    bookmark_added: "Страница добавлена в закладки",

    // Settings Modal
    settings_title: "Настройки Aura",
    setting_language: "Язык интерфейса",
    setting_search_engine: "Поисковая система",
    setting_clear_exit: "Очищать историю при закрытии",
    app_version: "Версия: 1.2.6 (Mobile Edition)",
    engine_ddg: "DuckDuckGo (Приватно)",
    engine_brave: "Brave Search",
    engine_google: "Google",
    engine_yandex: "Yandex"
  },
  en: {
    // App Header & Omnibox
    search_placeholder: "Search the web or enter URL...",
    shield_blocked_label: "blocked",
    new_tab: "New Tab",
    tabs_count: "tabs",
    close: "Close",
    done: "Done",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    copy: "Copy",
    copied: "Copied to clipboard!",

    // Bottom Navigation Bar
    nav_back: "Back",
    nav_forward: "Forward",
    nav_home: "Home",
    nav_tabs: "Tabs",
    nav_menu: "Menu",

    // New Tab / Start Page
    aura_title: "Aura Mobile",
    aura_tagline: "Zero telemetry minimalist privacy browser",
    shield_status_active: "Privacy Shield Active",
    trackers_blocked_total: "Total trackers blocked all time",
    open_tabs: "Open Tabs",
    quick_shortcuts: "Quick Shortcuts",
    speed_dial_ddg: "DuckDuckGo",
    speed_dial_github: "GitHub",
    speed_dial_wiki: "Wikipedia",
    speed_dial_tg: "Telegram",
    speed_dial_reddit: "Reddit",
    speed_dial_proton: "Proton",

    // Tabs Switcher
    tabs_overview_title: "Tabs",
    btn_new_tab: "+ New Tab",
    btn_close_all: "Close All",
    no_tabs_msg: "No tabs open",
    tab_memory_freed: "Memory freed",

    // Privacy Shield Modal
    shield_modal_title: "Aura Privacy Shield",
    shield_active_desc: "Blocks telemetry, analytics, beacons, and tracking scripts with O(1) performance.",
    toggle_block_trackers: "Block Trackers & Analytics",
    toggle_strip_utm: "Strip UTM & Telemetry URL Tags",
    shield_stats_page: "Blocked on this page:",
    shield_stats_total: "Total blocked:",
    shield_recent_blocked: "RECENTLY BLOCKED REQUESTS",
    shield_no_trackers: "No trackers detected on this page.",
    btn_wipe_data: "Wipe all local data and cache",
    wipe_success: "History, cache, and cookies wiped!",

    // Passwords Vault
    passwords_title: "Password Vault",
    passwords_search_placeholder: "Search domains and logins...",
    no_passwords: "No saved passwords",
    btn_add_password: "+ Add Password",
    label_domain: "Website / Domain",
    label_username: "Username / Email",
    label_password: "Password",
    password_saved: "Password saved",
    password_deleted: "Password deleted",

    // VPN & Proxy Modal
    vpn_modal_title: "Proxy & VPN",
    proxy_mode_direct: "Direct (No Proxy)",
    proxy_mode_vpn: "Proxy / VPN",
    proxy_mode_tor: "Tor SOCKS5",
    proxy_active_status: "Routing through proxy",
    proxy_direct_status: "Direct connection",
    select_server: "Select Server:",
    btn_import_sub: "+ Import Subscription",
    sub_placeholder: "Paste subscription URL or VLESS / VMess / SOCKS5 / SS...",
    btn_parse_sub: "Load Configuration",
    sub_success: "Servers imported successfully!",
    sub_error: "Subscription import failed",

    // History & Bookmarks
    history_title: "Browsing History",
    bookmarks_title: "Bookmarks",
    btn_add_bookmark: "Bookmark Page",
    no_history: "No browsing history",
    no_bookmarks: "No bookmarks saved",
    btn_clear_history: "Clear History",
    bookmark_added: "Page bookmarked",

    // Settings Modal
    settings_title: "Aura Settings",
    setting_language: "Interface Language",
    setting_search_engine: "Search Engine",
    setting_clear_exit: "Clear history on exit",
    app_version: "Version: 1.2.6 (Mobile Edition)",
    engine_ddg: "DuckDuckGo (Privacy)",
    engine_brave: "Brave Search",
    engine_google: "Google",
    engine_yandex: "Yandex"
  }
};

export class MobileI18n {
  constructor(defaultLang = 'ru') {
    this.lang = localStorage.getItem('aura_mobile_lang') || defaultLang;
  }

  setLanguage(lang) {
    if (TRANSLATIONS[lang]) {
      this.lang = lang;
      localStorage.setItem('aura_mobile_lang', lang);
      this.applyTranslations();
    }
  }

  t(key) {
    return (TRANSLATIONS[this.lang] && TRANSLATIONS[this.lang][key]) || 
           (TRANSLATIONS['en'] && TRANSLATIONS['en'][key]) || 
           key;
  }

  applyTranslations(container = document) {
    container.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });

    container.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.setAttribute('placeholder', this.t(key));
    });

    container.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.setAttribute('title', this.t(key));
    });
  }
}
