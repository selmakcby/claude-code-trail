import { api, setStatus, t, getLang } from "/app.js";
import { renderMarkdown } from "/markdown.js";

const TOOL_GLYPH = {
  Read: "→", Edit: "✎", Write: "✎", MultiEdit: "✎", NotebookEdit: "✎",
  Bash: "$", Grep: "?", Glob: "*", Agent: "◈",
  WebFetch: "↗", WebSearch: "⌕", TodoWrite: "✓", Other: "·",
};

const TOOL_LABELS = {
  en: {
    Read: "read", Edit: "edit", Write: "write",
    MultiEdit: "multi-edit", NotebookEdit: "notebook",
    Bash: "command", Grep: "search text", Glob: "search files",
    Agent: "subagent", WebFetch: "web fetch", WebSearch: "web search",
    TodoWrite: "tasks", Other: "other",
  },
  tr: {
    Read: "okuma", Edit: "düzenleme", Write: "yazma",
    MultiEdit: "çoklu düzenleme", NotebookEdit: "notebook",
    Bash: "komut", Grep: "metin arama", Glob: "dosya arama",
    Agent: "alt ajan", WebFetch: "web indirme", WebSearch: "web arama",
    TodoWrite: "görev planı", Other: "diğer",
  },
};

function toolLabel(tool) {
  const lang = getLang();
  return (TOOL_LABELS[lang] || TOOL_LABELS.en)[tool] || tool.toLowerCase();
}

let LOCAL = null;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return iso; }
}

function fmtTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  } catch { return ""; }
}

function fmtDuration(start, end) {
  if (!start || !end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) {
    return getLang() === "tr" ? `${m}dk` : `${m}m`;
  }
  const h = Math.floor(m / 60);
  return getLang() === "tr" ? `${h}sa${m % 60}dk` : `${h}h${m % 60}m`;
}

export async function renderSessionsTab(container, opts = {}) {
  const silent = opts.silent === true;
  const prev = LOCAL;

  if (!silent) setStatus(t("history_loading"));
  const sessions = await api("/api/sessions");
  // Preserve selection + view + caches across silent re-renders so the
  // auto-refresh (every 10s) doesn't bounce the user back to the placeholder.
  LOCAL = {
    sessions,
    selectedId: prev?.selectedId ?? null,
    view: prev?.view ?? "patika",
    detailCache: prev?.detailCache ?? new Map(),
    convCache: prev?.convCache ?? new Map(),
  };

  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-mark">◐</div>
        <div class="empty-title">${escapeHtml(t("history_empty_title"))}</div>
        <div class="empty-sub">${t("history_empty_sub")}</div>
      </div>`;
    setStatus(t("history_empty_status"));
    return;
  }

  container.innerHTML = `
    <div class="sessions-page">
      <div class="page-header">
        <h1 class="page-title">${escapeHtml(t("history_title"))}</h1>
        <p class="page-sub">${t("history_page_sub")}</p>
      </div>
      <header class="sessions-header">
        <p class="sessions-sub">${t("history_total", sessions.length)}</p>
      </header>
      <div class="sessions-layout">
        <div class="sessions-list" id="sessions-list"></div>
        <div class="sessions-detail" id="sessions-detail">
          <div class="placeholder">
            <div class="placeholder-mark">◐</div>
            <div class="placeholder-text">${escapeHtml(t("history_select_placeholder"))}</div>
            <div class="placeholder-sub">${t("history_select_sub")}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  renderList();

  // Restore previous selection if still valid
  if (LOCAL.selectedId && sessions.some((s) => s.id === LOCAL.selectedId)) {
    document.querySelectorAll(".session-card").forEach((c) =>
      c.classList.toggle("active", c.dataset.id === LOCAL.selectedId),
    );
    await renderDetail();
  }

  if (!silent) setStatus(t("history_count", sessions.length));
}

