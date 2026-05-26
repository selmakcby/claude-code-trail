import { file } from "bun";
import { join, dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { scanVault } from "./vault-scanner.ts";
import { readFileSafe, writeFileSafe, FileApiError } from "./file-api.ts";
import { currentTrail, listSessions, parseSession, parseConversation } from "./session-parser.ts";
import {
  readMemoryIndex,
  readMemoryFile,
  writeMemoryFile,
  deleteMemoryFile,
  createMemoryFile,
} from "./memory-parser.ts";
import type { MemoryType } from "./memory-parser.ts";
import { listAgents, getAgentActivity } from "./agent-parser.ts";
import { listSessionFiles, projectClaudeDir, discoverProjects } from "./claude-paths.ts";
import { listNotes, createNote, deleteNote } from "./notes-api.ts";
import type { ApiResponse } from "./types.ts";

const VAULT_DIR = resolve(process.env.VAULT_DIR ?? process.cwd());
const PORT = parseInt(process.env.PORT ?? "7777", 10);

// İzinli vault dir listesi (path traversal koruması):
// - Start time'da verilen VAULT_DIR daima izinli
// - Plus discovered projects (cache, ilk istekte hesaplanır)
let allowedVaultDirs: Set<string> = new Set([VAULT_DIR]);
let projectsCacheTimeMs = 0;
const PROJECTS_CACHE_TTL_MS = 15_000;

async function refreshAllowedVaults(): Promise<void> {
  if (Date.now() - projectsCacheTimeMs < PROJECTS_CACHE_TTL_MS) return;
  try {
    const discovered = await discoverProjects();
    const set = new Set<string>([VAULT_DIR]);
    for (const p of discovered) {
      if (p.vaultExists) set.add(resolve(p.vaultDir));
    }
    allowedVaultDirs = set;
    projectsCacheTimeMs = Date.now();
  } catch { /* keep existing */ }
}

// Query'den ?project= varsa onu kullan, doğrula. Yoksa default VAULT_DIR.
async function resolveVaultDir(url: URL): Promise<string> {
  const requested = url.searchParams.get("project");
  if (!requested) return VAULT_DIR;
  const abs = resolve(requested);
  await refreshAllowedVaults();
  if (!allowedVaultDirs.has(abs)) {
    throw new Error(`Disallowed project path (${abs}). Must be discovered first.`);
  }
  return abs;
}
const PLUGIN_DIR = resolve(
  process.env.PLUGIN_DIR ?? join(dirname(fileURLToPath(import.meta.url)), ".."),
);
const WEB_DIR = join(PLUGIN_DIR, "web");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy":
    "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

function ok<T>(data: T, init?: ResponseInit): Response {
  const body: ApiResponse<T> = { success: true, data, error: null };
  return jsonResponse(body, init);
}

function err(message: string, status = 400): Response {
  const body: ApiResponse<null> = { success: false, data: null, error: message };
  return jsonResponse(body, { status });
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...SECURITY_HEADERS,
      ...(init.headers ?? {}),
    },
  });
}

async function serveStatic(pathname: string): Promise<Response> {
  // Index'e fallback
  const requested = pathname === "/" ? "/index.html" : pathname;
  const safePath = requested.replace(/\.\./g, "");
  const filePath = join(WEB_DIR, safePath);

  // WEB_DIR dışına çıkmadığını doğrula
  if (!filePath.startsWith(WEB_DIR)) {
    return new Response("Forbidden", { status: 403, headers: SECURITY_HEADERS });
  }

  const f = file(filePath);
  const exists = await f.exists();
  if (!exists) {
    return new Response("Not found", { status: 404, headers: SECURITY_HEADERS });
  }
  const ext = extname(filePath);
  const mime = MIME[ext] ?? "application/octet-stream";
  return new Response(f, {
    headers: {
      "Content-Type": mime,
      ...SECURITY_HEADERS,
    },
  });
}

