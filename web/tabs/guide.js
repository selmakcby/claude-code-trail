import { setStatus, t } from "/app.js";
import { renderMarkdown } from "/markdown.js";

const STORAGE_KEY = "trail-guide-progress";

let LOCAL = null;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch { return {}; }
}

function saveProgress(slug) {
  const p = loadProgress();
  p[slug] = { readAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export async function renderGuideTab(container) {
  setStatus(t("guide_loading"));
  const indexRes = await fetch("/docs/_index.json");
  if (!indexRes.ok) throw new Error(t("guide_index_failed"));
  const index = await indexRes.json();
  const progress = loadProgress();

  LOCAL = { lessons: index.lessons, selectedSlug: null, progress };

  const readCount = Object.keys(progress).filter((k) =>
    index.lessons.some((l) => l.slug === k),
  ).length;
  const total = index.lessons.length;

  container.innerHTML = `
    <div class="guide-page">
      <div class="page-header">
        <h1 class="page-title">${escapeHtml(t("guide_title"))}</h1>
        <p class="page-sub">${t("guide_page_sub", { total, read: readCount })}</p>
      </div>
      <div class="guide-layout">
        <aside class="guide-list" id="guide-list"></aside>
        <section class="guide-reader" id="guide-reader">
          <div class="placeholder">
            <div class="placeholder-mark">✦</div>
            <div class="placeholder-text">${escapeHtml(t("guide_pick"))}</div>
            <div class="placeholder-sub">${t("guide_pick_sub")}</div>
          </div>
        </section>
      </div>
    </div>
  `;

  renderList();
  setStatus(t("guide_count_status", total));
}

function renderList() {
  const list = document.querySelector("#guide-list");
  list.innerHTML = LOCAL.lessons.map((l, idx) => {
    const isRead = !!LOCAL.progress[l.slug];
    const isActive = LOCAL.selectedSlug === l.slug;
    return `
      <div class="guide-card ${isActive ? "active" : ""} ${isRead ? "read" : ""}" data-slug="${escapeHtml(l.slug)}">
        <div class="guide-card-num">
          <span class="guide-card-idx">${String(idx).padStart(2, "0")}</span>
          ${isRead ? '<span class="guide-card-check">✓</span>' : ""}
        </div>
        <div class="guide-card-body">
          <div class="guide-card-title">${escapeHtml(l.title)}</div>
          <div class="guide-card-summary">${escapeHtml(l.summary)}</div>
          <div class="guide-card-meta">
            <span class="guide-level guide-level-${l.level}">${escapeHtml(l.level)}</span>
            <span class="guide-time">${l.estMin} min</span>
          </div>
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".guide-card").forEach((card) => {
    card.addEventListener("click", () => openLesson(card.dataset.slug));
  });
}

async function openLesson(slug) {
  LOCAL.selectedSlug = slug;
  document.querySelectorAll(".guide-card").forEach((c) =>
    c.classList.toggle("active", c.dataset.slug === slug),
  );
  const reader = document.querySelector("#guide-reader");
  reader.innerHTML = `<div class="loading">${escapeHtml(t("guide_lesson_loading"))}</div>`;

  try {
    const res = await fetch(`/docs/${encodeURIComponent(slug)}.md`);
    if (!res.ok) throw new Error(t("guide_lesson_not_found", slug));
    const md = await res.text();

    const lessonIdx = LOCAL.lessons.findIndex((l) => l.slug === slug);
    const prev = LOCAL.lessons[lessonIdx - 1];
    const next = LOCAL.lessons[lessonIdx + 1];

    reader.innerHTML = `
      <article class="guide-article">
        <div class="guide-article-body markdown-render">${renderMarkdown(md)}</div>
        <nav class="guide-nav">
          ${prev ? `<button class="guide-nav-btn" data-slug="${escapeHtml(prev.slug)}">← ${escapeHtml(prev.title)}</button>` : '<span></span>'}
          <button class="btn btn-primary" id="guide-mark-read">${escapeHtml(LOCAL.progress[slug] ? t("guide_btn_read_done") : t("guide_btn_read"))}</button>
          ${next ? `<button class="guide-nav-btn" data-slug="${escapeHtml(next.slug)}">${escapeHtml(next.title)} →</button>` : '<span></span>'}
        </nav>
      </article>
    `;
    reader.scrollTop = 0;

    reader.querySelectorAll(".guide-nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => openLesson(btn.dataset.slug));
    });
    reader.querySelector("#guide-mark-read").addEventListener("click", () => {
      saveProgress(slug);
      LOCAL.progress = loadProgress();
      renderList();
      reader.querySelector("#guide-mark-read").textContent = t("guide_btn_read_done");
    });
  } catch (e) {
    reader.innerHTML = `<div class="error-panel"><div class="error-title">${escapeHtml(t("guide_load_failed"))}</div><div class="error-detail">${escapeHtml(e.message)}</div></div>`;
  }
}
