import { readdir, mkdir, stat, readFile, writeFile, unlink } from "node:fs/promises";
import { join, relative, basename } from "node:path";

// Notlar klasörü: vault root içinde /notlar/
// (Mevcutsa kullanılır, yoksa otomatik oluşturulur)
const NOTES_DIR_NAME = "notlar";

function notesDirPath(vaultDir: string): string {
  return join(vaultDir, NOTES_DIR_NAME);
}

export async function ensureNotesDir(vaultDir: string): Promise<string> {
  const dir = notesDirPath(vaultDir);
  await mkdir(dir, { recursive: true });
  return dir;
}

// listNotes için non-creating versiyon: klasör yoksa OLUŞTURMAZ —
// sadece okuyup raporlar. writable = "klasör yazılabilir VEYA üst dizin
// yazılabilir (yani gerektiğinde oluşturabiliriz)". Bu sayede yanlış
// projeye girip listeyi açan kullanıcı, istemediği yerlere `notlar/`
// klasörü dağıtmaz; not oluşturduğunda createNote() klasörü oluşturur.
async function probeNotesDir(vaultDir: string): Promise<{ dir: string; exists: boolean; writable: boolean }> {
  const dir = notesDirPath(vaultDir);
  const s = await stat(dir).catch(() => null);
  if (s && s.isDirectory()) {
    // Mevcut klasör — yazılabilir mi?
    try {
      await readdir(dir);
      // readdir başarılı = okunabilir; yazma testi için fs.access W_OK ideal
      // ama burada vault writeable ise yeterli kabul edelim
      const vaultStat = await stat(vaultDir).catch(() => null);
      return { dir, exists: true, writable: !!vaultStat };
    } catch {
      return { dir, exists: true, writable: false };
    }
  }
  // Klasör yok — üst dizin (vault) yazılabilir mi?
  const vaultStat = await stat(vaultDir).catch(() => null);
  return { dir, exists: false, writable: !!vaultStat && vaultStat.isDirectory() };
}

export interface NoteSummary {
  file: string;        // dosya adı, ör: "2026-05-25-1547-fikir.md"
  path: string;        // vault'a göreli, ör: "/notlar/2026-05-25-1547-fikir.md"
  title: string;       // başlık (ilk # satırı veya dosya adı)
  preview: string;     // gövdeden ilk birkaç satır
  mtimeMs: number;
  sizeBytes: number;
}

export interface NotesIndex {
  dir: string;         // vault'a göreli (örn: "/notlar")
  absDir: string;      // mutlak yol
  items: NoteSummary[];
  writable: boolean;   // notlar/ oluşturulup yazılabiliyor mu (false → kullanıcı yanlış proje seçmiş olabilir)
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/i̇/g, "i")           // İ → i (combining dot above artifact'ını temizle)
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i")
    .replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")  // kalan combining diacritic'leri sil
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export async function listNotes(vaultDir: string): Promise<NotesIndex> {
  const { dir: absDir, exists, writable } = await probeNotesDir(vaultDir);
  let entries: string[] = [];
  if (exists) {
    try {
      entries = await readdir(absDir);
    } catch { /* yetki yok / okunamadı, items boş */ }
  }
  const items: NoteSummary[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const abs = join(absDir, entry);
    const s = await stat(abs).catch(() => null);
    if (!s || !s.isFile()) continue;
    const raw = await readFile(abs, "utf-8").catch(() => "");
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    let title = entry.replace(/\.md$/, "");
    let preview = "";
    if (lines[0]?.startsWith("#")) {
      title = lines[0].replace(/^#+\s*/, "");
      preview = lines.slice(1, 4).join(" ");
    } else {
      preview = lines.slice(0, 3).join(" ");
    }
    items.push({
      file: entry,
      path: "/" + relative(vaultDir, abs),
      title: title || entry.replace(/\.md$/, ""),
      preview: preview.replace(/[#*`\[\]]/g, "").slice(0, 180),
      mtimeMs: s.mtimeMs,
      sizeBytes: s.size,
    });
  }
  items.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return {
    dir: "/" + relative(vaultDir, absDir),
    absDir,
    items,
    writable,
  };
}

export interface CreatedNote {
  file: string;
  path: string;
  title: string;
  content: string;
}

export async function deleteNote(vaultDir: string, file: string): Promise<void> {
  const safe = basename(file);
  if (!/^[A-Za-z0-9._-]+$/.test(safe)) throw new Error("geçersiz dosya adı");
  if (!safe.endsWith(".md")) throw new Error("sadece .md");
  const absDir = await ensureNotesDir(vaultDir);
  await unlink(join(absDir, safe));
}

export async function createNote(
  vaultDir: string,
  title?: string,
): Promise<CreatedNote> {
  const absDir = await ensureNotesDir(vaultDir);
  const cleanTitle = (title ?? "").trim();
  const stamp = timestamp();
  const slug = cleanTitle ? slugify(cleanTitle) : "";
  const filename = slug ? `${stamp}-${slug}.md` : `${stamp}.md`;
  const abs = join(absDir, filename);

  const displayTitle = cleanTitle || "Yeni not";
  const initial = `# ${displayTitle}\n\n`;
  await writeFile(abs, initial, "utf-8");

  return {
    file: filename,
    path: "/" + relative(vaultDir, abs),
    title: displayTitle,
    content: initial,
  };
}
