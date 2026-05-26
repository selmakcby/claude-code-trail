import { readFile, stat } from "node:fs/promises";
import { basename, relative } from "node:path";
import { listSessionFiles, latestSessionFile } from "./claude-paths.ts";

export type ToolKind =
  | "Read" | "Edit" | "Write" | "MultiEdit" | "NotebookEdit"
  | "Bash" | "Grep" | "Glob"
  | "Agent" | "WebFetch" | "WebSearch"
  | "TodoWrite" | "Other";

const FILE_TOOLS: ToolKind[] = ["Read", "Edit", "Write", "MultiEdit", "NotebookEdit"];

export interface ToolEvent {
  index: number;
  timestamp: string | null;
  tool: ToolKind;
  toolRaw: string;
  filePath: string | null;     // dosya bazlı tool'lar için
  filePathRel: string | null;  // vault'a göreli
  summary: string;             // kısa özet (komut, query vs.)
  uuid: string | null;
}

export interface SessionSummary {
  id: string;
  path: string;
  startedAt: string | null;
  endedAt: string | null;
  messageCount: number;
  userTurnCount: number;
  assistantTurnCount: number;
  toolUseCount: number;
  toolBreakdown: Record<string, number>;
  models: string[];
  firstUserPrompt: string | null;
}

export interface SessionDetail extends SessionSummary {
  events: ToolEvent[];
  fileHeatmap: { path: string; pathRel: string; hits: number; tools: Record<string, number> }[];
}

export type MessageRole = "user" | "assistant";
export interface ConversationMessage {
  role: MessageRole;
  timestamp: string | null;
  text: string;          // birleştirilmiş tüm text content
  toolCalls: Array<{ tool: ToolKind; toolRaw: string; summary: string; uuid: string | null }>;
  isMeta: boolean;       // sistem mesajı (örn. /command, attachment, system reminder) ise true
}

export interface SessionConversation {
  id: string;
  startedAt: string | null;
  endedAt: string | null;
  messages: ConversationMessage[];
  truncated: boolean;    // çok büyükse kısaltıldı mı
}

function classifyTool(name: string): ToolKind {
  const known: ToolKind[] = [
    "Read", "Edit", "Write", "MultiEdit", "NotebookEdit",
    "Bash", "Grep", "Glob", "Agent", "WebFetch", "WebSearch", "TodoWrite",
  ];
  return (known as string[]).includes(name) ? (name as ToolKind) : "Other";
}

function summarize(tool: ToolKind, input: Record<string, unknown>): string {
  switch (tool) {
    case "Read":
    case "Edit":
    case "Write":
    case "MultiEdit":
    case "NotebookEdit": {
      const fp = input.file_path ?? input.notebook_path ?? "";
      return String(fp);
    }
    case "Bash":
      return String(input.description ?? input.command ?? "").slice(0, 120);
    case "Grep":
      return `pattern: ${String(input.pattern ?? "")}` + (input.path ? ` in ${input.path}` : "");
    case "Glob":
      return `pattern: ${String(input.pattern ?? "")}`;
    case "Agent": {
      const sub = String(input.subagent_type ?? "general");
      const desc = String(input.description ?? "").slice(0, 80);
      return `${sub}: ${desc}`;
    }
    case "WebFetch":
      return String(input.url ?? "").slice(0, 120);
    case "WebSearch":
      return String(input.query ?? "").slice(0, 120);
    case "TodoWrite": {
      const todos = Array.isArray(input.todos) ? (input.todos as unknown[]).length : 0;
      return `${todos} task`;
    }
    default: {
      const keys = Object.keys(input);
      return keys.length > 0 ? `${keys[0]}: ${String(input[keys[0]]).slice(0, 80)}` : "";
    }
  }
}

function extractFilePath(tool: ToolKind, input: Record<string, unknown>): string | null {
  if (!FILE_TOOLS.includes(tool)) return null;
  const fp = input.file_path ?? input.notebook_path;
  return typeof fp === "string" ? fp : null;
}

function toRel(filePath: string | null, vaultDir: string): string | null {
  if (!filePath) return null;
  if (!filePath.startsWith("/")) return filePath;
  const rel = relative(vaultDir, filePath);
  // vault dışı bir dosya ise tam yolla bırak
  if (rel.startsWith("..")) return filePath;
  return "/" + rel;
}

async function parseJsonl(sessionPath: string): Promise<unknown[]> {
  const raw = await readFile(sessionPath, "utf-8");
  const out: unknown[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed));
    } catch {
      // bozuk satırları atla
    }
  }
  return out;
}

