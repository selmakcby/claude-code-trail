// Trail i18n — minimal, CSP-safe, dependency-free
// Default English, Turkish as alternative

const STORAGE_KEY = "trail-lang";
const DEFAULT_LANG = "en";

const TRANSLATIONS = {
  en: {
    // Topbar
    brand_tagline: "See · Learn · Manage Claude Code",
    project_switch_title: "Switch project",
    project_search: "search…",
    project_count: (n) => `${n} projects`,

    // Tabs
    tab_notes: "Notes",
    tab_files: "Files",
    tab_trail: "Trail",
    tab_memory: "Memory",
    tab_agents: "Agents",
    tab_history: "History",
    tab_guide: "Guide",

    tab_notes_hint: "Quick notes — auto-save to vault/notlar/",
    tab_files_hint: "Project files — markdown render & edit",
    tab_trail_hint: "Claude's path in the active session",
    tab_memory_hint: "How Claude remembers you",
    tab_agents_hint: "Project + global agents & usage",
    tab_history_hint: "All Claude Code sessions",
    tab_guide_hint: "Learn Claude Code from scratch — 7 lessons",

    // Welcome overlay
    welcome_title: "Welcome to Trail",
    welcome_sub: "<b>See</b>, <b>learn</b>, <b>manage</b> Claude Code — 7 tabs.<br/><span style=\"font-size:11px;color:var(--text-3)\">Have multiple projects? Switch from the picker top-left.</span>",
    welcome_meta: "fully local · no LLM call · <code>127.0.0.1</code>-only",
    welcome_cta_start: "Start with the Guide →",
    welcome_cta_skip: "skip, go to Files",
    welcome_tab_notes_desc: "quick notes — auto-save to <code>notlar/</code>, <kbd>⌘N</kbd> for new",
    welcome_tab_files_desc: "project files — markdown render & edit, <code>.env</code> masked",
    welcome_tab_trail_desc: "active session — which files Claude touched, in what order",
    welcome_tab_memory_desc: "how Claude remembers you — cards by 4 types",
    welcome_tab_agents_desc: "project + global agents, usage frequency, system prompt",
    welcome_tab_history_desc: "all Claude Code sessions, with message-level replay",
    welcome_tab_guide_desc: "vault / skill / agent / memory / trail lessons — start here if new",

    // Statusbar
    status_ready: "ready",
    status_loading: "loading…",
    status_server_down: "⚠ server down — reconnecting…",
    status_connected: "connected",
    btn_guide_help: "guide",
    btn_auto_refresh: "auto refresh",
    btn_auto_refresh_tooltip: "Refresh active tab every 10s silently (so Claude's changes show up automatically)",

    // Themes
    theme_dark: "Dark",
    theme_cream: "Cream",
    theme_term: "Term",

    // Generic
    btn_cancel: "Cancel",
    btn_save: "Save",
    btn_save_kbd: "Save (⏎)",
    btn_delete: "Delete",
    btn_new: "New",
    btn_retry: "try again",
    btn_all: "all",

    // Memory tab
    memory_title: "Memory",
    memory_page_sub: "How Claude remembers you — 4 types: <b>user</b> (who you are), <b>feedback</b> (your guidance), <b>project</b> (current work), <b>reference</b> (external links).",
    memory_total: (n) => `<b>${n}</b> total · `,
    memory_form_title: "title (required)",
    memory_form_desc: "short description (1 sentence, optional)",
    memory_form_body: "memory body (markdown, optional)\n\nTip: for feedback, add **Why:** and **How to apply:** lines.",
    memory_form_required_error: "Title required — critical for Claude to find this memory.",
    memory_type_user: "user",
    memory_type_feedback: "feedback",
    memory_type_project: "project",
    memory_type_reference: "reference",
    memory_type_other: "other",
    memory_select_placeholder: "select a memory",
    memory_select_sub: "Click a memory on the left — description, body and metadata appear here.",
    memory_empty_title: "No memory yet for this project",
    memory_empty_sub: "<b>What's memory?</b> Claude saves important things it learned during conversations (who you are, your preferences, project state) as small markdown files. 4 types: user, feedback, project, reference.<br/><br/>Nothing's been saved yet for this project.<br/>Expected folder: <code>{dir}</code>",
    memory_origin_session: "source session:",
    memory_delete_confirm: 'Delete "{title}"?',

    // Files tab
    files_title: "Files",
    files_page_sub: "Project files in 5 categories. <code>.env</code>, key, credential files auto-masked.",
    files_cat_all: "all",
    files_cat_vault: "vault",
    files_cat_code: "code",
    files_cat_agents: "agents",
    files_cat_skills: "skills",
    files_cat_data: "data",
    files_open_label: "open:",
    files_open_placeholder: "— pick a file on the left —",
    files_btn_edit: "edit",
    files_btn_preview: "preview",
    files_btn_save: "save",
    files_placeholder_text: "Files",
    files_placeholder_sub: "Pick a file on the left. Markdown renders, code shows as text, <code>.env</code> appears masked.",

    // Trail tab
    trail_title: "Claude's path",
    trail_page_sub: "In the active session: which files Claude touched, in what order, with which tools.",
    trail_empty_title: "No Claude path in this project yet",
    trail_empty_sub: "<b>What's a path?</b> A chronological record of every file Claude touched — read, write, command, search — in order.<br/><br/>No Claude Code conversation has happened in this project yet. Run <code>claude</code>, send a message, then refresh.",
    trail_pill_active: "active session",
    trail_section_breakdown: "tool breakdown",
    trail_section_heatmap: "file heatmap",
    trail_section_timeline: "path — chronological",
    trail_scrub_label: "rewind time",
    trail_timeline_hint: "Drag the slider left — see Claude's steps from first to now. Current step is highlighted.",

    // Agents tab
    agents_title: "Agents",
    agents_page_sub: "Project + global agents, how often each was used. Filter \"unused\" top-right to clean up.",
    agents_empty_title: "No agents defined",
    agents_empty_sub: "<b>What's an agent?</b> Specialized assistants inside Claude — e.g. <code>code-reviewer</code>, <code>security-reviewer</code>, <code>tdd-guide</code>. Each has its own system prompt and tool permissions.<br/><br/>No agents found in this project (<code>.claude/agents/</code>) or global (<code>~/.claude/agents/</code>).",
    agents_filter_all: "all",
    agents_filter_project: "project",
    agents_filter_global: "global",
    agents_filter_used: "used",
    agents_filter_unused: "unused",
    agents_stat_usage: "usage",
    agents_stat_last: "last:",
    agents_stat_tools: "tools",
    agents_stat_model: "model",
    agents_section_prompt: "system prompt",
    agents_pick_label: "pick an agent",
    agents_pick_sub: "Click an agent on the left — system prompt, tools, usage stats appear here.",

    // Sessions / History tab
    history_title: "History",
    history_page_sub: "Archive of all Claude Code sessions. \"What did we do last week?\" — click a session, view its tool path or full conversation.",
    history_empty_title: "No Claude sessions yet",
    history_empty_sub: "This project has no Claude Code conversations recorded. Run <code>claude</code> in this folder, send a message, then refresh.",
    history_view_path: "Path",
    history_view_conversation: "Conversation",
    history_section_path: "tool path",
    history_stat_tools: "tool calls",
    history_stat_files: "files",
    history_stat_duration: "duration",
    history_stat_model: "model",
    history_first_prompt: "first prompt",

    // Notes tab
    notes_title: "Notes",
    notes_page_sub: "Quick note-taking area. Saved to <code>{dir}/</code> in your vault — visible in Files tab too, included in search. Auto-saves as you type.",
    notes_btn_new: "+ New note",
    notes_search: "search… (title or content)",
    notes_empty_select: "pick a note",
    notes_empty_first: "no notes yet",
    notes_empty_sub_select: "Click a note on the left, or use <b>+ New note</b> above to start.",
    notes_empty_sub_first: "Click <b>+ New note</b> — your first note auto-saves.",
    notes_save_saved: "✓ saved",
    notes_save_saving: "● saving…",
    notes_save_dirty: "● unsaved",
    notes_editor_placeholder: "# Title\n\nStart writing…",
    notes_empty_list_search: "no match for \"{term}\"",
    notes_empty_list: "no notes yet — + New note",
    notes_last: "last:",

    // Guide tab
    guide_title: "Guide",
    guide_page_sub: "{total} lessons · {read} read · Learn Claude Code from scratch — vault, skill, agent, memory, trail, llm-wiki.",
    guide_pick: "pick a lesson",
    guide_pick_sub: "Start anywhere — no need to read in order, jump to what you need.",
    guide_btn_read: "mark as read",
    guide_btn_read_done: "✓ read",
    guide_lesson_loading: "loading lesson…",

    // Common errors
    err_load_fail: "failed to load",
    err_tab_fail: "{tab} tab failed to load",
  },

  tr: {
    brand_tagline: "Claude Code'u gör · öğren · yönet",
    project_switch_title: "Proje seç",
    project_search: "ara…",
    project_count: (n) => `${n} proje`,

    tab_notes: "Notlar",
    tab_files: "Dosyalar",
    tab_trail: "Patika",
    tab_memory: "Bellek",
    tab_agents: "Ajanlar",
    tab_history: "Geçmiş",
    tab_guide: "Kılavuz",

    tab_notes_hint: "Hızlı not — vault/notlar/ altına otomatik kayıt",
    tab_files_hint: "Proje dosyaları — markdown render + edit",
    tab_trail_hint: "Claude'un aktif session'da gezdiği patika",
    tab_memory_hint: "Claude seni nasıl hatırlıyor",
    tab_agents_hint: "Proje + global ajanlar + kullanım istatistikleri",
    tab_history_hint: "Geçmiş tüm Claude session'ları",
    tab_guide_hint: "Claude Code'u sıfırdan öğren — 7 ders",

    welcome_title: "Trail'e hoş geldin",
    welcome_sub: "Claude Code'u <b>gör</b>, <b>öğren</b>, <b>yönet</b> — 7 sekme.<br/><span style=\"font-size:11px;color:var(--text-3)\">Birden fazla projen varsa sol üstteki proje seçiciden geçiş yap.</span>",
    welcome_meta: "tamamen lokal · LLM çağrısı yok · <code>127.0.0.1</code>-only",
    welcome_cta_start: "Kılavuz'dan başla →",
    welcome_cta_skip: "atla, Files'a git",
    welcome_tab_notes_desc: "hızlı not alma — <code>notlar/</code> altına otomatik kayıt, <kbd>⌘N</kbd> ile yeni",
    welcome_tab_files_desc: "proje dosyaları — markdown render + edit, <code>.env</code> mask'lı",
    welcome_tab_trail_desc: "aktif session'da Claude hangi dosyalara hangi sırayla dokundu",
    welcome_tab_memory_desc: "Claude seni nasıl hatırlıyor — 4 type'ta kartlar",
    welcome_tab_agents_desc: "projedeki + global ajanlar, kullanım sıklığı, system prompt",
    welcome_tab_history_desc: "tüm Claude session'larının arşivi, mesaj-bazlı replay",
    welcome_tab_guide_desc: "vault / skill / agent / memory / patika dersleri — yeniyseniz buradan başla",

    status_ready: "hazır",
    status_loading: "yükleniyor…",
    status_server_down: "⚠ sunucu yok — yeniden bağlanılıyor…",
    status_connected: "bağlandı",
    btn_guide_help: "rehber",
    btn_auto_refresh: "otomatik yenile",
    btn_auto_refresh_tooltip: "10sn'de bir aktif sekmeyi sessizce yenile (Claude bir şey yazınca otomatik görünür)",

    theme_dark: "Karanlık",
    theme_cream: "Krem",
    theme_term: "Term",

    btn_cancel: "İptal",
    btn_save: "Kaydet",
    btn_save_kbd: "Kaydet (⏎)",
    btn_delete: "Sil",
    btn_new: "Yeni",
    btn_retry: "tekrar dene",
    btn_all: "tümü",

    memory_title: "Bellek",
    memory_page_sub: "Claude seni nasıl hatırlıyor — 4 tür: <b>kullanıcı</b> (kim olduğun), <b>feedback</b> (verdiğin yönergeler), <b>proje</b> (mevcut iş), <b>referans</b> (dış kaynaklar).",
    memory_total: (n) => `<b>${n}</b> toplam · `,
    memory_form_title: "başlık (zorunlu)",
    memory_form_desc: "kısa açıklama (1 cümle, opsiyonel)",
    memory_form_body: "memory gövdesi (markdown, opsiyonel)\n\nTip: feedback için **Why:** ve **How to apply:** satırları ekle.",
    memory_form_required_error: "Başlık zorunlu — Claude'un bu memory'yi bulması için kritik.",
    memory_type_user: "kullanıcı",
    memory_type_feedback: "feedback",
    memory_type_project: "proje",
    memory_type_reference: "referans",
    memory_type_other: "diğer",
    memory_select_placeholder: "bir memory seç",
    memory_select_sub: "Soldan bir memory'ye tıkla — açıklama, gövde ve metadata burada görünür.",
    memory_empty_title: "Bu projede bellek yok",
    memory_empty_sub: "<b>Bellek nedir?</b> Claude konuşma boyunca öğrendiği önemli şeyleri (sen kimsin, hangi tercihlerin var, proje neyle ilgili) küçük markdown dosyaları olarak saklar. 4 tür var: kullanıcı, feedback, proje, referans.<br/><br/>Bu projede henüz hiçbir şey biriktirilmemiş.<br/>Beklenen klasör: <code>{dir}</code>",
    memory_origin_session: "kaynak session:",
    memory_delete_confirm: '"{title}" silinsin mi?',

    files_title: "Dosyalar",
    files_page_sub: "Proje dosyaları, 5 kategoriye ayrılmış. <code>.env</code>, key, credentials dosyaları otomatik mask'lı.",
    files_cat_all: "tümü",
    files_cat_vault: "vault",
    files_cat_code: "kod",
    files_cat_agents: "ajanlar",
    files_cat_skills: "skills",
    files_cat_data: "veri",
    files_open_label: "açık:",
    files_open_placeholder: "— sol taraftan bir dosya seç —",
    files_btn_edit: "düzenle",
    files_btn_preview: "önizle",
    files_btn_save: "kaydet",
    files_placeholder_text: "Dosyalar",
    files_placeholder_sub: "Sol taraftan dosya seç. Markdown render edilir, kod text görünür, <code>.env</code> mask'lı.",

    trail_title: "Claude'un patikası",
    trail_page_sub: "Aktif session'da Claude hangi dosyalara hangi sırayla dokundu, hangi tool'ları kaç kere çağırdı.",
    trail_empty_title: "Bu projede henüz Claude patikası yok",
    trail_empty_sub: "<b>Patika nedir?</b> Claude'un bu projede dokunduğu dosyaların kronolojik kaydı — hangi dosya okundu, yazıldı, hangi komut çalıştırıldı, sırayla.<br/><br/>Bu projede Claude Code'da henüz hiç mesaj atılmamış. <code>claude</code> komutuyla başla, bir kaç mesaj at, sonra bu sekmeyi yenile.",
    trail_pill_active: "aktif session",
    trail_section_breakdown: "tool dağılımı",
    trail_section_heatmap: "dosya ısı haritası",
    trail_section_timeline: "patika — kronolojik",
    trail_scrub_label: "zamanı geri sar",
    trail_timeline_hint: "Sürgüyü sola çek — Claude'un ilk adımından şu ana kadar adım adım gör. Aktif adım vurgulanır.",

    agents_title: "Ajanlar",
    agents_page_sub: "Bu projedeki + global ajanlar, hangisi ne sıklıkta kullanılmış. Kullanılmayan ajanları temizlemek için sağ üstten filtrele.",
    agents_empty_title: "Henüz ajan tanımlı değil",
    agents_empty_sub: "<b>Ajan nedir?</b> Claude'un içindeki uzmanlaşmış asistanlar — örn. <code>code-reviewer</code>, <code>security-reviewer</code>, <code>tdd-guide</code>. Her ajanın kendi system prompt'u ve tool izinleri var.<br/><br/>Bu projede (<code>.claude/agents/</code>) veya global (<code>~/.claude/agents/</code>) klasörlerinde tanımlı ajan yok.",
    agents_filter_all: "tümü",
    agents_filter_project: "proje",
    agents_filter_global: "global",
    agents_filter_used: "kullanılan",
    agents_filter_unused: "kullanılmayan",
    agents_stat_usage: "kullanım",
    agents_stat_last: "son:",
    agents_stat_tools: "tools",
    agents_stat_model: "model",
    agents_section_prompt: "system prompt",
    agents_pick_label: "ajan seç",
    agents_pick_sub: "Soldan bir ajana tıkla — system prompt, tools, kullanım istatistiği burada.",

    history_title: "Geçmiş",
    history_page_sub: "Tüm Claude Code session'larının arşivi. \"Geçen hafta ne yaptık?\" cevabı burada — bir session'a tıkla, içeride hangi araçları çağırdığını <b>Patika</b>'da, ne konuştuğunu <b>Konuşma</b>'da gör.",
    history_empty_title: "Henüz Claude session'ı yok",
    history_empty_sub: "Bu projede Claude Code ile yapılmış hiç konuşma kaydı bulunmuyor. Terminal'de bu klasörden <code>claude</code> komutuyla başla, bir mesaj at, sonra burayı yenile.",
    history_view_path: "Patika",
    history_view_conversation: "Konuşma",
    history_section_path: "tool patikası",
    history_stat_tools: "tool çağrısı",
    history_stat_files: "dosya",
    history_stat_duration: "süre",
    history_stat_model: "model",
    history_first_prompt: "ilk prompt",

    notes_title: "Notlar",
    notes_page_sub: "Hızlı not alma alanı. Vault klasöründe <code>{dir}/</code> altına kaydedilir — Files sekmesinden de erişilebilir, geçmiş aramaya dahil olur. Yazdıkça otomatik kayıt.",
    notes_btn_new: "+ Yeni not",
    notes_search: "ara… (başlık veya içerik)",
    notes_empty_select: "bir not seç",
    notes_empty_first: "henüz not yok",
    notes_empty_sub_select: "Soldan bir nota tıkla veya üstten <b>+ Yeni not</b> ile başla.",
    notes_empty_sub_first: "Üstten <b>+ Yeni not</b> butonuna bas — ilk notun otomatik kaydedilir.",
    notes_save_saved: "✓ kaydedildi",
    notes_save_saving: "● kaydediliyor…",
    notes_save_dirty: "● değişiklik var",
    notes_editor_placeholder: "# Başlık\n\nBuraya not al…",
    notes_empty_list_search: "\"{term}\" için eşleşme yok",
    notes_empty_list: "henüz not yok — + Yeni not",
    notes_last: "son:",

    guide_title: "Kılavuz",
    guide_page_sub: "{total} ders · {read} okundu · Claude Code'u sıfırdan öğren — vault, skill, agent, memory, patika, llm-wiki stratejisi.",
    guide_pick: "bir ders seç",
    guide_pick_sub: "Soldan başla — sırayla okumana gerek yok, ihtiyaç duyduğun konuya direkt git.",
    guide_btn_read: "okundu olarak işaretle",
    guide_btn_read_done: "✓ okundu",
    guide_lesson_loading: "ders açılıyor…",

    err_load_fail: "yüklenemedi",
    err_tab_fail: "{tab} sekmesi yüklenemedi",
  },
};

let currentLang = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
if (!TRANSLATIONS[currentLang]) currentLang = DEFAULT_LANG;

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (!TRANSLATIONS[lang]) return;
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  applyStaticTranslations();
  document.documentElement.lang = lang;
}

// Translate a key with optional template params {key}
export function t(key, params) {
  const dict = TRANSLATIONS[currentLang] ?? TRANSLATIONS[DEFAULT_LANG];
  const val = dict[key];
  if (typeof val === "function") return val(params);
  if (typeof val !== "string") return key;
  if (!params) return val;
  return val.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? params[k] : `{${k}}`));
}

// Apply translations to all [data-i18n] elements in current DOM
export function applyStaticTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const text = t(key);
    // Allow innerHTML if attribute data-i18n-html is set, otherwise textContent
    if (el.hasAttribute("data-i18n-html")) {
      el.innerHTML = text;
    } else {
      el.textContent = text;
    }
  });
  root.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (key) el.title = t(key);
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) el.placeholder = t(key);
  });
}

export const AVAILABLE_LANGS = [
  { code: "en", label: "EN" },
  { code: "tr", label: "TR" },
];
