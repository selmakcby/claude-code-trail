import { homedir } from "node:os";
import { join, basename } from "node:path";
import { readdir, stat, readFile } from "node:fs/promises";

// `/Users/selma/youtube-brain` → `-Users-selma-youtube-brain`
export function encodeProjectPath(absPath: string): string {
  return absPath.replace(/\//g, "-");
}

export function claudeProjectsRoot(): string {
  return join(homedir(), ".claude", "projects");
}

export function projectClaudeDir(vaultDir: string): string {
  return join(claudeProjectsRoot(), encodeProjectPath(vaultDir));
}

export function projectMemoryDir(vaultDir: string): string {
  return join(projectClaudeDir(vaultDir), "memory");
}

// Tüm session jsonl dosyalarını mtime'a göre sırala (en yenisi başta)
export async function listSessionFiles(
  vaultDir: string,
): Promise<{ path: string; mtimeMs: number; sizeBytes: number; id: string }[]> {
  const dir = projectClaudeDir(vaultDir);
  let entries: string[] = [];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  const files = entries.filter((e) => e.endsWith(".jsonl"));
  const out = await Promise.all(
    files.map(async (f) => {
      const p = join(dir, f);
      const s = await stat(p).catch(() => null);
      return s
        ? { path: p, mtimeMs: s.mtimeMs, sizeBytes: s.size, id: f.replace(/\.jsonl$/, "") }
        : null;
    }),
  );
  return out
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

export async function latestSessionFile(vaultDir: string): Promise<string | null> {
  const files = await listSessionFiles(vaultDir);
  return files[0]?.path ?? null;
}

// Encoded "-Users-selma-youtube-brain" → "/Users/selma/youtube-brain"
// Lossy: bazı klasör isimleri tire içerirse karışabilir, cwd fallback kullanırız
function decodeEncodedPath(encoded: string): string {
  if (!encoded.startsWith("-")) return encoded;
  return "/" + encoded.slice(1).replace(/-/g, "/");
}

// Session log içinden gerçek cwd çıkar (lossy decode düzeltmesi için)
async function tryReadCwdFromSession(dir: string): Promise<string | null> {
  try {
    const files = await readdir(dir);
    const sessions = files.filter((f) => f.endsWith(".jsonl"));
    if (sessions.length === 0) return null;
    // En son modify edilen session'a bak (ilk satırlarda cwd genelde var)
    let latest: { path: string; mt: number } | null = null;
    for (const sf of sessions) {
      const s = await stat(join(dir, sf)).catch(() => null);
      if (s && (!latest || s.mtimeMs > latest.mt)) {
        latest = { path: join(dir, sf), mt: s.mtimeMs };
      }
    }
    if (!latest) return null;
    const raw = await readFile(latest.path, "utf-8");
    // İlk 100 satırı tara
    for (const line of raw.split("\n").slice(0, 100)) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (typeof obj.cwd === "string") return obj.cwd;
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return null;
}

export interface ProjectInfo {
  encoded: string;          // ~/.claude/projects/<encoded>
  vaultDir: string;         // gerçek (veya decoded) path
  displayName: string;      // UI için kısa ad (basename(vaultDir))
  decodedHeuristic: boolean;// cwd bulunamadı, tahminle decode edildi
  lastActivityMs: number;
  sessionCount: number;
  vaultExists: boolean;     // klasör hala var mı (silinmiş projeler için)
}

export async function discoverProjects(): Promise<ProjectInfo[]> {
  const root = claudeProjectsRoot();
  let entries: string[] = [];
  try {
    entries = await readdir(root);
  } catch {
    return [];
  }

  const out: ProjectInfo[] = [];
  for (const encoded of entries) {
    if (encoded.startsWith(".")) continue;
    const dir = join(root, encoded);
    const s = await stat(dir).catch(() => null);
    if (!s || !s.isDirectory()) continue;

    let lastActivityMs = s.mtimeMs;
    let sessionCount = 0;
    try {
      const files = await readdir(dir);
      const sessions = files.filter((f) => f.endsWith(".jsonl"));
      sessionCount = sessions.length;
      for (const sf of sessions) {
        const sst = await stat(join(dir, sf)).catch(() => null);
        if (sst && sst.mtimeMs > lastActivityMs) lastActivityMs = sst.mtimeMs;
      }
    } catch { /* skip */ }

    // Vault dir tespiti
    const cwd = await tryReadCwdFromSession(dir);
    const vaultDir = cwd ?? decodeEncodedPath(encoded);
    const decodedHeuristic = !cwd;

    // Klasör hala var mı
    const exists = await stat(vaultDir).then((s2) => s2.isDirectory()).catch(() => false);

    out.push({
      encoded,
      vaultDir,
      displayName: basename(vaultDir),
      decodedHeuristic,
      lastActivityMs,
      sessionCount,
      vaultExists: exists,
    });
  }

  // En son aktif olanlar üstte
  out.sort((a, b) => b.lastActivityMs - a.lastActivityMs);
  return out;
}
