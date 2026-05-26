import { api, setStatus, t, fmtRelTime } from "/app.js";

let LOCAL = null;
let saveTimer = null;
const SAVE_DEBOUNCE_MS = 1200;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

function setSaveState(state) {
  const el = document.querySelector("#note-save-state");
  if (!el) return;
  el.className = `note-save-state ${state}`;
  el.textContent = {
    saved: t("notes_save_saved"),
    saving: t("notes_save_saving"),
    dirty: t("notes_save_dirty"),
    idle: "",
  }[state] || "";
}

export async function renderNotesTab(container, opts = {}) {
  const silent = opts.silent === true;
  // Skip silent refresh while a note is open — re-rendering the textarea
  // would discard the user's in-progress edits (auto-save fires every
  // ~1.2s, but anything typed within that window would be lost).
  if (silent && LOCAL?.selectedFile) return;

  if (!silent) setStatus(t("notes_loading"));
  let data;
  try {
    data = await api("/api/notes");
  } catch (e) {
    container.innerHTML = `
      <div class="error-panel">
        <div class="error-title">${escapeHtml(t("notes_open_failed"))}</div>
        <div class="error-detail">${escapeHtml(e.message)}</div>
      </div>`;
    setStatus(t("status_error", e.message));
    return;
  }
  LOCAL = {
    data,
    selectedFile: null,
    currentContent: "",
    searchTerm: "",
  };

  // Notlar klasörü yazılamıyorsa (yanlış vault seçilmiş olabilir) — bilgilendirici empty state
  if (data.writable === false) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-mark">⚠</div>
        <div class="empty-title">${escapeHtml(t("notes_not_writable_title"))}</div>
        <div class="empty-sub">${t("notes_not_writable_sub", { dir: escapeHtml(data.dir) })}</div>
      </div>`;
    setStatus(t("notes_not_writable_title"));
    return;
  }

  const firstNote = data.items.length === 0;

  container.innerHTML = `
    <div class="notes-page">
      <div class="page-header">
        <h1 class="page-title">${escapeHtml(t("notes_title"))}</h1>
        <p class="page-sub">${t("notes_page_sub", { dir: escapeHtml(data.dir) })}</p>
      </div>

      <div class="notes-layout">
        <aside class="notes-sidebar">
          <div class="notes-toolbar">
            <button class="btn btn-primary notes-new-btn" id="note-new-btn">${escapeHtml(t("notes_btn_new"))}</button>
            <input class="notes-search" id="note-search" type="search" placeholder="${escapeHtml(t("notes_search"))}" />
          </div>
          <div class="notes-list" id="notes-list"></div>
        </aside>

        <section class="notes-editor-area" id="notes-editor-area">
          <div class="placeholder">
            <div class="placeholder-mark">✎</div>
            <div class="placeholder-text">${escapeHtml(firstNote ? t("notes_empty_first") : t("notes_empty_select"))}</div>
            <div class="placeholder-sub">${firstNote ? t("notes_empty_sub_first") : t("notes_empty_sub_select")}</div>
          </div>
        </section>
      </div>
    </div>
  `;

  container.querySelector("#note-new-btn").addEventListener("click", createNewNote);
  container.querySelector("#note-search").addEventListener("input", (e) => {
    LOCAL.searchTerm = e.target.value.toLowerCase();
    renderList();
  });

  renderList();
  setStatus(t("notes_count", data.items.length));

  // Global "trail:new-note" event'i dinle (app.js'teki ⌘N tetikler)
  window.removeEventListener("trail:new-note", handleNewNoteEvent);
  window.addEventListener("trail:new-note", handleNewNoteEvent);
}

function handleNewNoteEvent() {
  // Sadece Notlar tab aktif ise tetik
  if (!document.querySelector(".notes-page")) return;
  createNewNote();
}

function filteredItems() {
  if (!LOCAL.searchTerm) return LOCAL.data.items;
  const q = LOCAL.searchTerm;
  return LOCAL.data.items.filter((it) =>
    it.title.toLowerCase().includes(q) || it.preview.toLowerCase().includes(q),
  );
}

function renderList() {
  const list = document.querySelector("#notes-list");
  const items = filteredItems();
  if (items.length === 0) {
    const empty = LOCAL.searchTerm
      ? t("notes_empty_list_search", { term: escapeHtml(LOCAL.searchTerm) })
      : t("notes_empty_list");
    list.innerHTML = `<div class="notes-empty-list">${empty}</div>`;
    return;
  }
  list.innerHTML = items.map((it) => `
    <div class="note-card ${LOCAL.selectedFile === it.file ? "active" : ""}" data-file="${escapeHtml(it.file)}">
      <div class="note-card-title">${escapeHtml(it.title)}</div>
      <div class="note-card-preview">${escapeHtml(it.preview) || escapeHtml(t("notes_empty_preview"))}</div>
      <div class="note-card-meta">${escapeHtml(fmtRelTime(it.mtimeMs, "long"))}</div>
    </div>
  `).join("");
  list.querySelectorAll(".note-card").forEach((card) => {
    card.addEventListener("click", () => openNote(card.dataset.file));
  });
}

async function openNote(file) {
  const item = LOCAL.data.items.find((it) => it.file === file);
  if (!item) return;
  LOCAL.selectedFile = file;
  document.querySelectorAll(".note-card").forEach((c) =>
    c.classList.toggle("active", c.dataset.file === file),
  );

  const area = document.querySelector("#notes-editor-area");
  area.innerHTML = `<div class="loading">${escapeHtml(t("notes_opening"))}</div>`;
  try {
    const data = await api(`/api/file?path=${encodeURIComponent(item.path)}`);
    LOCAL.currentContent = data.content;
    renderEditor(item, data.content);
  } catch (e) {
    area.innerHTML = `<div class="error-panel"><div class="error-title">${escapeHtml(t("notes_open_failed"))}</div><div class="error-detail">${escapeHtml(e.message)}</div></div>`;
  }
}

function renderEditor(item, content) {
  const area = document.querySelector("#notes-editor-area");
  area.innerHTML = `
    <div class="notes-editor-head">
      <div class="notes-editor-meta">
        <span class="notes-editor-file">${escapeHtml(item.file)}</span>
        <span class="notes-editor-time">${escapeHtml(t("notes_last"))} ${escapeHtml(fmtRelTime(item.mtimeMs, "long"))}</span>
      </div>
      <div class="notes-editor-actions">
        <span class="note-save-state" id="note-save-state"></span>
        <button class="btn btn-ghost" id="note-delete-btn" title="${escapeHtml(t("notes_delete_tooltip"))}">${escapeHtml(t("btn_delete"))}</button>
      </div>
    </div>
    <textarea class="notes-editor-textarea" id="notes-editor-textarea" spellcheck="false" placeholder="${escapeHtml(t("notes_editor_placeholder"))}"></textarea>
  `;
  const ta = area.querySelector("#notes-editor-textarea");
  ta.value = content;
  ta.focus();
  setSaveState("saved");

  ta.addEventListener("input", () => {
    LOCAL.currentContent = ta.value;
    setSaveState("dirty");
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveCurrentNote(item), SAVE_DEBOUNCE_MS);
  });

  // Cmd/Ctrl + S → hemen kaydet
  ta.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      if (saveTimer) clearTimeout(saveTimer);
      saveCurrentNote(item);
    }
  });

  area.querySelector("#note-delete-btn").addEventListener("click", () => deleteNote(item));
}

async function saveCurrentNote(item) {
  setSaveState("saving");
  try {
    await api(`/api/file?path=${encodeURIComponent(item.path)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: LOCAL.currentContent }),
    });
    setSaveState("saved");
    // Listeyi de güncelle (preview + mtime için)
    LOCAL.data = await api("/api/notes");
    renderList();
  } catch (e) {
    setSaveState("dirty");
    setStatus(t("notes_save_error", e.message));
  }
}

async function createNewNote() {
  setStatus(t("notes_creating"));
  try {
    const note = await api("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t("notes_default_title") }),
    });
    LOCAL.data = await api("/api/notes");
    LOCAL.selectedFile = note.file;
    renderList();
    await openNote(note.file);
    setStatus(t("notes_created"));
  } catch (e) {
    setStatus(t("status_error", e.message));
  }
}

async function deleteNote(item) {
  if (!confirm(t("notes_delete_confirm", { title: item.title }))) return;
  setStatus(t("notes_deleting"));
  try {
    await api(`/api/notes?file=${encodeURIComponent(item.file)}`, { method: "DELETE" });
    LOCAL.data = await api("/api/notes");
    LOCAL.selectedFile = null;
    renderList();
    document.querySelector("#notes-editor-area").innerHTML = `
      <div class="placeholder">
        <div class="placeholder-mark">✓</div>
        <div class="placeholder-text">${escapeHtml(t("notes_deleted_short"))}</div>
        <div class="placeholder-sub">${t("notes_deleted_sub")}</div>
      </div>`;
    setStatus(t("notes_deleted_status", item.file));
  } catch (e) {
    setStatus(t("status_error", e.message));
  }
}
