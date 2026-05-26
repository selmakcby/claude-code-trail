import { api, setStatus } from "/app.js";
import { renderMarkdown } from "/markdown.js";

const TOOL_GLYPH = {
  Read: "→", Edit: "✎", Write: "✎", MultiEdit: "✎", NotebookEdit: "✎",
  Bash: "$", Grep: "?", Glob: "*", Agent: "◈",
  WebFetch: "↗", WebSearch: "⌕", TodoWrite: "✓", Other: "·",
};

const TOOL_LABEL_TR = {
  Read: "okuma", Edit: "düzenleme", Write: "yazma",
  MultiEdit: "çoklu düzenleme", NotebookEdit: "notebook",
  Bash: "komut", Grep: "metin arama", Glob: "dosya arama",
  Agent: "alt ajan", WebFetch: "web indirme", WebSearch: "web arama",
  TodoWrite: "görev planı", Other: "diğer",
};

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
  if (m < 60) return `${m}dk`;
  const h = Math.floor(m / 60);
  return `${h}sa${m % 60}dk`;
}

export async function renderSessionsTab(container) {
  setStatus("session listesi yükleniyor…");
  const sessions = await api("/api/sessions");
  LOCAL = { sessions, selectedId: null, view: "patika", detailCache: new Map(), convCache: new Map() };

  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-mark">◐</div>
        <div class="empty-title">Henüz Claude session'ı yok</div>
        <div class="empty-sub">
          Bu projede Claude Code ile yapılmış hiç konuşma kaydı bulunmuyor.<br/>
          Terminal'de bu klasörden <code>claude</code> komutuyla başla, bir mesaj at,
          sonra burayı yenile — geçmiş session'ların listesi ve her birinin patikası burada.
        </div>
      </div>`;
    setStatus("session yok");
    return;
  }

  container.innerHTML = `
    <div class="sessions-page">
      <div class="page-header">
        <h1 class="page-title">Geçmiş</h1>
        <p class="page-sub">Tüm Claude Code session'larının arşivi. Tıkla, içeride hangi araçları çağırdığını <b>Patika</b>'da, ne konuştuğunu <b>Konuşma</b>'da gör.</p>
      </div>
      <header class="sessions-header">
        <p class="sessions-sub">Toplam <b>${sessions.length}</b> session (son 30) · tıkla, detayları aç</p>
      </header>
      <div class="sessions-layout">
        <div class="sessions-list" id="sessions-list"></div>
        <div class="sessions-detail" id="sessions-detail">
          <div class="placeholder">
            <div class="placeholder-mark">◐</div>
            <div class="placeholder-text">session seç</div>
            <div class="placeholder-sub">Soldan bir session'a tıkla — tool patikası veya konuşma akışı burada açılır.</div>
          </div>
        </div>
      </div>
    </div>
  `;

  renderList();
  setStatus(`${sessions.length} session`);
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

  detail.innerHTML = '<div class="loading">session detayı yükleniyor…</div>';

  let data;
  try {
    if (LOCAL.detailCache.has(id)) data = LOCAL.detailCache.get(id);
    else {
      data = await api(`/api/sessions/${encodeURIComponent(id)}`);
      LOCAL.detailCache.set(id, data);
    }
  } catch (e) {
    detail.innerHTML = `<div class="error-panel"><div class="error-title">Yüklenemedi</div><div class="error-detail">${escapeHtml(e.message)}</div></div>`;
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
        <div class="session-firstprompt-label">ilk prompt</div>
        <div class="session-firstprompt-text">${escapeHtml(data.firstUserPrompt)}</div>
      </div>` : ""}
    <div class="session-stats-row">
      <div class="stat-block"><div class="stat-label">tool çağrısı</div><div class="stat-value">${data.toolUseCount}</div></div>
      <div class="stat-block"><div class="stat-label">dosya</div><div class="stat-value">${data.fileHeatmap.length}</div></div>
      <div class="stat-block"><div class="stat-label">süre</div><div class="stat-value-sm">${fmtDuration(data.startedAt, data.endedAt)}</div></div>
      <div class="stat-block"><div class="stat-label">model</div><div class="stat-value-sm">${data.models.map((m) => m.replace("claude-", "")).join(", ") || "—"}</div></div>
    </div>
    <div class="session-breakdown">
      ${breakdownEntries.map(([t, c]) => `
        <span class="tool-pill" title="${TOOL_LABEL_TR[t] ?? "diğer"}">${TOOL_GLYPH[t] ?? "·"} ${escapeHtml(t)} ${c}</span>
      `).join("")}
    </div>

    <div class="session-view-switch" role="tablist">
      <button class="view-tab ${LOCAL.view === "patika" ? "active" : ""}" data-view="patika" role="tab">Patika</button>
      <button class="view-tab ${LOCAL.view === "konusma" ? "active" : ""}" data-view="konusma" role="tab">Konuşma</button>
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
            <span class="trail-event-tool" title="${escapeHtml(TOOL_LABEL_TR[e.tool] ?? "diğer")}">${escapeHtml(e.tool)}</span>
            <span class="trail-event-summary">${escapeHtml(e.summary || "—")}</span>
            <span class="trail-event-time">${fmtTime(e.timestamp)}</span>
          </div>
        `).join("")}
      </div>
    `;
    return;
  }

  // Konuşma view
  body.innerHTML = '<div class="loading">konuşma yükleniyor…</div>';
  const id = detail.id;
  let conv;
  try {
    if (LOCAL.convCache.has(id)) conv = LOCAL.convCache.get(id);
    else {
      conv = await api(`/api/sessions/${encodeURIComponent(id)}/conversation`);
      LOCAL.convCache.set(id, conv);
    }
  } catch (e) {
    body.innerHTML = `<div class="error-panel"><div class="error-title">Konuşma yüklenemedi</div><div class="error-detail">${escapeHtml(e.message)}</div></div>`;
    return;
  }

  if (conv.messages.length === 0) {
    body.innerHTML = '<div class="empty-state-small">Bu session\'da gösterilebilir mesaj yok.</div>';
    return;
  }

  const visibleMessages = conv.messages.filter((m) => !m.isMeta || m.toolCalls.length > 0);
  const hiddenCount = conv.messages.length - visibleMessages.length;

  body.innerHTML = `
    ${conv.truncated ? `<div class="conv-notice">Bu session çok uzun — son ${conv.messages.length} mesaj gösteriliyor.</div>` : ""}
    ${hiddenCount > 0 ? `<div class="conv-notice subtle">${hiddenCount} sistem mesajı gizlendi (slash komut, attachment vs.). <button class="link-btn" id="show-all-msgs">hepsini göster</button></div>` : ""}
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
  const roleLabel = m.role === "user" ? "Sen" : "Claude";
  const textHtml = m.text ? renderMarkdown(m.text) : "";
  const toolsHtml = m.toolCalls.length > 0 ? `
    <div class="msg-tools">
      ${m.toolCalls.map((t) => `
        <span class="msg-tool" title="${escapeHtml(TOOL_LABEL_TR[t.tool] ?? "diğer")}">
          ${TOOL_GLYPH[t.tool] ?? "·"} ${escapeHtml(t.tool)}
          <span class="msg-tool-sum">${escapeHtml(t.summary || "")}</span>
        </span>
      `).join("")}
    </div>
  ` : "";
  return `
    <div class="msg msg-${m.role} ${m.isMeta ? "msg-meta" : ""}">
      <div class="msg-head">
        <span class="msg-role">${roleLabel}</span>
        ${ts}
      </div>
      ${textHtml ? `<div class="msg-body markdown-render">${textHtml}</div>` : ""}
      ${toolsHtml}
    </div>
  `;
}
