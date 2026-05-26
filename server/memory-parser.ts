import { readdir, readFile, stat, writeFile, unlink } from "node:fs/promises";
import { join, basename } from "node:path";
import { projectMemoryDir } from "./claude-paths.ts";

export type MemoryType = "user" | "feedback" | "project" | "reference" | "other";

export interface MemoryItem {
  file: string;             // dosya adı (ör: feedback_testing.md)
  title: string;            // frontmatter name veya filename
  description: string;
  type: MemoryType;
  body: string;             // frontmatter sonrası içerik
  raw: string;              // ham dosya içeriği
  mtimeMs: number;
  sizeBytes: number;
  originSessionId: string | null;
}

export interface MemoryIndex {
  exists: boolean;
  memoryDir: string;
  indexContent: string;     // MEMORY.md raw içeriği
  items: MemoryItem[];
  countsByType: Record<MemoryType, number>;
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
  for (let i = 1; i < endIdx; i++) {
    const line = lines[i];
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    fields[key] = value;
  }
  const body = lines.slice(endIdx + 1).join("\n").trimStart();
  return { fields, body };
}

function classifyType(t: string | undefined): MemoryType {
  const v = (t ?? "").toLowerCase();
  if (v === "user" || v === "feedback" || v === "project" || v === "reference") return v;
  return "other";
}

export async function readMemoryIndex(vaultDir: string): Promise<MemoryIndex> {
  const memoryDir = projectMemoryDir(vaultDir);
  const result: MemoryIndex = {
    exists: false,
    memoryDir,
    indexContent: "",
    items: [],
    countsByType: { user: 0, feedback: 0, project: 0, reference: 0, other: 0 },
  };

  let entries: string[] = [];
  try {
    entries = await readdir(memoryDir);
    result.exists = true;
  } catch {
    return result;
  }

  try {
    result.indexContent = await readFile(join(memoryDir, "MEMORY.md"), "utf-8");
  } catch {
    result.indexContent = "";
  }

  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    if (entry === "MEMORY.md") continue;
    const filePath = join(memoryDir, entry);
    const s = await stat(filePath).catch(() => null);
    if (!s || !s.isFile()) continue;
    const raw = await readFile(filePath, "utf-8").catch(() => "");
    const { fields, body } = parseFrontmatter(raw);
    const type = classifyType(fields.type);
    const item: MemoryItem = {
      file: entry,
      title: fields.name ?? entry.replace(/\.md$/, "").replace(/_/g, " "),
      description: fields.description ?? "",
      type,
      body,
      raw,
      mtimeMs: s.mtimeMs,
      sizeBytes: s.size,
      originSessionId: fields.originSessionId ?? null,
    };
    result.items.push(item);
    result.countsByType[type]++;
  }
  result.items.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return result;
}

export async function readMemoryFile(vaultDir: string, file: string): Promise<string> {
  const safe = sanitizeName(file);
  const path = join(projectMemoryDir(vaultDir), safe);
  return readFile(path, "utf-8");
}

export async function writeMemoryFile(
  vaultDir: string,
  file: string,
  content: string,
): Promise<void> {
  const safe = sanitizeName(file);
  const path = join(projectMemoryDir(vaultDir), safe);
  if (content.length > 100_000) throw new Error("memory file too large (>100KB)");
  await writeFile(path, content, "utf-8");
}

function memorySlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/i̇/g, "i")
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i")
    .replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);
}

export interface CreatedMemory {
  file: string;
  title: string;
  type: MemoryType;
}

export async function createMemoryFile(
  vaultDir: string,
  params: { title: string; description: string; type: MemoryType; body: string },
): Promise<CreatedMemory> {
  const dir = projectMemoryDir(vaultDir);
  try {
    await readdir(dir);
  } catch {
    // klasör yoksa oluştur (mkdir)
    const { mkdir } = await import("node:fs/promises");
    await mkdir(dir, { recursive: true });
  }
  const title = (params.title || "").trim();
  if (!title) throw new Error("title required");
  const slug = memorySlug(title) || `memory_${Date.now()}`;
  const type = params.type;
  const fileBase = `${type}_${slug}`;
  let file = `${fileBase}.md`;
  // çakışma varsa _2, _3 ekle
  const existing = new Set(await readdir(dir));
  let n = 2;
  while (existing.has(file)) {
    file = `${fileBase}_${n}.md`;
    n++;
  }
  const frontmatter = [
    "---",
    `name: ${title}`,
    `description: ${(params.description || "").trim()}`,
    `type: ${type}`,
    "---",
  ].join("\n");
  const content = frontmatter + "\n" + (params.body || "").trim() + "\n";
  await writeFile(join(dir, file), content, "utf-8");
  return { file, title, type };
}

export async function deleteMemoryFile(vaultDir: string, file: string): Promise<void> {
  const safe = sanitizeName(file);
  if (safe === "MEMORY.md") throw new Error("MEMORY.md cannot be deleted");
  const path = join(projectMemoryDir(vaultDir), safe);
  await unlink(path);
}

function sanitizeName(file: string): string {
  // Sadece dosya adı, path olmasın
  const base = basename(file);
  if (!/^[A-Za-z0-9._-]+$/.test(base)) throw new Error("invalid file name");
  if (!base.endsWith(".md")) throw new Error("only .md files");
  return base;
}