function renderList() {
  const list = document.querySelector("#sessions-list");
  list.innerHTML = LOCAL.sessions.map((s) => `
    <div class="session-card" data-id="${escapeHtml(s.id)}">
      <div class="session-card-head">
        <span class="session-card-date">${fmtDate(s.startedAt)}</span>
        <span class="session-card-dur">${fmtDuration(s.startedAt, s.endedAt)}</span>
      </div>
      <div class="session-card-prompt">${escapeHtml((s.firstUserPrompt || "—").slice(0, 110))}</div>
      <div class="session-card-stats">
        <span>${s.userTurnCount} ↔ ${s.assistantTurnCount}</span>
        <span>${s.toolUseCount} tool</span>
        <span class="session-card-models">${s.models.map((m) => m.replace("claude-", "")).join(" ")}</span>
      </div>
    </div>
  `).join("");

  list.querySelectorAll(".session-card").forEach((card) => {
    card.addEventListener("click", () => selectSession(card.dataset.id));
  });
}

async function selectSession(id) {
  LOCAL.selectedId = id;
  document.querySelectorAll(".session-card").forEach((c) =>
    c.classList.toggle("active", c.dataset.id === id),
  );
  await renderDetail();
}

async function renderDetail() {
  const id = LOCAL.selectedId;
  const detail = document.querySelector("#sessions-detail");
  if (!id) return;

  detail.innerHTML = `<div class="loading">${escapeHtml(t("history_detail_loading"))}</div>`;

  let data;
  try {
    if (LOCAL.detailCache.has(id)) data = LOCAL.detailCache.get(id);
    else {
      data = await api(`/api/sessions/${encodeURIComponent(id)}`);
      LOCAL.detailCache.set(id, data);
    }
  } catch (e) {
    detail.innerHTML = `<div class="error-panel"><div class="error-title">${escapeHtml(t("err_load_fail"))}</div><div class="error-detail">${escapeHtml(e.message)}</div></div>`;
    return;
  }

  const breakdownEntries = Object.entries(data.toolBreakdown).sort((a, b) => b[1] - a[1]);

  detail.innerHTML = `
    <div class="session-detail-head">
      <div class="session-detail-id">${escapeHtml(data.id.slice(0, 8))}</div>
      <div class="session-detail-time">${fmtDate(data.startedAt)} → ${fmtDate(data.endedAt)}</div>
    </div>
    ${data.firstUserPrompt ? `
      <div class="session-firstprompt">
        <div class="session-firstprompt-label">${escapeHtml(t("history_first_prompt"))}</div>
        <div class="session-firstprompt-text">${escapeHtml(data.firstUserPrompt)}</div>
      </div>` : ""}
    <div class="session-stats-row">
      <div class="stat-block"><div class="stat-label">${escapeHtml(t("history_stat_tools"))}</div><div class="stat-value">${data.toolUseCount}</div></div>
      <div class="stat-block"><div class="stat-label">${escapeHtml(t("history_stat_files"))}</div><div class="stat-value">${data.fileHeatmap.length}</div></div>
      <div class="stat-block"><div class="stat-label">${escapeHtml(t("history_stat_duration"))}</div><div class="stat-value-sm">${fmtDuration(data.startedAt, data.endedAt)}</div></div>
      <div class="stat-block"><div class="stat-label">${escapeHtml(t("history_stat_model"))}</div><div class="stat-value-sm">${data.models.map((m) => m.replace("claude-", "")).join(", ") || "—"}</div></div>
    </div>
    <div class="session-breakdown">
      ${breakdownEntries.map(([tk, c]) => `
        <span class="tool-pill" title="${escapeHtml(toolLabel(tk))}">${TOOL_GLYPH[tk] ?? "·"} ${escapeHtml(tk)} ${c}</span>
      `).join("")}
    </div>

    <div class="session-view-switch" role="tablist">
      <button class="view-tab ${LOCAL.view === "patika" ? "active" : ""}" data-view="patika" role="tab">${escapeHtml(t("history_view_path"))}</button>
      <button class="view-tab ${LOCAL.view === "konusma" ? "active" : ""}" data-view="konusma" role="tab">${escapeHtml(t("history_view_conversation"))}</button>
    </div>
    <div class="session-view-body" id="session-view-body"></div>
  `;

  detail.querySelectorAll(".view-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      LOCAL.view = btn.dataset.view;
      detail.querySelectorAll(".view-tab").forEach((b) =>
        b.classList.toggle("active", b === btn),
      );
      renderViewBody(data);
    });
  });

  renderViewBody(data);
}

