import { api, setStatus } from "/app.js";
import { renderMarkdown } from "/markdown.js";

let LOCAL = null;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

function fmtRel(iso) {
  if (!iso) return "hiç";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s önce`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}dk önce`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}sa önce`;
  const d = Math.floor(h / 24);
  return `${d}g önce`;
}

export async function renderAgentsTab(container) {
  setStatus("agents yükleniyor…");
  const agents = await api("/api/agents");

  if (agents.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-mark">◈</div>
        <div class="empty-title">Henüz ajan tanımlı değil</div>
        <div class="empty-sub">
          <b>Ajan nedir?</b> Claude'un içindeki uzmanlaşmış asistanlar — örn.
          <code>code-reviewer</code>, <code>security-reviewer</code>, <code>tdd-guide</code>.
          Her ajanın kendi system prompt'u ve tool izinleri var.<br/><br/>
          Bu projede (<code>.claude/agents/</code>) veya global
          (<code>~/.claude/agents/</code>) klasörlerinde tanımlı ajan yok.
        </div>
      </div>`;
    setStatus("ajan yok");
    return;
  }

  LOCAL = { agents, selectedName: null, scopeFilter: "all" };

  const used = agents.filter((a) => a.usageCount > 0);
  const unused = agents.filter((a) => a.usageCount === 0);
  const projectCount = agents.filter((a) => a.scope === "project").length;
  const globalCount = agents.filter((a) => a.scope === "global").length;

  container.innerHTML = `
    <div class="agents-page">
      <div class="page-header">
        <h1 class="page-title">Ajanlar</h1>
        <p class="page-sub">Bu projedeki + global ajanlar, hangisi ne sıklıkta kullanılmış. Kullanılmayan ajanları temizlemek için sağ üstten filtrele.</p>
      </div>
      <header class="agents-header">
        <div>
          <p class="agents-sub">
            <b>${agents.length}</b> ajan ·
            <b>${projectCount}</b> proje ·
            <b>${globalCount}</b> global ·
            <b>${used.length}</b> kullanılmış ·
            <b>${unused.length}</b> hiç tetiklenmemiş
          </p>
        </div>
        <div class="agents-filter">
          <button class="type-chip active" data-scope="all">tümü (${agents.length})</button>
          <button class="type-chip" data-scope="project">proje (${projectCount})</button>
          <button class="type-chip" data-scope="global">global (${globalCount})</button>
          <button class="type-chip" data-scope="used">kullanılan (${used.length})</button>
          <button class="type-chip" data-scope="unused">kullanılmayan (${unused.length})</button>
        </div>
      </header>

      <div class="agents-layout">
        <div class="agents-list" id="agents-list"></div>
        <div class="agents-detail" id="agents-detail">
          <div class="placeholder">
            <div class="placeholder-mark">◈</div>
            <div class="placeholder-text">ajan seç</div>
            <div class="placeholder-sub">Soldan bir ajana tıkla — system prompt, tools, kullanım istatistiği burada.</div>
          </div>
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll(".type-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      LOCAL.scopeFilter = btn.dataset.scope;
      container.querySelectorAll(".type-chip").forEach((b) =>
        b.classList.toggle("active", b === btn),
      );
      renderList();
    });
  });

  renderList();
  setStatus(`${agents.length} ajan`);
}

function filteredAgents() {
  const all = LOCAL.agents;
  switch (LOCAL.scopeFilter) {
    case "project": return all.filter((a) => a.scope === "project");
    case "global": return all.filter((a) => a.scope === "global");
    case "used": return all.filter((a) => a.usageCount > 0);
    case "unused": return all.filter((a) => a.usageCount === 0);
    default: return all;
  }
}

function renderList() {
  const list = document.querySelector("#agents-list");
  const items = filteredAgents();
  if (items.length === 0) {
    list.innerHTML = '<div class="empty-state-small">eşleşen ajan yok</div>';
    return;
  }
  const maxUsage = Math.max(1, ...items.map((a) => a.usageCount));
  list.innerHTML = items.map((a) => `
    <div class="agent-card scope-${a.scope}" data-name="${escapeHtml(a.name)}">
      <div class="agent-card-head">
        <span class="agent-scope-badge scope-${a.scope}">${a.scope}</span>
        <span class="agent-usage-bar">
          <span class="agent-usage-fill" style="width: ${(a.usageCount / maxUsage) * 100}%"></span>
        </span>
        <span class="agent-usage-count">${a.usageCount}×</span>
      </div>
      <div class="agent-card-name">${escapeHtml(a.name)}</div>
      <div class="agent-card-desc">${escapeHtml(a.description.slice(0, 140))}${a.description.length > 140 ? "…" : ""}</div>
    </div>
  `).join("");
  list.querySelectorAll(".agent-card").forEach((card) => {
    card.addEventListener("click", () => selectAgent(card.dataset.name));
  });
}

function fmtTokens(n) {
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

function fmtDuration(ms) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

async function selectAgent(name) {
  const a = LOCAL.agents.find((x) => x.name === name);
  if (!a) return;
  LOCAL.selectedName = name;
  document.querySelectorAll(".agent-card").forEach((c) =>
    c.classList.toggle("active", c.dataset.name === name),
  );
  const detail = document.querySelector("#agents-detail");
  detail.innerHTML = `
    <div class="agent-detail-head">
      <span class="agent-scope-badge scope-${a.scope}">${a.scope}</span>
      <span class="agent-detail-file">${escapeHtml(a.fileName)}</span>
    </div>
    <h2 class="agent-detail-name">${escapeHtml(a.name)}</h2>
    <p class="agent-detail-desc">${escapeHtml(a.description)}</p>

    <div class="agent-detail-stats" id="agent-stats">
      <div class="stat-block">
        <div class="stat-label">usage</div>
        <div class="stat-value">${a.usageCount}×</div>
        <div class="stat-sub">last: ${fmtRel(a.lastUsedAt)}</div>
      </div>
      <div class="stat-block" id="agent-tokens-block" style="opacity:0.5">
        <div class="stat-label">total tokens</div>
        <div class="stat-value" id="agent-total-tokens">…</div>
        <div class="stat-sub">across all calls</div>
      </div>
      ${a.tools.length > 0 ? `
        <div class="stat-block">
          <div class="stat-label">tools</div>
          <div class="stat-tools">${a.tools.map((t) => `<span class="tool-pill">${escapeHtml(t)}</span>`).join("")}</div>
        </div>` : ""}
      ${a.model ? `
        <div class="stat-block">
          <div class="stat-label">model</div>
          <div class="stat-value-sm">${escapeHtml(a.model)}</div>
        </div>` : ""}
    </div>

    <h3 class="section-title">activity — calls in past sessions</h3>
    <p class="agent-activity-note">
      The tasks this agent was given, when, and how much it (roughly) cost.
      <span class="agent-activity-warn">Note: Claude Code doesn't log <i>which files</i> the subagent touched internally — only its input prompt and final response are visible.</span>
    </p>
    <div class="agent-activity-list" id="agent-activity-list">
      <div class="loading">loading activity…</div>
    </div>

    <h3 class="section-title">system prompt</h3>
    <div class="agent-prompt markdown-render">${renderMarkdown(a.body)}</div>
  `;

  // Activity'yi async yükle
  loadAgentActivity(name);
}

async function loadAgentActivity(name) {
  const list = document.querySelector("#agent-activity-list");
  try {
    const activities = await api(`/api/agents/${encodeURIComponent(name)}/activity`);
    if (LOCAL.selectedName !== name) return;  // user switched

    // Toplam token hesapla
    const totalTokens = activities.reduce((sum, a) => sum + (a.estimatedTokens || 0), 0);
    const tokenEl = document.querySelector("#agent-total-tokens");
    const tokenBlock = document.querySelector("#agent-tokens-block");
    if (tokenEl) tokenEl.textContent = fmtTokens(totalTokens) || "0";
    if (tokenBlock) tokenBlock.style.opacity = totalTokens > 0 ? "1" : "0.5";

    if (activities.length === 0) {
      list.innerHTML = '<div class="agent-activity-empty">This agent hasn\'t been called yet in any recorded session.</div>';
      return;
    }

    list.innerHTML = activities.map((act, idx) => `
      <details class="agent-activity-card" ${idx === 0 ? "open" : ""}>
        <summary class="agent-activity-summary">
          <div class="agent-activity-line">
            <span class="agent-activity-desc">${escapeHtml(act.description || "(no description)")}</span>
            <span class="agent-activity-time">${fmtAbsTime(act.timestamp)}</span>
          </div>
          <div class="agent-activity-stats">
            <span class="agent-activity-tag">⏱ ${fmtDuration(act.durationMs)}</span>
            <span class="agent-activity-tag">≈ ${fmtTokens(act.estimatedTokens)} tok</span>
            <span class="agent-activity-tag">session <code>${escapeHtml(act.sessionId.slice(0, 8))}</code></span>
          </div>
        </summary>
        <div class="agent-activity-body">
          <div class="agent-activity-section">
            <div class="agent-activity-label">task prompt</div>
            <pre class="agent-activity-pre">${escapeHtml(act.prompt)}${act.promptTruncated ? "\n\n[…truncated]" : ""}</pre>
          </div>
          ${act.resultPreview ? `
            <div class="agent-activity-section">
              <div class="agent-activity-label">result</div>
              <pre class="agent-activity-pre">${escapeHtml(act.resultPreview)}${act.resultTruncated ? "\n\n[…truncated]" : ""}</pre>
            </div>` : ""}
        </div>
      </details>
    `).join("");
  } catch (e) {
    list.innerHTML = `<div class="error-panel"><div class="error-detail">${escapeHtml(e.message)}</div></div>`;
  }
}

function fmtAbsTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return iso; }
}
