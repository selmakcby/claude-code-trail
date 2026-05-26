import { readdir, stat } from "node:fs/promises";
import { join, basename, relative } from "node:path";
import type { Category, FileNode } from "./types.ts";
import { isProtectedFile, isProtectedDir } from "./secret-guard.ts";

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  "dist",
  "build",
  ".vault-studio-cache",
  ".DS_Store",
  "__pycache__",
  ".pytest_cache",
  ".venv",
  "venv",
  "target",       // rust
  ".cargo",
]);

const CODE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".rs", ".go", ".rb", ".java", ".kt",
  ".vue", ".svelte", ".astro",
  ".html", ".css", ".scss", ".sass", ".less",
  ".sh", ".bash", ".zsh",
  ".sql", ".graphql", ".proto",
]);

const DATA_EXTENSIONS = new Set([
  ".json", ".yaml", ".yml", ".toml", ".csv", ".tsv",
  ".xml", ".ini", ".conf",
]);

const VAULT_EXTENSIONS = new Set([".md", ".mdx", ".markdown", ".txt"]);

function getExt(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

function categorize(absPath: string, vaultRoot: string, isDir: boolean): Category {
  const rel = relative(vaultRoot, absPath);
  const segments = rel.split("/").filter(Boolean);
  const name = basename(absPath);
  const ext = getExt(name);

  // Path-based: agents, skills, plugin
  if (segments.includes("agents") || segments.includes(".claude") && segments.includes("agents")) {
    if (segments.some((s) => s === "agents")) return "agents";
  }
  const inClaudeAgents = segments.length >= 2 && segments[0] === ".claude" && segments[1] === "agents";
  const inAgentsDir = segments[0] === "agents";
  if (inClaudeAgents || inAgentsDir) return "agents";

  const inClaudeSkills = segments.length >= 2 && segments[0] === ".claude" && segments[1] === "skills";
  const inSkillsDir = segments[0] === "skills";
  const inPlugin = segments[0] === ".claude-plugin" || segments[0] === "commands";
  if (inClaudeSkills || inSkillsDir || inPlugin) return "skills";

  // Extension-based
  if (isDir) return "vault"; // directories default
  if (CODE_EXTENSIONS.has(ext)) return "code";
  if (DATA_EXTENSIONS.has(ext)) return "data";
  if (VAULT_EXTENSIONS.has(ext)) return "vault";

  // Bilinmeyen uzantı → data
  return "data";
}

export async function scanVault(vaultRoot: string): Promise<FileNode> {
  const rootName = basename(vaultRoot) || "vault";
  const root: FileNode = {
    name: rootName,
    path: "/",
    isDir: true,
    category: "vault",
    children: [],
  };
  await walkInto(vaultRoot, vaultRoot, root);
  return root;
}

async function walkInto(currentDir: string, vaultRoot: string, parent: FileNode): Promise<void> {
  let entries: string[] = [];
  try {
    entries = await readdir(currentDir);
  } catch {
    return;
  }
  entries.sort();

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry)) continue;
    if (entry.startsWith(".") && !shouldKeepDotEntry(entry)) continue;

    const absPath = join(currentDir, entry);
    let stats;
    try {
      stats = await stat(absPath);
    } catch {
      continue;
    }

    const isDir = stats.isDirectory();
    if (isDir && isProtectedDir(entry)) continue; // .ssh vs gizle

    const relPath = "/" + relative(vaultRoot, absPath);
    const node: FileNode = {
      name: entry,
      path: relPath,
      isDir,
      category: categorize(absPath, vaultRoot, isDir),
      size: isDir ? undefined : stats.size,
      isProtected: isProtectedFile(entry),
      children: isDir ? [] : undefined,
    };

    parent.children!.push(node);
    if (isDir) {
      await walkInto(absPath, vaultRoot, node);
      // Boş klasörleri ele (opsiyonel — şimdilik tut, kullanıcı görsün)
    }
  }
}

// .claude, .claude-plugin tut; diğer dotfile'ları gizle
function shouldKeepDotEntry(name: string): boolean {
  return (
    name === ".claude" ||
    name === ".claude-plugin" ||
    name === ".env" ||
    name.startsWith(".env.") ||
    name === ".gitignore"
  );
}