async function renderViewBody(detail) {
  const body = document.querySelector("#session-view-body");
  if (!body) return;

  if (LOCAL.view === "patika") {
    body.innerHTML = `
      <div class="trail-timeline" style="margin-top: 10px;">
        ${detail.events.map((e) => `
          <div class="trail-event" data-tool="${escapeHtml(e.tool)}">
            <span class="trail-event-glyph">${TOOL_GLYPH[e.tool] ?? "·"}</span>
            <span class="trail-event-tool" title="${escapeHtml(toolLabel(e.tool))}">${escapeHtml(e.tool)}</span>
            <span class="trail-event-summary">${escapeHtml(e.summary || "—")}</span>
            <span class="trail-event-time">${fmtTime(e.timestamp)}</span>
          </div>
        `).join("")}
      </div>
    `;
    return;
  }

  // Konuşma view
  body.innerHTML = `<div class="loading">${escapeHtml(t("history_conv_loading"))}</div>`;
  const id = detail.id;
  let conv;
  try {
    if (LOCAL.convCache.has(id)) conv = LOCAL.convCache.get(id);
    else {
      conv = await api(`/api/sessions/${encodeURIComponent(id)}/conversation`);
      LOCAL.convCache.set(id, conv);
    }
  } catch (e) {
    body.innerHTML = `<div class="error-panel"><div class="error-title">${escapeHtml(t("history_conv_load_failed"))}</div><div class="error-detail">${escapeHtml(e.message)}</div></div>`;
    return;
  }

  if (conv.messages.length === 0) {
    body.innerHTML = `<div class="empty-state-small">${escapeHtml(t("history_conv_empty"))}</div>`;
    return;
  }

  const visibleMessages = conv.messages.filter((m) => !m.isMeta || m.toolCalls.length > 0);
  const hiddenCount = conv.messages.length - visibleMessages.length;

  body.innerHTML = `
    ${conv.truncated ? `<div class="conv-notice">${t("history_conv_truncated", conv.messages.length)}</div>` : ""}
    ${hiddenCount > 0 ? `<div class="conv-notice subtle">${t("history_conv_hidden", hiddenCount)} <button class="link-btn" id="show-all-msgs">${escapeHtml(t("history_conv_show_all"))}</button></div>` : ""}
    <div class="conv-stream" id="conv-stream">
      ${visibleMessages.map((m) => renderMessage(m)).join("")}
    </div>
  `;

  const showAllBtn = body.querySelector("#show-all-msgs");
  if (showAllBtn) {
    showAllBtn.addEventListener("click", () => {
      body.querySelector("#conv-stream").innerHTML = conv.messages.map((m) => renderMessage(m)).join("");
      showAllBtn.closest(".conv-notice").remove();
    });
  }
}

function renderMessage(m) {
  const ts = m.timestamp ? `<span class="msg-time">${fmtTime(m.timestamp)}</span>` : "";
  const roleLabel = m.role === "user" ? t("msg_role_user") : t("msg_role_assistant");
  const textHtml = m.text ? renderMarkdown(m.text) : "";
  const toolsHtml = m.toolCalls.length > 0 ? `
    <div class="msg-tools">
      ${m.toolCalls.map((tc) => `
        <span class="msg-tool" title="${escapeHtml(toolLabel(tc.tool))}">
          ${TOOL_GLYPH[tc.tool] ?? "·"} ${escapeHtml(tc.tool)}
          <span class="msg-tool-sum">${escapeHtml(tc.summary || "")}</span>
        </span>
      `).join("")}
    </div>
  ` : "";
  return `
    <div class="msg msg-${m.role} ${m.isMeta ? "msg-meta" : ""}">
      <div class="msg-head">
        <span class="msg-role">${escapeHtml(roleLabel)}</span>
        ${ts}
      </div>
      ${textHtml ? `<div class="msg-body markdown-render">${textHtml}</div>` : ""}
      ${toolsHtml}
    </div>
  `;
}
