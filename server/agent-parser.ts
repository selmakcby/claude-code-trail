import { readdir, readFile, stat } from "node:fs/promises";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import { listSessionFiles } from "./claude-paths.ts";

export type AgentScope = "project" | "global";

export interface AgentDef {
  scope: AgentScope;
  file: string;          // tam yol
  fileName: string;      // sadece dosya adı
  name: string;
  description: string;
  tools: string[];       // frontmatter'dan, opsiyonel
  model: string | null;
  systemPromptPreview: string;  // body'nin ilk 800 karakteri
  body: string;
  usageCount: number;    // session log'larda çağrı sayısı
  lastUsedAt: string | null;
}

interface Frontmatter {
  fields: Record<string, string>;
  body: string;
}

function parseFrontmatter(raw: string): Frontmatter {
  if (!raw.startsWith("---")) return { fields: {}, body: raw };
  const lines = raw.split("\n");
  const endIdx = lines.indexOf("---", 1);
  if (endIdx === -1) return { fields: {}, body: raw };
  const fields: Record<string, string> = {};
  let i = 1;
  while (i < endIdx) {
    const line = lines[i];
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) { i++; continue; }
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    // Multi-line string desteği (basit): sonraki satır boşlukla başlıyorsa ekle
    while (i + 1 < endIdx && /^\s+\S/.test(lines[i + 1])) {
      value += " " + lines[i + 1].trim();
      i++;
    }
    fields[key] = value;
    i++;
  }
  const body = lines.slice(endIdx + 1).join("\n").trimStart();
  return { fields, body };
}

function parseToolsField(s: string): string[] {
  if (!s) return [];
  // "Read, Edit, Bash" veya "*" veya "[Read, Edit]"
  const cleaned = s.replace(/^\[|\]$/g, "");
  return cleaned.split(",").map((x) => x.trim()).filter(Boolean);
}

async function readAgentsFromDir(
  dir: string,
  scope: AgentScope,
): Promise<AgentDef[]> {
  let entries: string[] = [];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  const out: AgentDef[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const filePath = join(dir, entry);
    const s = await stat(filePath).catch(() => null);
    if (!s || !s.isFile()) continue;
    const raw = await readFile(filePath, "utf-8").catch(() => "");
    const { fields, body } = parseFrontmatter(raw);
    out.push({
      scope,
      file: filePath,
      fileName: entry,
      name: fields.name ?? entry.replace(/\.md$/, ""),
      description: fields.description ?? "",
      tools: parseToolsField(fields.tools ?? ""),
      model: fields.model || null,
      systemPromptPreview: body.slice(0, 800),
      body,
      usageCount: 0,
      lastUsedAt: null,
    });
  }
  return out;
}

// Session log'larda Agent tool_use'ları sayar
async function countAgentUsage(
  vaultDir: string,
  agentsByName: Map<string, AgentDef>,
  maxSessions = 20,
): Promise<void> {
  const sessions = await listSessionFiles(vaultDir);
  for (const sess of sessions.slice(0, maxSessions)) {
    let raw: string;
    try {
      raw = await readFile(sess.path, "utf-8");
    } catch {
      continue;
    }
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let rec: unknown;
      try {
        rec = JSON.parse(trimmed);
      } catch {
        continue;
      }
      if (typeof rec !== "object" || rec === null) continue;
      const r = rec as Record<string, unknown>;
      if (r.type !== "assistant") continue;
      const msg = r.message as Record<string, unknown> | undefined;
      if (!msg) continue;
      const content = msg.content;
      if (!Array.isArray(content)) continue;
      const ts = typeof r.timestamp === "string" ? r.timestamp : null;
      for (const c of content) {
        if (typeof c !== "object" || c === null) continue;
        const cc = c as Record<string, unknown>;
        if (cc.type !== "tool_use" || cc.name !== "Agent") continue;
        const input = (cc.input as Record<string, unknown> | undefined) ?? {};
        const subagent = typeof input.subagent_type === "string" ? input.subagent_type : null;
        if (!subagent) continue;
        const target = agentsByName.get(subagent);
        if (!target) continue;
        target.usageCount++;
        if (ts && (!target.lastUsedAt || ts > target.lastUsedAt)) {
          target.lastUsedAt = ts;
        }
      }
    }
  }
}

export interface AgentActivity {
  agentName: string;
  sessionId: string;
  sessionPath: string;
  timestamp: string | null;
  toolUseId: string | null;
  description: string;
  prompt: string;
  promptTruncated: boolean;
  resultPreview: string;
  resultTruncated: boolean;
  estimatedTokens: number;     // turn'ün toplam token kullanımı (parent + subagent)
  durationMs: number | null;   // tool_use → tool_result arası
}

