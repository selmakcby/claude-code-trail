import { readFile, writeFile, stat } from "node:fs/promises";
import { realpath } from "node:fs/promises";
import { join, resolve, relative, basename } from "node:path";
import type { FileContent } from "./types.ts";
import { isProtectedFile, maskFileContent } from "./secret-guard.ts";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_WRITE_EXTENSIONS = new Set([".md", ".mdx", ".markdown", ".txt"]);

export class FileApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// Path traversal koruması: çözümlenmiş yol vault root içinde mi?
async function resolveSafePath(vaultRoot: string, requestedPath: string): Promise<string> {
  // Başındaki '/' kaldır, vault'a göreceli yap
  const clean = requestedPath.replace(/^\/+/, "");
  if (clean.includes("\0")) {
    throw new FileApiError("Geçersiz path", 400);
  }
  const target = resolve(vaultRoot, clean);

  // realpath ile symlink'leri de çöz
  let resolvedTarget: string;
  try {
    resolvedTarget = await realpath(target);
  } catch {
    // Yazma sırasında dosya henüz yok olabilir, parent dizini check et
    const parent = resolve(target, "..");
    try {
      const resolvedParent = await realpath(parent);
      if (!isInside(resolvedParent, vaultRoot)) {
        throw new FileApiError("Vault dışı yol", 403);
      }
      return target;
    } catch (e) {
      if (e instanceof FileApiError) throw e;
      throw new FileApiError("Dosya bulunamadı", 404);
    }
  }

  if (!isInside(resolvedTarget, vaultRoot)) {
    throw new FileApiError("Vault dışı yol", 403);
  }
  return resolvedTarget;
}

function isInside(child: string, parent: string): boolean {
  const rel = relative(parent, child);
  return !rel.startsWith("..") && !rel.startsWith("/");
}

export async function readFileSafe(vaultRoot: string, requestedPath: string): Promise<FileContent> {
  const absPath = await resolveSafePath(vaultRoot, requestedPath);
  const stats = await stat(absPath).catch(() => null);
  if (!stats) throw new FileApiError("Dosya bulunamadı", 404);
  if (stats.isDirectory()) throw new FileApiError("Bu bir klasör", 400);
  if (stats.size > MAX_FILE_SIZE) {
    throw new FileApiError(`Dosya çok büyük (${stats.size} byte, max ${MAX_FILE_SIZE})`, 413);
  }

  const name = basename(absPath);
  const protectedFile = isProtectedFile(name);
  const raw = await readFile(absPath, "utf-8");
  const content = protectedFile ? maskFileContent(name, raw) : raw;

  return {
    path: "/" + relative(vaultRoot, absPath),
    content,
    isProtected: protectedFile,
    size: stats.size,
  };
}

export async function writeFileSafe(
  vaultRoot: string,
  requestedPath: string,
  content: string,
): Promise<FileContent> {
  const absPath = await resolveSafePath(vaultRoot, requestedPath);
  const name = basename(absPath);

  if (isProtectedFile(name)) {
    throw new FileApiError("Bu dosya readonly (secret-guard)", 403);
  }

  const ext = name.includes(".") ? "." + name.split(".").pop()!.toLowerCase() : "";
  if (!ALLOWED_WRITE_EXTENSIONS.has(ext)) {
    throw new FileApiError(`Bu uzantıya yazma izni yok: ${ext || "(uzantısız)"}`, 403);
  }

  if (content.length > MAX_FILE_SIZE) {
    throw new FileApiError("İçerik çok büyük", 413);
  }

  await writeFile(absPath, content, "utf-8");
  const stats = await stat(absPath);
  return {
    path: "/" + relative(vaultRoot, absPath),
    content,
    isProtected: false,
    size: stats.size,
  };
}
