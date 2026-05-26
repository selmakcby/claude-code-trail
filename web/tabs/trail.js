import { api, setStatus } from "/app.js";

const TOOL_GLYPH = {
  Read: "→", Edit: "✎", Write: "✎", MultiEdit: "✎", NotebookEdit: "✎",
  Bash: "$", Grep: "?", Glob: "*", Agent: "◈",
  WebFetch: "↗", WebSearch: "⌕", TodoWrite: "✓", Other: "·",
};

const TOOL_LABEL_TR = {
  Read: "okuma",
  Edit: "düzenleme",
  Write: "yazma",
  MultiEdit: "çoklu düzenleme",
  NotebookEdit: "notebook",
  Bash: "komut",
  Grep: "metin arama",
  Glob: "dosya arama",
  Agent: "alt ajan",
  WebFetch: "web indirme",
  WebSearch: "web arama",
  TodoWrite: "görev planı",
  Other: "diğer",
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

function fmtTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  } catch { return iso; }
}

function fmtDuration(startIso, endIso) {
  if (!startIso || !endIso) return "—";
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}d ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}sa ${m % 60}d`;
}

function shortPath(p) {
  if (!p) return "";
  return p.length > 60 ? "…" + p.slice(-58) : p;
}

export async function renderTrailTab(container) {
  setStatus("trail yükleniyor…");
  const data = await api("/api/trail/current");
  if (data?.empty) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-mark">◷</div>
        <div class="empty-title">Bu projede henüz Claude patikası yok</div>
        <div class="empty-sub">
          <b>Patika nedir?</b> Claude'un bu projede dokunduğu dosyaların kronolojik kaydı —
          hangi dosya okundu, yazıldı, hangi komut çalıştırıldı, sırayla.<br/><br/>
          Bu projede Claude Code'da henüz hiç mesaj atılmamış.
          <code>claude</code> komutuyla başla, bir kaç mesaj at, sonra bu sekmeyi yenile.
        </div>
      </div>`;
    setStatus("session yok");
    return;
  }

  const totalTools = data.toolUseCount;
  const heat = data.fileHeatmap.slice(0, 30);
  const breakdownEntries = Object.entries(data.toolBreakdown).sort((a, b) => b[1] - a[1]);
  const maxBreakdown = breakdownEntries[0]?.[1] || 1;

  // İnsan dilinde özet cümlesi
  const topToolPair = breakdownEntries[0];
  const topFile = heat[0];
  const dur = fmtDuration(data.startedAt, data.endedAt);
  const human = [
    `Claude bu session'da <b>${totalTools} işlem</b> yaptı`,
    heat.length > 0 ? `<b>${heat.length} dosyaya</b> dokundu` : null,
    topToolPair ? `en çok <b>${TOOL_LABEL_TR[topToolPair[0]] ?? topToolPair[0]}</b> kullandı (${topToolPair[1]} kez)` : null,
    topFile ? `en çok temas: <code>${escapeHtml(shortPath(topFile.path))}</code> (${topFile.hits}×)` : null,
    dur !== "—" ? `süre <b>${dur}</b>` : null,
  ].filter(Boolean).join(" · ");

  container.innerHTML = `
    <div class="trail-page">
      <div class="page-header">
        <h1 class="page-title">Claude'un patikası</h1>
        <p class="page-sub">Aktif session'da Claude hangi dosyalara sırayla dokundu, hangi tool'ları kaç kere çağırdı.</p>
      </div>
      <div class="trail-human">${human}</div>
      <header class="trail-header">
        <div class="trail-meta">
          <div class="trail-title">
            <span class="trail-pill">aktif session</span>
            <span class="trail-id">${escapeHtml(data.id.slice(0, 8))}</span>
            <span class="trail-models">${data.models.map(escapeHtml).join(" · ")}</span>
          </div>
          <div class="trail-stats">
            <span><b>${data.userTurnCount}</b> kullanıcı</span>
            <span><b>${data.assistantTurnCount}</b> asistan</span>
            <span><b>${totalTools}</b> tool çağrısı</span>
            <span><b>${heat.length}</b> dosya</span>
            <span><b>${fmtDuration(data.startedAt, data.endedAt)}</b></span>
          </div>
        </div>
        ${data.firstUserPrompt ? `
          <div class="trail-firstprompt">
            <span class="trail-firstprompt-label">ilk prompt</span>
            <span class="trail-firstprompt-text">${escapeHtml(data.firstUserPrompt)}</span>
          </div>` : ""}
      </header>

      <section class="trail-breakdown">
        <h3 class="section-title">tool dağılımı</h3>
        <div class="breakdown-bars">
          ${breakdownEntries.map(([tool, count]) => `
            <div class="breakdown-row" title="${escapeHtml(tool)} — ${TOOL_LABEL_TR[tool] ?? "diğer"}">
              <span class="breakdown-tool">${TOOL_GLYPH[tool] ?? "·"} ${tool} <span class="breakdown-tool-tr">${TOOL_LABEL_TR[tool] ?? ""}</span></span>
              <div class="breakdown-bar"><div class="breakdown-bar-fill" style="width: ${(count / maxBreakdown) * 100}%"></div></div>
              <span class="breakdown-count">${count}×</span>
            </div>
          `).join("")}
        </div>
      </section>

      <section class="trail-heatmap">
        <h3 class="section-title">dosya ısı haritası</h3>
        <div class="heatmap-list">
          ${heat.map((h) => {
            const intensity = Math.min(1, h.hits / (heat[0]?.hits || 1));
            return `
              <div class="heatmap-row" style="--heat: ${intensity}">
                <span class="heatmap-hits">${h.hits}×</span>
                <span class="heatmap-path">${escapeHtml(shortPath(h.path))}</span>
                <span class="heatmap-tools">${Object.keys(h.tools).map((t) => TOOL_GLYPH[t] ?? "·").join("")}</span>
              </div>`;
          }).join("")}
        </div>
      </section>

      <section class="trail-timeline-wrap">
        <h3 class="section-title">
          patika — kronolojik
          <span class="section-sub">
            <span class="scrub-label">zamanı geri sar</span>
            <input type="range" id="trail-scrub" min="0" max="${totalTools - 1}" value="${totalTools - 1}" aria-label="patika zamanı" />
            <span class="scrub-pos" id="trail-scrub-pos">${totalTools}/${totalTools}</span>
          </span>
        </h3>
        <p class="trail-timeline-hint">Sürgüyü sola çek — Claude'un ilk adımından şu ana kadar adım adım gör. Aktif adım vurgulanır.</p>
        <div class="trail-timeline" id="trail-timeline">
          ${data.events.map((e) => `
            <div class="trail-event" data-idx="${e.index}" data-tool="${escapeHtml(e.tool)}">
              <span class="trail-event-glyph">${TOOL_GLYPH[e.tool] ?? "·"}</span>
              <span class="trail-event-tool" title="${escapeHtml(TOOL_LABEL_TR[e.tool] ?? "diğer")}">${escapeHtml(e.tool)}</span>
              <span class="trail-event-summary">${escapeHtml(e.summary || "—")}</span>
              <span class="trail-event-time">${fmtTime(e.timestamp)}</span>
            </div>
          `).join("")}
        </div>
      </section>
    </div>
  `;

  const scrub = container.querySelector("#trail-scrub");
  const scrubPos = container.querySelector("#trail-scrub-pos");
  const events = container.querySelectorAll(".trail-event");
  scrub.addEventListener("input", () => {
    const cutoff = parseInt(scrub.value, 10);
    scrubPos.textContent = `${cutoff + 1}/${totalTools}`;
    events.forEach((el) => {
      const idx = parseInt(el.dataset.idx, 10);
      el.classList.toggle("future", idx > cutoff);
      el.classList.toggle("current", idx === cutoff);
    });
    const currentEl = container.querySelector(".trail-event.current");
    if (currentEl) currentEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
  scrub.dispatchEvent(new Event("input"));

  setStatus(`${totalTools} tool · ${heat.length} dosya`);
}
