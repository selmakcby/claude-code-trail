// Hassas dosya / değer maskeleme

const PROTECTED_FILE_PATTERNS: RegExp[] = [
  /^\.env(\..+)?$/i,
  /credentials/i,
  /api[_-]?key/i,
  /^id_(rsa|ed25519|ecdsa|dsa)/i,
  /\.pem$/i,
  /\.key$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /secrets?\.(json|yaml|yml|toml)$/i,
];

const PROTECTED_DIR_PATTERNS: RegExp[] = [
  /^\.ssh$/i,
  /^\.aws$/i,
  /^\.gnupg$/i,
];

export function isProtectedFile(fileName: string): boolean {
  return PROTECTED_FILE_PATTERNS.some((re) => re.test(fileName));
}

export function isProtectedDir(dirName: string): boolean {
  return PROTECTED_DIR_PATTERNS.some((re) => re.test(dirName));
}

// .env-style KEY=value satırlarında value'yu maskele
// Yorumlar (#) ve boş satırlar korunur
export function maskEnvContent(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed === "" || trimmed.startsWith("#")) return line;
      const eqIdx = line.indexOf("=");
      if (eqIdx === -1) return line;
      const key = line.slice(0, eqIdx);
      const value = line.slice(eqIdx + 1).trim();
      if (value === "") return line;
      // Tırnak içindeki değerleri de maskele
      const masked = "***" + (value.length > 4 ? ` (${value.length} chars)` : "");
      return `${key}=${masked}`;
    })
    .join("\n");
}

// Generic mask: dosya içeriğini görüntüye uygun hale getir
export function maskFileContent(fileName: string, content: string): string {
  if (/^\.env/i.test(fileName) || /\.env$/i.test(fileName)) {
    return maskEnvContent(content);
  }
  // .pem, .key gibi binary-ish dosyalar için tamamen maskele
  if (/\.(pem|key|p12|pfx)$/i.test(fileName)) {
    return `[Sensitive file — body hidden.]\n\nFile size: ${content.length} bytes`;
  }
  // SSH private key başlangıcı algılanırsa maskele
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(content)) {
    return "[SSH/PGP private key detected — body hidden.]";
  }
  return content;
}
