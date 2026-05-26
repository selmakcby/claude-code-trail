import { api, setStatus } from "/app.js";

let LOCAL = null;
let saveTimer = null;
const SAVE_DEBOUNCE_MS = 1200;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

function fmtRel(mtimeMs) {
  if (!mtimeMs) return "—";
  const diff = Date.now() - mtimeMs;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "az önce";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}dk önce`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}sa önce`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}g önce`;
  const date = new Date(mtimeMs);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function setSaveState(state) {
  const el = document.querySelector("#note-save-state");
  if (!el) return;
  el.className = `note-save-state ${state}`;
  el.textContent = {
    saved: "✓ kaydedildi",
    saving: "● kaydediliyor…",
    dirty: "● değişiklik var",
    idle: "",
  }[state] || "";
}

export async function renderNotesTab(container) {
  setStatus("notlar yükleniyor…");
  const data = await api("/api/notes");
  LOCAL = {
    data,
    selectedFile: null,
    currentContent: "",
    searchTerm: "",
  };

  container.innerHTML = `
    <div class="notes-page">
      <div class="page-header">
        <h1 class="page-title">Notlar</h1>
        <p class="page-sub">Hızlı not alma alanı. Vault klasöründe <code>${escapeHtml(data.dir)}/</code> altına kaydedilir — Files sekmesinden de erişilebilir, geçmiş aramaya dahil olur. Yazdıkça otomatik kayıt.</p>
      </div>

      <div class="notes-layout">
        <aside class="notes-sidebar">
          <div class="notes-toolbar">
            <button class="btn btn-primary notes-new-btn" id="note-new-btn">+ Yeni not</button>
            <input class="notes-search" id="note-search" type="search" placeholder="ara… (başlık veya içerik)" />
          </div>
          <div class="notes-list" id="notes-list"></div>
        </aside>

        <section class="notes-editor-area" id="notes-editor-area">
          <div class="placeholder">
            <div class="placeholder-mark">✎</div>
            <div class="placeholder-text">${data.items.length > 0 ? "bir not seç" : "henüz not yok"}</div>
            <div class="placeholder-sub">
              ${data.items.length > 0
                ? "Soldan bir nota tıkla veya üstten <b>+ Yeni not</b> ile başla."
                : "Üstten <b>+ Yeni not</b> butonuna bas — ilk notun otomatik kaydedilir."}
            </div>
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
  setStatus(`${data.items.length} not`);

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
    list.innerHTML = `<div class="notes-empty-list">${
      LOCAL.searchTerm ? `"${escapeHtml(LOCAL.searchTerm)}" için eşleşme yok` : "henüz not yok — + Yeni not"
    }</div>`;
    return;
  }
  list.innerHTML = items.map((it) => `
    <div class="note-card ${LOCAL.selectedFile === it.file ? "active" : ""}" data-file="${escapeHtml(it.file)}">
      <div class="note-card-title">${escapeHtml(it.title)}</div>
      <div class="note-card-preview">${escapeHtml(it.preview) || "(boş)"}</div>
      <div class="note-card-meta">${fmtRel(it.mtimeMs)}</div>
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
  area.innerHTML = '<div class="loading">açılıyor…</div>';
  try {
    const data = await api(`/api/file?path=${encodeURIComponent(item.path)}`);
    LOCAL.currentContent = data.content;
    renderEditor(item, data.content);
  } catch (e) {
    area.innerHTML = `<div class="error-panel"><div class="error-title">Not açılamadı</div><div class="error-detail">${escapeHtml(e.message)}</div></div>`;
  }
}

function renderEditor(item, content) {
  const area = document.querySelector("#notes-editor-area");
  area.innerHTML = `
    <div class="notes-editor-head">
      <div class="notes-editor-meta">
        <span class="notes-editor-file">${escapeHtml(item.file)}</span>
        <span class="notes-editor-time">son: ${fmtRel(item.mtimeMs)}</span>
      </div>
      <div class="notes-editor-actions">
        <span class="note-save-state" id="note-save-state"></span>
        <button class="btn btn-ghost" id="note-delete-btn" title="Notu sil">sil</button>
      </div>
    </div>
    <textarea class="notes-editor-textarea" id="notes-editor-textarea" spellcheck="false" placeholder="# Başlık&#10;&#10;Buraya not al…"></textarea>
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
    setStatus(`kaydetme hatası: ${e.message}`);
  }
}

async function createNewNote() {
  setStatus("yeni not oluşturuluyor…");
  try {
    const note = await api("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    LOCAL.data = await api("/api/notes");
    LOCAL.selectedFile = note.file;
    renderList();
    await openNote(note.file);
    setStatus("yeni not açıldı");
  } catch (e) {
    setStatus(`hata: ${e.message}`);
  }
}

async function deleteNote(item) {
  if (!confirm(`"${item.title}" silinsin mi? Bu geri alınamaz.`)) return;
  setStatus("siliniyor…");
  try {
    await api(`/api/notes?file=${encodeURIComponent(item.file)}`, { method: "DELETE" });
    LOCAL.data = await api("/api/notes");
    LOCAL.selectedFile = null;
    renderList();
    document.querySelector("#notes-editor-area").innerHTML = `
      <div class="placeholder">
        <div class="placeholder-mark">✓</div>
        <div class="placeholder-text">silindi</div>
        <div class="placeholder-sub">Yeni bir not için <b>+ Yeni not</b>.</div>
      </div>`;
    setStatus(`silindi: ${item.file}`);
  } catch (e) {
    setStatus(`hata: ${e.message}`);
  }
}
