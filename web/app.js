import { renderNotesTab } from "/tabs/notes.js";
import { renderFilesTab } from "/tabs/files.js";
import { renderTrailTab } from "/tabs/trail.js";
import { renderMemoryTab } from "/tabs/memory.js";
import { renderAgentsTab } from "/tabs/agents.js";
import { renderSessionsTab } from "/tabs/sessions.js";
import { renderGuideTab } from "/tabs/guide.js";
import { applyStaticTranslations, getLang, setLang, t, fmtRelTime } from "/i18n.js";

export { t, getLang, fmtRelTime } from "/i18n.js";

export const STATE = {
  health: null,
  theme: localStorage.getItem("trail-theme") || "soft-dark",
  activeTab: localStorage.getItem("trail-tab") || "files",
  autoRefresh: localStorage.getItem("trail-autorefresh") !== "off",
  serverHealthy: true,
  welcomeSeen: localStorage.getItem("trail-welcome-v1") === "seen",
  activeProject: localStorage.getItem("trail-active-project") || null,
  projects: [],
  defaultVault: null,
};

const TABS = {
  notes: renderNotesTab,
  files: renderFilesTab,
  trail: renderTrailTab,
  memory: renderMemoryTab,
  agents: renderAgentsTab,
  sessions: renderSessionsTab,
  guide: renderGuideTab,
};

const REFRESH_MS = 10_000;

const $ = (sel) => document.querySelector(sel);

export function setStatus(msg) {
  $("#status-msg").textContent = msg;
}

const HUMAN_ERROR_KEYS = {
  "Path outside vault": "err_human_outside_vault",
  "File is readonly (secret-guard)": "err_human_readonly_secret",
  "File not found": "err_human_not_found",
  "This is a directory": "err_human_is_dir",
  "Unknown endpoint": "err_human_unknown_endpoint",
  "session not found": "err_human_session_missing",
  "MEMORY.md cannot be deleted": "err_human_memory_index_protected",
  "invalid file name": "err_human_invalid_filename",
};

function humanizeError(msg) {
  if (HUMAN_ERROR_KEYS[msg]) return t(HUMAN_ERROR_KEYS[msg]);
  if (/^Cannot write to this extension/.test(msg)) return t("err_human_ext_not_allowed");
  if (/too large/i.test(msg)) return t("err_human_too_big");
  return msg;
}