function pickFirstUserText(records: unknown[]): string | null {
  for (const rec of records) {
    if (typeof rec !== "object" || rec === null) continue;
    const r = rec as Record<string, unknown>;
    if (r.type !== "user") continue;
    const msg = r.message as Record<string, unknown> | undefined;
    if (!msg) continue;
    const content = msg.content;
    if (typeof content === "string") {
      const t = content.trim();
      if (t && !t.startsWith("<")) return t.slice(0, 200);
    }
    if (Array.isArray(content)) {
      for (const c of content) {
        if (typeof c === "object" && c !== null) {
          const cc = c as Record<string, unknown>;
          if (cc.type === "text" && typeof cc.text === "string") {
            const t = cc.text.trim();
            if (t && !t.startsWith("<")) return t.slice(0, 200);
          }
        }
      }
    }
  }
  return null;
}

export async function parseSession(
  sessionPath: string,
  vaultDir: string,
): Promise<SessionDetail> {
  const records = await parseJsonl(sessionPath);
  const events: ToolEvent[] = [];
  const toolBreakdown: Record<string, number> = {};
  const heatmap = new Map<string, { hits: number; tools: Record<string, number> }>();
  const models = new Set<string>();
  let userTurnCount = 0;
  let assistantTurnCount = 0;
  let startedAt: string | null = null;
  let endedAt: string | null = null;
  let toolIndex = 0;

  for (const rec of records) {
    if (typeof rec !== "object" || rec === null) continue;
    const r = rec as Record<string, unknown>;
    const ts = typeof r.timestamp === "string" ? r.timestamp : null;
    if (ts) {
      if (!startedAt) startedAt = ts;
      endedAt = ts;
    }
    if (r.type === "user") userTurnCount++;
    if (r.type === "assistant") {
      assistantTurnCount++;
      const msg = r.message as Record<string, unknown> | undefined;
      if (msg) {
        if (typeof msg.model === "string") models.add(msg.model);
        const content = msg.content;
        if (Array.isArray(content)) {
          for (const c of content) {
            if (typeof c !== "object" || c === null) continue;
            const cc = c as Record<string, unknown>;
            if (cc.type !== "tool_use") continue;
            const name = typeof cc.name === "string" ? cc.name : "Other";
            const input = (cc.input as Record<string, unknown> | undefined) ?? {};
            const tool = classifyTool(name);
            toolBreakdown[tool] = (toolBreakdown[tool] ?? 0) + 1;
            const filePath = extractFilePath(tool, input);
            const filePathRel = toRel(filePath, vaultDir);
            events.push({
              index: toolIndex++,
              timestamp: ts,
              tool,
              toolRaw: name,
              filePath,
              filePathRel,
              summary: summarize(tool, input),
              uuid: typeof cc.id === "string" ? cc.id : null,
            });
            if (filePath) {
              const key = filePathRel ?? filePath;
              const entry = heatmap.get(key) ?? { hits: 0, tools: {} };
              entry.hits++;
              entry.tools[tool] = (entry.tools[tool] ?? 0) + 1;
              heatmap.set(key, entry);
            }
          }
        }
      }
    }
  }

  const fileHeatmap = Array.from(heatmap.entries())
    .map(([pathKey, v]) => ({
      path: pathKey,
      pathRel: pathKey.startsWith("/Users") ? pathKey : pathKey,
      hits: v.hits,
      tools: v.tools,
    }))
    .sort((a, b) => b.hits - a.hits);

  return {
    id: basename(sessionPath).replace(/\.jsonl$/, ""),
    path: sessionPath,
    startedAt,
    endedAt,
    messageCount: records.length,
    userTurnCount,
    assistantTurnCount,
    toolUseCount: events.length,
    toolBreakdown,
    models: Array.from(models),
    firstUserPrompt: pickFirstUserText(records),
    events,
    fileHeatmap,
  };
}

export async function currentTrail(vaultDir: string): Promise<SessionDetail | null> {
  const latest = await latestSessionFile(vaultDir);
  if (!latest) return null;
  return parseSession(latest, vaultDir);
}

export async function listSessions(vaultDir: string): Promise<SessionSummary[]> {
  const files = await listSessionFiles(vaultDir);
  const out: SessionSummary[] = [];
  for (const f of files.slice(0, 30)) {  // ilk 30 session
    try {
      const detail = await parseSession(f.path, vaultDir);
      const { events, fileHeatmap, ...summary } = detail;
      out.push(summary);
    } catch {
      // bozuksa atla
    }
  }
  return out;
}

