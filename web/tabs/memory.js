import { api, setStatus, t } from "/app.js";
import { renderMarkdown } from "/markdown.js";

const TYPE_ORDER = ["user", "feedback", "project", "reference", "other"];

function typeLabel(type) {
  return t(`memory_type_${type}`);
}

let LOCAL = null;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

function fmtRel(mtimeMs) {
  if (!mtimeMs) return "—";
  const diff = Date.now() - mtimeMs;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export async function renderMemoryTab(container, opts = {}) {
  const silent = opts.silent === true;
  const prev = LOCAL;
  if (!silent) setStatus(t("status_loading"));
  const data = await api("/api/memory");
  // Preserve type filter + selection across silent re-renders
  LOCAL = {
    data,
    activeType: prev?.activeType ?? "all",
    selectedFile: prev?.selectedFile ?? null,
  };

  if (!data.exists) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-mark">◯</div>
        <div class="empty-title">${escapeHtml(t("memory_empty_title"))}</div>
        <div class="empty-sub">${t("memory_empty_sub", { dir: escapeHtml(data.memoryDir) })}</div>
      </div>`;
    setStatus(t("memory_empty_title"));
    return;
  }

  const counts = data.countsByType;
  const total = data.items.length;

  container.innerHTML = `
    <div class="memory-page">
      <div class="page-header">
        <div class="page-header-row">
          <div class="page-header-left">
            <h1 class="page-title">${escapeHtml(t("memory_title"))}</h1>
            <p class="page-sub">${t("memory_page_sub")}</p>
          </div>
          <button class="btn btn-primary mem-add-btn" id="mem-add-btn">+ ${escapeHtml(t("btn_new"))}</button>
        </div>
        <div class="page-header-toolbar">
          <span class="page-header-meta">${t("memory_total", total)}<code>${escapeHtml(data.memoryDir)}</code></span>
          <div class="memory-type-filter">
            <button class="type-chip ${LOCAL.activeType === "all" ? "active" : ""}" data-type="all">${escapeHtml(t("btn_all"))} (${total})</button>
            ${TYPE_ORDER.filter((tp) => counts[tp] > 0).map((tp) => `
              <button class="type-chip type-${tp} ${LOCAL.activeType === tp ? "active" : ""}" data-type="${tp}">${escapeHtml(typeLabel(tp))} (${counts[tp]})</button>
            `).join("")}
          </div>
        </div>
      </div>

      <div class="mem-create-form hidden" id="mem-create-form">
        <div class="mem-form-grid">
          <div class="mem-form-field">
            <label class="mem-form-label" for="mem-new-title">${escapeHtml(t("memory_form_title"))}</label>
            <input class="mem-form-input" id="mem-new-title" maxlength="120" autocomplete="off" />
          </div>
          <div class="mem-form-field mem-form-field-type">
            <label class="mem-form-label" for="mem-new-type">type</label>
            <select class="mem-form-select" id="mem-new-type">
              <option value="project">${escapeHtml(typeLabel("project"))}</option>
              <option value="user">${escapeHtml(typeLabel("user"))}</option>
              <option value="feedback">${escapeHtml(typeLabel("feedback"))}</option>
              <option value="reference">${escapeHtml(typeLabel("reference"))}</option>
              <option value="other">${escapeHtml(typeLabel("other"))}</option>
            </select>
          </div>
        </div>
        <div class="mem-form-field">
          <label class="mem-form-label" for="mem-new-desc">${escapeHtml(t("memory_form_desc"))}</label>
          <input class="mem-form-input" id="mem-new-desc" maxlength="240" autocomplete="off" />
        </div>
        <div class="mem-form-field">
          <label class="mem-form-label" for="mem-new-body">body (markdown)</label>
          <textarea class="mem-form-textarea" id="mem-new-body" rows="5" placeholder="${escapeHtml(t("memory_form_body"))}"></textarea>
        </div>
        <div class="mem-create-error" id="mem-create-error"></div>
        <div class="mem-create-actions">
          <button class="btn btn-ghost" id="mem-cancel">${escapeHtml(t("btn_cancel"))}</button>
          <button class="btn btn-primary" id="mem-save">${escapeHtml(t("btn_save_kbd"))}</button>
        </div>
      </div>

      <div class="memory-layout">
        <div class="memory-list" id="memory-list"></div>
        <div class="memory-detail" id="memory-detail">
          <div class="placeholder">
            <div class="placeholder-mark">◐</div>
            <div class="placeholder-text">${escapeHtml(t("memory_select_placeholder"))}</div>
            <div class="placeholder-sub">${escapeHtml(t("memory_select_sub"))}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll(".type-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      LOCAL.activeType = btn.dataset.type;
      container.querySelectorAll(".type-chip").forEach((b) =>
        b.classList.toggle("active", b === btn),
      );
      renderList();
    });
  });

  const form = container.querySelector("#mem-create-form");
  const titleInput = container.querySelector("#mem-new-title");
  const errBox = container.querySelector("#mem-create-error");

  const clearForm = () => {
    form.classList.add("hidden");
    titleInput.classList.remove("invalid");
    errBox.textContent = "";
    container.querySelector("#mem-new-title").value = "";
    container.querySelector("#mem-new-desc").value = "";
    container.querySelector("#mem-new-body").value = "";
  };

  container.querySelector("#mem-add-btn").addEventListener("click", () => {
    form.classList.remove("hidden");
    titleInput.focus();
  });
  container.querySelector("#mem-cancel").addEventListener("click", clearForm);
  container.querySelector("#mem-save").addEventListener("click", createMemory);

  [titleInput, container.querySelector("#mem-new-desc")].forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        createMemory();
      }
    });
  });
  form.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      clearForm();
    }
  });
  titleInput.addEventListener("input", () => {
    if (titleInput.value.trim()) {
      titleInput.classList.remove("invalid");
      errBox.textContent = "";
    }
  });

  renderList();

  // Restore selection if still valid
  if (LOCAL.selectedFile && LOCAL.data.items.some((it) => it.file === LOCAL.selectedFile)) {
    selectMemory(LOCAL.selectedFile);
  }
}

