// Minimal markdown -> HTML renderer (CSP-safe, no external deps)
// Destekler: # başlık, **kalın**, *italik*, `code`, ```block```,
// - liste, 1. liste, > blockquote, ---, [text](url), [[wiki-link]],
// GFM tablo ( | a | b | / | --- | --- | )

const ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}

function inline(text) {
  let s = escapeHtml(text);
  // Wiki links [[file]] veya [[file|alias]]
  s = s.replace(/\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => {
    const label = alias ?? target;
    return `<a href="#" class="wiki-link" data-target="${target.trim()}">${label}</a>`;
  });
  // Resim ![alt](url) - sadece text fallback (CSP: img dış kaynak kapalı)
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt) => `<span class="img-placeholder">[img: ${alt || "—"}]</span>`);
  // Link [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const safe = /^https?:\/\//i.test(url) ? url : "#";
    const ext = safe !== "#" ? ' target="_blank" rel="noopener noreferrer"' : "";
    return `<a href="${escapeHtml(safe)}"${ext}>${label}</a>`;
  });
  // Inline code `x`
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  // Bold **x**
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Italic *x*
  s = s.replace(/(?<![*])\*([^*\n]+)\*(?![*])/g, "<em>$1</em>");
  return s;
}

function splitRow(line) {
  // " | a | b | " → ["a", "b"]
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function renderTable(tableLines) {
  if (tableLines.length < 2) return "";
  const headerCells = splitRow(tableLines[0]);
  const alignRow = splitRow(tableLines[1]);
  const aligns = alignRow.map((c) => {
    const left = c.startsWith(":");
    const right = c.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    if (left) return "left";
    return "";
  });
  const bodyRows = tableLines.slice(2).map(splitRow);

  const head = `<thead><tr>${headerCells.map((c, i) => {
    const a = aligns[i] ? ` style="text-align:${aligns[i]}"` : "";
    return `<th${a}>${inline(c)}</th>`;
  }).join("")}</tr></thead>`;
  const body = `<tbody>${bodyRows.map((row) =>
    `<tr>${row.map((c, i) => {
      const a = aligns[i] ? ` style="text-align:${aligns[i]}"` : "";
      return `<td${a}>${inline(c)}</td>`;
    }).join("")}</tr>`,
  ).join("")}</tbody>`;
  return `<table class="md-table">${head}${body}</table>`;
}

export function renderMarkdown(md) {
  const lines = md.split("\n");
  const out = [];
  let i = 0;
  let inCode = false;
  let codeBuf = [];
  let codeLang = "";

  const flushParagraph = (buf) => {
    if (buf.length === 0) return;
    out.push(`<p>${inline(buf.join(" "))}</p>`);
  };

  let paraBuf = [];
  let listType = null;   // "ul" | "ol" | null
  let listItems = [];

  const flushList = () => {
    if (listType) {
      const tag = listType;
      out.push(`<${tag}>`);
      for (const item of listItems) out.push(`<li>${inline(item)}</li>`);
      out.push(`</${tag}>`);
      listType = null;
      listItems = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // Code fence
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      if (inCode) {
        out.push(`<pre><code class="lang-${codeLang}">${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
        inCode = false;
        codeBuf = [];
        codeLang = "";
      } else {
        flushParagraph(paraBuf); paraBuf = [];
        flushList();
        inCode = true;
        codeLang = fence[1] || "";
      }
      i++; continue;
    }
    if (inCode) {
      codeBuf.push(line);
      i++; continue;
    }

    // Frontmatter (üstte --- ... --- bloğu) — gizle
    if (i === 0 && line.trim() === "---") {
      const end = lines.indexOf("---", 1);
      if (end > 0) { i = end + 1; continue; }
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line)) {
      flushParagraph(paraBuf); paraBuf = [];
      flushList();
      out.push("<hr/>");
      i++; continue;
    }

    // GFM tablo (| a | b |)
    // Şart: mevcut satır pipe içerir VE sonraki satır separator (| --- | --- |)
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      const tableLines = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      flushParagraph(paraBuf); paraBuf = [];
      flushList();
      out.push(renderTable(tableLines));
      continue;
    }

    // Headings
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      flushParagraph(paraBuf); paraBuf = [];
      flushList();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++; continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      flushParagraph(paraBuf); paraBuf = [];
      flushList();
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${inline(quote.join(" "))}</blockquote>`);
      continue;
    }

    // Lists
    const ulItem = line.match(/^[-*]\s+(.+)$/);
    const olItem = line.match(/^\d+\.\s+(.+)$/);
    if (ulItem) {
      flushParagraph(paraBuf); paraBuf = [];
      if (listType !== "ul") { flushList(); listType = "ul"; }
      listItems.push(ulItem[1]);
      i++; continue;
    }
    if (olItem) {
      flushParagraph(paraBuf); paraBuf = [];
      if (listType !== "ol") { flushList(); listType = "ol"; }
      listItems.push(olItem[1]);
      i++; continue;
    }

    // Blank line = paragraph break
    if (line.trim() === "") {
      flushParagraph(paraBuf); paraBuf = [];
      flushList();
      i++; continue;
    }

    // Paragraph accumulate
    flushList();
    paraBuf.push(line);
    i++;
  }

  flushParagraph(paraBuf);
  flushList();
  if (inCode) {
    out.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
  }
  return out.join("\n");
}
