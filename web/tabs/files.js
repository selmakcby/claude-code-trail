import { api, setStatus, t } from "/app.js";
import { renderMarkdown } from "/markdown.js";

const ICONS = { vault: "◐", code: "◇", agents: "◈", skills: "◉", data: "○" };
let LOCAL = null;

function cssEscape(s) {
  return s.replace(/(["\\])/g, "\\$1");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

export async function renderFilesTab(container, opts = {}) {
  const silent = opts.silent === true;
  const prev = LOCAL;
  // While the user is editing, the auto-refresh must not blow away
  // their unsaved changes by tearing down the textarea.
  if (silent && prev?.isEditing) return;
  container.innerHTML = `
    <div class="files-wrap">
      <div class="page-header page-header-compact">
        <h1 class="page-title">${escapeHtml(t("files_title"))}</h1>
        <p class="page-sub">${t("files_page_sub")}</p>
      </div>
    <div class="files-layout">
      <aside class="sidebar">
        <div class="cat-filter">
          <button class="cat-btn active" data-cat="all">${escapeHtml(t("files_cat_all"))}</button>
          <button class="cat-btn" data-cat="vault">${escapeHtml(t("files_cat_vault"))}</button>
          <button class="cat-btn" data-cat="code">${escapeHtml(t("files_cat_code"))}</button>
          <button class="cat-btn" data-cat="agents">${escapeHtml(t("files_cat_agents"))}</button>
          <button class="cat-btn" data-cat="skills">${escapeHtml(t("files_cat_skills"))}</button>
          <button class="cat-btn" data-cat="data">${escapeHtml(t("files_cat_data"))}</button>
        </div>
        <div class="tree-wrap">
          <div class="tree" id="file-tree"><div class="tree-empty">${escapeHtml(t("status_loading"))}</div></div>
        </div>
      </aside>
      <section class="content">
        <div class="content-header">
          <div class="file-meta">
            <span class="file-meta-label">${escapeHtml(t("files_open_label"))}</span>
            <span class="file-meta-path" id="open-path">${escapeHtml(t("files_open_placeholder"))}</span>
          </div>
          <div class="file-actions">
            <button class="btn btn-ghost" id="toggle-edit-btn" disabled>${escapeHtml(t("files_btn_edit"))}</button>
            <button class="btn btn-primary" id="save-btn" disabled>${escapeHtml(t("files_btn_save"))}</button>
          </div>
        </div>
        <div class="editor-area" id="editor-area">
          <div class="placeholder">
            <div class="placeholder-mark">▣</div>
            <div class="placeholder-text">${escapeHtml(t("files_placeholder_text"))}</div>
            <div class="placeholder-sub">${t("files_placeholder_sub")}</div>
          </div>
        </div>
      </section>
    </div>
    </div>
  `;

  LOCAL = {
    tree: null,
    filesByPath: new Map(),
    currentPath: prev?.currentPath ?? null,
    currentContent: prev?.currentContent ?? "",
    currentProtected: prev?.currentProtected ?? false,
    isEditing: prev?.isEditing ?? false,
    category: prev?.category ?? "all",
  };

  // Restore active category chip
  container.querySelectorAll(".cat-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.cat === LOCAL.category),
  );

  const tree = await api("/api/tree");
  LOCAL.tree = tree;
  indexFiles(tree, LOCAL.filesByPath);
  renderTree();
  if (!silent) setStatus(`${LOCAL.filesByPath.size} files`);

  // Re-show currently open file (read-only path: no network re-fetch)
  if (LOCAL.currentPath && LOCAL.filesByPath.has(LOCAL.currentPath)) {
    document.querySelector("#open-path").textContent = LOCAL.currentPath;
    const toggleBtn = document.querySelector("#toggle-edit-btn");
    toggleBtn.disabled = LOCAL.currentProtected;
    renderContent();
    highlightActive();
  }

  container.querySelectorAll(".cat-btn").forEach((b) => {
    b.addEventListener("click", () => {
      LOCAL.category = b.dataset.cat;
      container.querySelectorAll(".cat-btn").forEach((x) =>
        x.classList.toggle("active", x === b),
      );
      renderTree();
    });
  });
  container.querySelector("#save-btn").addEventListener("click", saveFile);
  container.querySelector("#toggle-edit-btn").addEventListener("click", toggleEdit);
}

function indexFiles(node, map) {
  if (!node.isDir) map.set(node.path, node);
  if (node.children) node.children.forEach((c) => indexFiles(c, map));
}

function renderTree() {
  const root = document.querySelector("#file-tree");
  root.innerHTML = "";
  if (!LOCAL.tree?.children?.length) {
    root.innerHTML = '<div class="tree-empty">boş</div>';
    return;
  }
  for (const child of LOCAL.tree.children) {
    const el = renderNode(child, 0);
    if (el) root.appendChild(el);
  }
}

function nodeMatchesCategory(node) {
  if (LOCAL.category === "all") return true;
  if (!node.isDir) return node.category === LOCAL.category;
  return hasChildInCategory(node, LOCAL.category);
}

function hasChildInCategory(node, cat) {
  if (!node.isDir) return node.category === cat;
  if (!node.children) return false;
  return node.children.some((c) => hasChildInCategory(c, cat));
}

function renderNode(node, depth) {
  if (!nodeMatchesCategory(node)) return null;
  const row = document.createElement("div");
  row.className = "tree-node";
  row.style.paddingLeft = `${depth * 14 + 8}px`;
  row.dataset.path = node.path;

  const icon = document.createElement("span");
  icon.className = "tree-icon";
  icon.textContent = node.isDir ? "▸" : ICONS[node.category] ?? "·";
  row.appendChild(icon);

  const label = document.createElement("span");
  label.className = "tree-label";
  label.textContent = node.name;
  row.appendChild(label);

  if (node.isProtected) {
    const lock = document.createElement("span");
    lock.className = "tree-lock";
    lock.textContent = "●";
    lock.title = "secret-guard: mask'lı, readonly";
    row.appendChild(lock);
  }

  if (!node.isDir) {
    row.addEventListener("click", () => openFile(node.path));
  }

  const wrap = document.createElement("div");
  wrap.className = "tree-branch";
  wrap.appendChild(row);

  if (node.isDir && node.children) {
    const childrenWrap = document.createElement("div");
    childrenWrap.className = "tree-children open";
    let rendered = 0;
    for (const child of node.children) {
      const childEl = renderNode(child, depth + 1);
      if (childEl) {
        childrenWrap.appendChild(childEl);
        rendered++;
      }
    }
    if (rendered === 0) return null;
    wrap.appendChild(childrenWrap);
    row.addEventListener("click", (e) => {
      e.stopPropagation();
      childrenWrap.classList.toggle("open");
      icon.textContent = childrenWrap.classList.contains("open") ? "▾" : "▸";
    });
    icon.textContent = "▾";
  }
  return wrap;
}

async function openFile(path) {
  setStatus(`açılıyor: ${path}`);
  try {
    const data = await api(`/api/file?path=${encodeURIComponent(path)}`);
    LOCAL.currentPath = data.path;
    LOCAL.currentContent = data.content;
    LOCAL.currentProtected = data.isProtected;
    LOCAL.isEditing = false;
    document.querySelector("#open-path").textContent = data.path;
    document.querySelector("#save-btn").disabled = true;
    const toggleBtn = document.querySelector("#toggle-edit-btn");
    toggleBtn.disabled = data.isProtected;
    toggleBtn.textContent = "düzenle";
    renderContent();
    highlightActive();
    setStatus(data.isProtected ? "readonly (secret-guard)" : `${data.size} byte`);
  } catch (e) {
    setStatus(`hata: ${e.message}`);
  }
}

function highlightActive() {
  document.querySelectorAll(".tree-node.active").forEach((el) => el.classList.remove("active"));
  if (!LOCAL.currentPath) return;
  const el = document.querySelector(`.tree-node[data-path="${cssEscape(LOCAL.currentPath)}"]`);
  if (el) el.classList.add("active");
}

function renderContent() {
  const area = document.querySelector("#editor-area");
  area.innerHTML = "";
  if (!LOCAL.currentPath) return;

  const ext = LOCAL.currentPath.split(".").pop()?.toLowerCase();
  const isMd = ["md", "mdx", "markdown"].includes(ext);

  if (LOCAL.isEditing && !LOCAL.currentProtected && isMd) {
    const ta = document.createElement("textarea");
    ta.className = "editor-textarea";
    ta.value = LOCAL.currentContent;
    ta.addEventListener("input", () => {
      LOCAL.currentContent = ta.value;
      document.querySelector("#save-btn").disabled = false;
    });
    area.appendChild(ta);
    return;
  }

  if (isMd) {
    const article = document.createElement("article");
    article.className = "markdown-render";
    article.innerHTML = renderMarkdown(LOCAL.currentContent);
    article.addEventListener("click", (e) => {
      const link = e.target.closest(".wiki-link");
      if (link) {
        e.preventDefault();
        const found = findFileByName(link.dataset.target);
        if (found) openFile(found.path);
        else setStatus(`wiki link bulunamadı: ${link.dataset.target}`);
      }
    });
    area.appendChild(article);
  } else {
    const pre = document.createElement("pre");
    pre.className = "code-render";
    pre.textContent = LOCAL.currentContent;
    area.appendChild(pre);
  }
}

function findFileByName(target) {
  if (LOCAL.filesByPath.has(target)) return LOCAL.filesByPath.get(target);
  if (LOCAL.filesByPath.has("/" + target)) return LOCAL.filesByPath.get("/" + target);
  for (const [, node] of LOCAL.filesByPath) {
    const bare = node.name.replace(/\.[^.]+$/, "");
    if (node.name === target || node.name === target + ".md" || bare === target) return node;
  }
  return null;
}

async function saveFile() {
  if (!LOCAL.currentPath || LOCAL.currentProtected) return;
  setStatus("kaydediliyor…");
  try {
    await api(`/api/file?path=${encodeURIComponent(LOCAL.currentPath)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: LOCAL.currentContent }),
    });
    document.querySelector("#save-btn").disabled = true;
    setStatus("kaydedildi");
  } catch (e) {
    setStatus(`kaydetme hatası: ${e.message}`);
  }
}

function toggleEdit() {
  if (LOCAL.currentProtected) return;
  LOCAL.isEditing = !LOCAL.isEditing;
  document.querySelector("#toggle-edit-btn").textContent = LOCAL.isEditing ? "önizle" : "düzenle";
  renderContent();
}