async function createMemory() {
  const titleEl = document.querySelector("#mem-new-title");
  const errBox = document.querySelector("#mem-create-error");
  const title = titleEl.value.trim();
  const desc = document.querySelector("#mem-new-desc").value.trim();
  const body = document.querySelector("#mem-new-body").value;
  const type = document.querySelector("#mem-new-type").value;
  if (!title) {
    titleEl.classList.add("invalid");
    if (errBox) errBox.textContent = t("memory_form_required_error");
    titleEl.focus();
    return;
  }
  titleEl.classList.remove("invalid");
  if (errBox) errBox.textContent = "";
  setStatus(t("status_loading"));
  try {
    await api("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: desc, type, body }),
    });
    LOCAL.data = await api("/api/memory");
    document.querySelector("#mem-create-form").classList.add("hidden");
    document.querySelector("#mem-new-title").value = "";
    document.querySelector("#mem-new-desc").value = "";
    document.querySelector("#mem-new-body").value = "";
    const container = document.querySelector("#tab-content");
    if (container) renderMemoryTab(container);
    setStatus(t("status_ready"));
  } catch (e) {
    setStatus(e.message);
  }
}

function renderList() {
  const list = document.querySelector("#memory-list");
  const items = LOCAL.activeType === "all"
    ? LOCAL.data.items
    : LOCAL.data.items.filter((it) => it.type === LOCAL.activeType);

  if (items.length === 0) {
    list.innerHTML = '<div class="empty-state-small">—</div>';
    return;
  }

  list.innerHTML = items.map((it) => `
    <div class="memory-card type-${it.type}" data-file="${escapeHtml(it.file)}">
      <div class="memory-card-head">
        <span class="memory-type-badge type-${it.type}">${escapeHtml(typeLabel(it.type))}</span>
        <span class="memory-card-time">${fmtRel(it.mtimeMs)}</span>
      </div>
      <div class="memory-card-title">${escapeHtml(it.title)}</div>
      <div class="memory-card-desc">${escapeHtml(it.description)}</div>
    </div>
  `).join("");

  list.querySelectorAll(".memory-card").forEach((card) => {
    card.addEventListener("click", () => selectMemory(card.dataset.file));
  });
}

function selectMemory(file) {
  const item = LOCAL.data.items.find((it) => it.file === file);
  if (!item) return;
  LOCAL.selectedFile = file;
  document.querySelectorAll(".memory-card").forEach((c) =>
    c.classList.toggle("active", c.dataset.file === file),
  );
  const detail = document.querySelector("#memory-detail");
  detail.innerHTML = `
    <div class="memory-detail-head">
      <div>
        <span class="memory-type-badge type-${item.type}">${escapeHtml(typeLabel(item.type))}</span>
        <span class="memory-detail-file">${escapeHtml(item.file)}</span>
      </div>
      <div class="memory-detail-actions">
        <button class="btn btn-ghost" id="mem-delete-btn">${escapeHtml(t("btn_delete"))}</button>
      </div>
    </div>
    <h2 class="memory-detail-title">${escapeHtml(item.title)}</h2>
    <p class="memory-detail-desc">${escapeHtml(item.description)}</p>
    ${item.originSessionId ? `<div class="memory-detail-origin">${escapeHtml(t("memory_origin_session"))} <code>${escapeHtml(item.originSessionId.slice(0, 8))}</code></div>` : ""}
    <div class="memory-detail-body markdown-render">${renderMarkdown(item.body)}</div>
  `;
  detail.querySelector("#mem-delete-btn").addEventListener("click", () => deleteMemory(file));
}

async function deleteMemory(file) {
  const item = LOCAL.data.items.find((it) => it.file === file);
  if (!item) return;
  const confirmMsg = t("memory_delete_confirm", { title: item.title });
  if (!confirm(confirmMsg)) return;
  setStatus(t("status_loading"));
  try {
    await api(`/api/memory?file=${encodeURIComponent(file)}`, { method: "DELETE" });
    LOCAL.data = await api("/api/memory");
    renderList();
    document.querySelector("#memory-detail").innerHTML = `
      <div class="placeholder">
        <div class="placeholder-mark">◐</div>
        <div class="placeholder-text">${escapeHtml(t("memory_select_placeholder"))}</div>
      </div>`;
    setStatus(t("status_ready"));
  } catch (e) {
    setStatus(e.message);
  }
}