const MAX_TEXT_PER_MESSAGE = 8_000;     // tek mesajda max karakter
const MAX_MESSAGES_PER_SESSION = 400;   // çok uzun session'larda tavan

function extractTextFromContent(content: unknown): { text: string; isMeta: boolean } {
  // String content
  if (typeof content === "string") {
    const trimmed = content.trim();
    const isMeta = trimmed.startsWith("<") || trimmed.startsWith("/");
    return { text: trimmed, isMeta };
  }
  if (!Array.isArray(content)) return { text: "", isMeta: false };
  const parts: string[] = [];
  let hasOnlyMeta = true;
  for (const c of content) {
    if (typeof c !== "object" || c === null) continue;
    const cc = c as Record<string, unknown>;
    if (cc.type === "text" && typeof cc.text === "string") {
      const t = cc.text.trim();
      if (!t) continue;
      const looksMeta = t.startsWith("<") || t.startsWith("system-reminder");
      if (!looksMeta) hasOnlyMeta = false;
      parts.push(t);
    } else if (cc.type === "tool_result") {
      // Tool result'ları conversation'a karıştırmıyoruz (zaten events'te)
      continue;
    } else if (cc.type === "image") {
      parts.push("[görsel]");
      hasOnlyMeta = false;
    }
  }
  return { text: parts.join("\n\n"), isMeta: hasOnlyMeta };
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + `\n\n…[${text.length - max} karakter daha gösterilmedi]`;
}

export async function parseConversation(
  sessionPath: string,
): Promise<SessionConversation> {
  const records = await parseJsonl(sessionPath);
  const messages: ConversationMessage[] = [];
  let startedAt: string | null = null;
  let endedAt: string | null = null;

  for (const rec of records) {
    if (typeof rec !== "object" || rec === null) continue;
    const r = rec as Record<string, unknown>;
    const ts = typeof r.timestamp === "string" ? r.timestamp : null;
    if (ts) {
      if (!startedAt) startedAt = ts;
      endedAt = ts;
    }

    if (r.type === "user") {
      const msg = r.message as Record<string, unknown> | undefined;
      if (!msg) continue;
      const { text, isMeta } = extractTextFromContent(msg.content);
      if (!text) continue;
      messages.push({
        role: "user",
        timestamp: ts,
        text: truncate(text, MAX_TEXT_PER_MESSAGE),
        toolCalls: [],
        isMeta,
      });
    } else if (r.type === "assistant") {
      const msg = r.message as Record<string, unknown> | undefined;
      if (!msg) continue;
      const content = msg.content;
      const textParts: string[] = [];
      const toolCalls: ConversationMessage["toolCalls"] = [];
      if (Array.isArray(content)) {
        for (const c of content) {
          if (typeof c !== "object" || c === null) continue;
          const cc = c as Record<string, unknown>;
          if (cc.type === "text" && typeof cc.text === "string") {
            const t = cc.text.trim();
            if (t) textParts.push(t);
          } else if (cc.type === "tool_use") {
            const name = typeof cc.name === "string" ? cc.name : "Other";
            const input = (cc.input as Record<string, unknown> | undefined) ?? {};
            const tool = classifyTool(name);
            toolCalls.push({
              tool,
              toolRaw: name,
              summary: summarize(tool, input),
              uuid: typeof cc.id === "string" ? cc.id : null,
            });
          }
        }
      }
      const fullText = textParts.join("\n\n");
      if (!fullText && toolCalls.length === 0) continue;
      messages.push({
        role: "assistant",
        timestamp: ts,
        text: truncate(fullText, MAX_TEXT_PER_MESSAGE),
        toolCalls,
        isMeta: false,
      });
    }
  }

  const truncated = messages.length > MAX_MESSAGES_PER_SESSION;
  const clipped = truncated ? messages.slice(-MAX_MESSAGES_PER_SESSION) : messages;

  return {
    id: basename(sessionPath).replace(/\.jsonl$/, ""),
    startedAt,
    endedAt,
    messages: clipped,
    truncated,
  };
}

export async function getSessionTokenCount(sessionPath: string): Promise<number> {
  // Kabaca: dosya boyutu / 4 ≈ token tahmini (geçici)
  const s = await stat(sessionPath).catch(() => null);
  if (!s) return 0;
  return Math.round(s.size / 4);
}