async function handleApi(req: Request, url: URL): Promise<Response> {
  // GET /api/projects — keşfedilen projeler (vault dışı, sticky)
  if (url.pathname === "/api/projects" && req.method === "GET") {
    try {
      const projects = await discoverProjects();
      await refreshAllowedVaults();
      return ok({
        defaultVault: VAULT_DIR,
        projects,
      });
    } catch (e) {
      return err((e as Error).message, 500);
    }
  }

  // Diğer endpoint'ler: ?project= ile vault override
  let vault: string;
  try {
    vault = await resolveVaultDir(url);
  } catch (e) {
    return err((e as Error).message, 403);
  }

  // GET /api/health
  if (url.pathname === "/api/health") {
    return ok({
      status: "ok",
      vault,
      defaultVault: VAULT_DIR,
      port: PORT,
      claudeDir: projectClaudeDir(vault),
    });
  }

  // GET /api/tree
  if (url.pathname === "/api/tree" && req.method === "GET") {
    const tree = await scanVault(vault);
    return ok(tree);
  }

  // GET /api/file?path=/foo/bar.md
  if (url.pathname === "/api/file" && req.method === "GET") {
    const path = url.searchParams.get("path");
    if (!path) return err("path query param required");
    try {
      const data = await readFileSafe(vault, path);
      return ok(data);
    } catch (e) {
      if (e instanceof FileApiError) return err(e.message, e.status);
      return err((e as Error).message, 500);
    }
  }

  // PUT /api/file?path=/foo/bar.md   body: { content: "..." }
  if (url.pathname === "/api/file" && req.method === "PUT") {
    const path = url.searchParams.get("path");
    if (!path) return err("path query param required");
    let body: { content?: string };
    try { body = await req.json(); } catch { return err("JSON body required"); }
    if (typeof body.content !== "string") return err("content must be a string");
    try {
      const data = await writeFileSafe(vault, path, body.content);
      return ok(data);
    } catch (e) {
      if (e instanceof FileApiError) return err(e.message, e.status);
      return err((e as Error).message, 500);
    }
  }

  // GET /api/trail/current
  if (url.pathname === "/api/trail/current" && req.method === "GET") {
    try {
      const trail = await currentTrail(vault);
      if (!trail) return ok({ empty: true, reason: "no_session_found" });
      return ok(trail);
    } catch (e) { return err((e as Error).message, 500); }
  }

  // GET /api/sessions
  if (url.pathname === "/api/sessions" && req.method === "GET") {
    try {
      const sessions = await listSessions(vault);
      return ok(sessions);
    } catch (e) { return err((e as Error).message, 500); }
  }

  // GET /api/sessions/:id
  const sessMatch = url.pathname.match(/^\/api\/sessions\/([a-zA-Z0-9-]+)$/);
  if (sessMatch && req.method === "GET") {
    const id = sessMatch[1];
    try {
      const all = await listSessionFiles(vault);
      const target = all.find((s) => s.id === id);
      if (!target) return err("session not found", 404);
      const detail = await parseSession(target.path, vault);
      return ok(detail);
    } catch (e) { return err((e as Error).message, 500); }
  }

  // GET /api/sessions/:id/conversation
  const convMatch = url.pathname.match(/^\/api\/sessions\/([a-zA-Z0-9-]+)\/conversation$/);
  if (convMatch && req.method === "GET") {
    const id = convMatch[1];
    try {
      const all = await listSessionFiles(vault);
      const target = all.find((s) => s.id === id);
      if (!target) return err("session not found", 404);
      const conv = await parseConversation(target.path);
      return ok(conv);
    } catch (e) { return err((e as Error).message, 500); }
  }

  // GET /api/memory
  if (url.pathname === "/api/memory" && req.method === "GET") {
    try { return ok(await readMemoryIndex(vault)); }
    catch (e) { return err((e as Error).message, 500); }
  }

  // POST /api/memory
  if (url.pathname === "/api/memory" && req.method === "POST") {
    let body: { title?: string; description?: string; type?: string; body?: string };
    try { body = await req.json(); } catch { return err("JSON body required"); }
    if (!body.title || !body.type) return err("title and type required");
    const allowed: MemoryType[] = ["user", "feedback", "project", "reference", "other"];
    if (!allowed.includes(body.type as MemoryType)) return err("invalid type");
    try {
      const result = await createMemoryFile(vault, {
        title: body.title,
        description: body.description ?? "",
        type: body.type as MemoryType,
        body: body.body ?? "",
      });
      return ok(result);
    } catch (e) { return err((e as Error).message, 500); }
  }

  // PUT /api/memory
  if (url.pathname === "/api/memory" && req.method === "PUT") {
    const file = url.searchParams.get("file");
    if (!file) return err("file query param required");
    let body: { content?: string };
    try { body = await req.json(); } catch { return err("JSON body required"); }
    if (typeof body.content !== "string") return err("content must be a string");
    try {
      await writeMemoryFile(vault, file, body.content);
      const data = await readMemoryFile(vault, file);
      return ok({ file, content: data });
    } catch (e) { return err((e as Error).message, 500); }
  }

  // DELETE /api/memory
  if (url.pathname === "/api/memory" && req.method === "DELETE") {
    const file = url.searchParams.get("file");
    if (!file) return err("file query param required");
    try {
      await deleteMemoryFile(vault, file);
      return ok({ deleted: file });
    } catch (e) { return err((e as Error).message, 500); }
  }

  // GET /api/notes
  if (url.pathname === "/api/notes" && req.method === "GET") {
    try { return ok(await listNotes(vault)); }
    catch (e) { return err((e as Error).message, 500); }
  }

  // POST /api/notes
  if (url.pathname === "/api/notes" && req.method === "POST") {
    let body: { title?: string } = {};
    try { body = await req.json(); } catch { /* boş body OK */ }
    try { return ok(await createNote(vault, body.title)); }
    catch (e) { return err((e as Error).message, 500); }
  }

  // DELETE /api/notes
  if (url.pathname === "/api/notes" && req.method === "DELETE") {
    const file = url.searchParams.get("file");
    if (!file) return err("file query param required");
    try { await deleteNote(vault, file); return ok({ deleted: file }); }
    catch (e) { return err((e as Error).message, 500); }
  }

  // GET /api/agents
  if (url.pathname === "/api/agents" && req.method === "GET") {
    try { return ok(await listAgents(vault)); }
    catch (e) { return err((e as Error).message, 500); }
  }

  // GET /api/agents/:name/activity — son N session'da bu ajanın çağrıldığı yerler
  const agentActMatch = url.pathname.match(/^\/api\/agents\/([A-Za-z0-9._-]+)\/activity$/);
  if (agentActMatch && req.method === "GET") {
    const name = agentActMatch[1];
    try {
      const activities = await getAgentActivity(vault, name);
      return ok(activities);
    } catch (e) {
      return err((e as Error).message, 500);
    }
  }

  return err("Unknown endpoint", 404);
}

// Sadece localhost'tan gelen isteklere izin ver (defense in depth)
function isLocalhost(req: Request): boolean {
  const host = req.headers.get("host") ?? "";
  return (
    host.startsWith("127.0.0.1") ||
    host.startsWith("localhost") ||
    host.startsWith("[::1]")
  );
}

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: PORT,
  async fetch(req) {
    if (!isLocalhost(req)) {
      return new Response("Forbidden", { status: 403, headers: SECURITY_HEADERS });
    }
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApi(req, url);
    }
    return serveStatic(url.pathname);
  },
});

console.log(`Trail server: http://127.0.0.1:${server.port}`);
console.log(`vault: ${VAULT_DIR}`);