// /api/projects keşif endpoint'i hariç tüm istekler aktif proje query'siyle yapılır
function withActiveProject(path) {
  if (path.startsWith("/api/projects")) return path;
  if (!STATE.activeProject) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}project=${encodeURIComponent(STATE.activeProject)}`;
}

export async function api(path, opts = {}) {
  const url = withActiveProject(path);
  let res;
  try {
    res = await fetch(url, opts);
  } catch (e) {
    setServerHealthy(false);
    throw new Error(t("server_unreachable", e.message));
  }
  setServerHealthy(true);
  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(t("server_unexpected_response", res.status));
  }
  if (!json.success) throw new Error(humanizeError(json.error || t("server_error")));
  return json.data;
}

function setServerHealthy(healthy) {
  if (STATE.serverHealthy === healthy) return;
  STATE.serverHealthy = healthy;
  document.body.classList.toggle("server-down", !healthy);
  if (!healthy) setStatus(t("status_server_down"));
  else setStatus(t("status_connected"));
}

function setTheme(theme) {
  STATE.theme = theme;
  $("#theme-stylesheet").href = `/themes/${theme}.css`;
  document.querySelectorAll(".theme-opt").forEach((btn) => {
    const active = btn.dataset.theme === theme;
    btn.setAttribute("aria-checked", active ? "true" : "false");
  });
  localStorage.setItem("trail-theme", theme);
}

let refreshTimer = null;

function stopRefreshTimer() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function startRefreshTimer() {
  stopRefreshTimer();
  if (!STATE.autoRefresh) return;
  refreshTimer = setInterval(() => {
    if (document.hidden) return;
    if (!STATE.serverHealthy) return;
    // Yeniden render (sessizce, status değiştirmeden)
    renderCurrentTab(true);
  }, REFRESH_MS);
}

function setAutoRefresh(on) {
  STATE.autoRefresh = on;
  localStorage.setItem("trail-autorefresh", on ? "on" : "off");
  const btn = $("#refresh-toggle");
  btn.classList.toggle("on", on);
  btn.title = on ? t("auto_refresh_on", REFRESH_MS / 1000) : t("auto_refresh_off");
  if (on) startRefreshTimer(); else stopRefreshTimer();
}

async function renderCurrentTab(silent = false) {
  const tab = STATE.activeTab;
  if (!TABS[tab]) return;
  const container = $("#tab-content");
  if (!silent) container.innerHTML = `<div class="loading">${escapeHtml(t("status_loading"))}</div>`;
  try {
    await TABS[tab](container, { silent });
  } catch (e) {
    container.innerHTML = `<div class="error-panel">
      <div class="error-title">${escapeHtml(t("err_tab_fail", { tab }))}</div>
      <div class="error-detail">${escapeHtml(e.message)}</div>
      <button class="btn btn-primary" id="retry-btn" style="margin-top:14px;">${escapeHtml(t("btn_retry"))}</button>
    </div>`;
    const retry = container.querySelector("#retry-btn");
    if (retry) retry.addEventListener("click", () => showTab(tab));
    if (!silent) setStatus(t("status_error", e.message));
  }
}

async function showTab(tab) {
  if (!TABS[tab]) tab = "files";
  STATE.activeTab = tab;
  localStorage.setItem("trail-tab", tab);
  document.querySelectorAll(".tab").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  await renderCurrentTab(false);
  startRefreshTimer();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

function setupWelcome() {
  const overlay = $("#welcome");
  const closeAndGo = (goToGuide) => {
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    localStorage.setItem("trail-welcome-v1", "seen");
    STATE.welcomeSeen = true;
    if (goToGuide) showTab("guide");
  };
  $("#welcome-start").addEventListener("click", () => closeAndGo(true));
  $("#welcome-skip-files").addEventListener("click", () => closeAndGo(false));
  $("#welcome-skip").addEventListener("click", () => closeAndGo(false));
  overlay.querySelector(".welcome-backdrop").addEventListener("click", () => closeAndGo(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.classList.contains("hidden")) closeAndGo(false);
  });

  // Statusbar "rehber" butonu — welcome'ı tekrar göster
  $("#welcome-reopen").addEventListener("click", () => {
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
  });

  if (!STATE.welcomeSeen) {
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
  }
}

function setupGlobalHotkeys() {
  document.addEventListener("keydown", (e) => {
    // Welcome açıkken hotkey'ler pasif
    const welcome = $("#welcome");
    if (welcome && !welcome.classList.contains("hidden")) return;

    // ⌘N / Ctrl+N → Notlar tab'a geç, yeni not aç
    if ((e.metaKey || e.ctrlKey) && e.key === "n" && !e.shiftKey && !e.altKey) {
      // Sadece textarea/input içinde DEĞİLse hijack
      const tag = e.target?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("trail:new-note"));
      if (STATE.activeTab !== "notes") {
        showTab("notes").then(() => {
          // Tab açılınca event dinleyicisi otomatik tetiklensin
          setTimeout(() => window.dispatchEvent(new CustomEvent("trail:new-note")), 100);
        });
      }
    }

    // ⌘/ veya ?  → karşılama göster
    if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
      const tag = e.target?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      e.preventDefault();
      $("#welcome-reopen")?.click();
    }
  });
}

function shortPath(p) {
  if (!p) return "";
  const home = "/Users/" + (p.split("/")[2] || "");
  return p.startsWith(home) ? "~" + p.slice(home.length) : p;
}

async function loadProjects() {
  try {
    const data = await fetch("/api/projects").then((r) => r.json()).then((j) => j.data);
    STATE.projects = data.projects;
    STATE.defaultVault = data.defaultVault;

    // URL'de ?project=... varsa (örn. start.sh açtığı tab) onu önceliklendir
    const urlParams = new URLSearchParams(window.location.search);
    const urlProject = urlParams.get("project");

    if (urlProject) {
      const validVaults = new Set([data.defaultVault, ...data.projects.filter((p) => p.vaultExists).map((p) => p.vaultDir)]);
      if (validVaults.has(urlProject)) {
        STATE.activeProject = urlProject;
      }
      // URL'i temizle ki refresh sonrası persisted localStorage kullanılsın
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (!STATE.activeProject) {
      STATE.activeProject = data.defaultVault;
    }

    // Eğer aktif proje artık discovered değilse, default'a düş
    const validVaults = new Set([data.defaultVault, ...data.projects.filter((p) => p.vaultExists).map((p) => p.vaultDir)]);
    if (!validVaults.has(STATE.activeProject)) {
      STATE.activeProject = data.defaultVault;
    }
    persistActiveProject();
    renderProjectSwitcher();
  } catch (e) {
    console.error("projeler yüklenemedi:", e);
  }
}

function persistActiveProject() {
  if (STATE.activeProject) localStorage.setItem("trail-active-project", STATE.activeProject);
}

function renderProjectSwitcher() {
  const name = $("#project-active-name");
  const current = STATE.projects.find((p) => p.vaultDir === STATE.activeProject);
  name.textContent = current?.displayName || (STATE.activeProject ? shortPath(STATE.activeProject) : "?");
  $("#project-count").textContent = t("project_count", STATE.projects.filter((p) => p.vaultExists).length);

  const list = $("#project-list");
  const term = ($("#project-search")?.value || "").toLowerCase();
  const filtered = STATE.projects.filter((p) =>
    !term || p.displayName.toLowerCase().includes(term) || p.vaultDir.toLowerCase().includes(term),
  );

  list.innerHTML = filtered.map((p) => {
    const active = p.vaultDir === STATE.activeProject;
    const cls = ["project-opt"];
    if (active) cls.push("active");
    if (!p.vaultExists) cls.push("missing");
    const subtitle = p.vaultExists ? shortPath(p.vaultDir) : `${shortPath(p.vaultDir)} ${t("project_missing_dir")}`;
    return `
      <button class="${cls.join(" ")}" data-vault="${escapeHtml(p.vaultDir)}" ${!p.vaultExists ? "disabled" : ""}>
        <div class="project-opt-main">
          <span class="project-opt-name">${escapeHtml(p.displayName)}</span>
          ${active ? '<span class="project-opt-check">✓</span>' : ""}
        </div>
        <div class="project-opt-sub">
          <span class="project-opt-path">${escapeHtml(subtitle)}</span>
          <span class="project-opt-stats">${p.sessionCount}s · ${formatRelTime(p.lastActivityMs)}</span>
        </div>
      </button>
    `;
  }).join("");

  if (filtered.length === 0) {
    list.innerHTML = `<div class="project-empty">${escapeHtml(t("project_no_match"))}</div>`;
  }

  list.querySelectorAll(".project-opt[data-vault]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      switchProject(btn.dataset.vault);
    });
  });
}

function formatRelTime(ms) {
  return fmtRelTime(ms, "short");
}

async function switchProject(vaultDir) {
  if (vaultDir === STATE.activeProject) {
    closeProjectMenu();
    return;
  }
  STATE.activeProject = vaultDir;
  persistActiveProject();
  closeProjectMenu();
  renderProjectSwitcher();
  setStatus(t("project_changed", vaultDir));
  // Mevcut sekmeyi yeniden yükle (cache reset)
  try {
    STATE.health = await api("/api/health");
    $("#vault-path").textContent = STATE.health.vault;
  } catch { /* ignore */ }
  await renderCurrentTab(false);
}

function setupProjectSwitcher() {
  const trigger = $("#project-trigger");
  const menu = $("#project-menu");
  const search = $("#project-search");

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = !menu.classList.contains("hidden");
    if (open) closeProjectMenu();
    else openProjectMenu();
  });

  document.addEventListener("click", (e) => {
    if (!menu.classList.contains("hidden") && !menu.contains(e.target) && e.target !== trigger) {
      closeProjectMenu();
    }
  });

  search.addEventListener("input", renderProjectSwitcher);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.classList.contains("hidden")) {
      closeProjectMenu();
    }
  });
}

function openProjectMenu() {
  $("#project-menu").classList.remove("hidden");
  $("#project-trigger").setAttribute("aria-expanded", "true");
  $("#project-search").value = "";
  renderProjectSwitcher();
  setTimeout(() => $("#project-search").focus(), 50);
}

function closeProjectMenu() {
  $("#project-menu").classList.add("hidden");
  $("#project-trigger").setAttribute("aria-expanded", "false");
}

function setupLangSwitch() {
  const lang = getLang();
  document.documentElement.lang = lang;
  applyStaticTranslations();
  document.querySelectorAll(".lang-opt").forEach((btn) => {
    btn.setAttribute("aria-checked", btn.dataset.lang === lang ? "true" : "false");
    btn.addEventListener("click", () => {
      setLang(btn.dataset.lang);
      document.querySelectorAll(".lang-opt").forEach((b) => {
        b.setAttribute("aria-checked", b.dataset.lang === btn.dataset.lang ? "true" : "false");
      });
      // Re-render mevcut tab (içerikteki string'leri tazele)
      renderCurrentTab(false);
      // Topbar metinleri (project count, vs.)
      renderProjectSwitcher();
    });
  });
}

async function init() {
  setupLangSwitch();
  setTheme(STATE.theme);
  document.querySelectorAll(".theme-opt").forEach((btn) => {
    btn.addEventListener("click", () => setTheme(btn.dataset.theme));
  });
  $("#refresh-toggle").addEventListener("click", () => setAutoRefresh(!STATE.autoRefresh));
  setAutoRefresh(STATE.autoRefresh);
  setupWelcome();
  setupGlobalHotkeys();
  setupProjectSwitcher();

  document.querySelectorAll(".tab").forEach((b) => {
    b.addEventListener("click", () => showTab(b.dataset.tab));
  });

  // Periyodik health check (server düşmüş mü)
  setInterval(async () => {
    try {
      await fetch("/api/health");
      setServerHealthy(true);
    } catch {
      setServerHealthy(false);
    }
  }, 5000);

  // Projeleri yükle (active project'i de set eder)
  await loadProjects();

  try {
    STATE.health = await api("/api/health");
    $("#vault-path").textContent = STATE.health.vault;
    setStatus(t("status_connected_short"));
  } catch (e) {
    setStatus(t("status_server_missing", e.message));
  }
  showTab(STATE.activeTab);
}

init();