export async function getAgentActivity(
  vaultDir: string,
  agentName: string,
  maxSessions = 50,
): Promise<AgentActivity[]> {
  const sessions = await listSessionFiles(vaultDir);
  const activities: AgentActivity[] = [];

  for (const sess of sessions.slice(0, maxSessions)) {
    let raw: string;
    try {
      raw = await readFile(sess.path, "utf-8");
    } catch {
      continue;
    }

    // Tool_use_id → tool_result eşleştirme için iki geçiş
    const lines = raw.split("\n").filter((l) => l.trim());
    type ParsedLine = Record<string, unknown> & { _idx: number };
    const records: ParsedLine[] = [];
    for (let i = 0; i < lines.length; i++) {
      try {
        const obj = JSON.parse(lines[i]) as Record<string, unknown>;
        records.push(Object.assign(obj, { _idx: i }));
      } catch { /* skip */ }
    }

    // Tool result map: tool_use_id → { text, timestamp }
    const resultsByUseId = new Map<string, { text: string; timestamp: string | null }>();
    for (const r of records) {
      if (r.type !== "user") continue;
      const msg = r.message as Record<string, unknown> | undefined;
      if (!msg) continue;
      const content = msg.content;
      if (!Array.isArray(content)) continue;
      for (const c of content) {
        if (typeof c !== "object" || c === null) continue;
        const cc = c as Record<string, unknown>;
        if (cc.type !== "tool_result" || typeof cc.tool_use_id !== "string") continue;
        // tool_result content text veya array of {type:text, text}
        let text = "";
        if (typeof cc.content === "string") {
          text = cc.content;
        } else if (Array.isArray(cc.content)) {
          for (const sub of cc.content) {
            if (typeof sub === "object" && sub !== null) {
              const ss = sub as Record<string, unknown>;
              if (ss.type === "text" && typeof ss.text === "string") {
                text += (text ? "\n" : "") + ss.text;
              }
            }
          }
        }
        const ts = typeof r.timestamp === "string" ? r.timestamp : null;
        resultsByUseId.set(cc.tool_use_id, { text, timestamp: ts });
      }
    }

    // Agent çağrılarını bul
    for (const r of records) {
      if (r.type !== "assistant") continue;
      const msg = r.message as Record<string, unknown> | undefined;
      if (!msg) continue;
      const content = msg.content;
      if (!Array.isArray(content)) continue;
      const usage = (msg.usage as Record<string, unknown> | undefined) ?? {};
      const usageInput = Number(usage.input_tokens ?? 0);
      const usageOutput = Number(usage.output_tokens ?? 0);
      const usageCacheRead = Number(usage.cache_read_input_tokens ?? 0);
      const usageCacheCreate = Number(usage.cache_creation_input_tokens ?? 0);
      const turnTokens = usageInput + usageOutput + usageCacheRead + usageCacheCreate;
      const ts = typeof r.timestamp === "string" ? r.timestamp : null;

      for (const c of content) {
        if (typeof c !== "object" || c === null) continue;
        const cc = c as Record<string, unknown>;
        if (cc.type !== "tool_use" || cc.name !== "Agent") continue;
        const input = (cc.input as Record<string, unknown> | undefined) ?? {};
        const subagent = typeof input.subagent_type === "string" ? input.subagent_type : "";
        if (subagent !== agentName) continue;

        const toolUseId = typeof cc.id === "string" ? cc.id : null;
        const description = typeof input.description === "string" ? input.description : "";
        const promptRaw = typeof input.prompt === "string" ? input.prompt : "";
        const promptMaxLen = 2000;
        const promptTruncated = promptRaw.length > promptMaxLen;
        const prompt = promptTruncated ? promptRaw.slice(0, promptMaxLen) : promptRaw;

        const matchedResult = toolUseId ? resultsByUseId.get(toolUseId) : undefined;
        const resultMaxLen = 1500;
        const resultText = matchedResult?.text ?? "";
        const resultTruncated = resultText.length > resultMaxLen;
        const resultPreview = resultTruncated ? resultText.slice(0, resultMaxLen) : resultText;

        let durationMs: number | null = null;
        if (ts && matchedResult?.timestamp) {
          durationMs = new Date(matchedResult.timestamp).getTime() - new Date(ts).getTime();
        }

        activities.push({
          agentName: subagent,
          sessionId: basename(sess.path).replace(/\.jsonl$/, ""),
          sessionPath: sess.path,
          timestamp: ts,
          toolUseId,
          description,
          prompt,
          promptTruncated,
          resultPreview,
          resultTruncated,
          estimatedTokens: turnTokens,
          durationMs,
        });
      }
    }
  }

  // En yeniler üstte
  activities.sort((a, b) => {
    const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return tb - ta;
  });
  return activities;
}

export async function listAgents(vaultDir: string): Promise<AgentDef[]> {
  const projectAgents = await readAgentsFromDir(
    join(vaultDir, ".claude", "agents"),
    "project",
  );
  const globalAgents = await readAgentsFromDir(
    join(homedir(), ".claude", "agents"),
    "global",
  );
  // Aynı isim varsa: proje globali ezer
  const byName = new Map<string, AgentDef>();
  for (const a of globalAgents) byName.set(a.name, a);
  for (const a of projectAgents) byName.set(a.name, a);  // proje override

  await countAgentUsage(vaultDir, byName);

  const all = Array.from(byName.values()).sort((a, b) => {
    if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
    return a.name.localeCompare(b.name);
  });
  return all;
}
