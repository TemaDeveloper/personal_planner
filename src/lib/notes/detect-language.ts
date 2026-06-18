/** Heuristically guess a code block's language from its content. Returns a
 * BlockNote/Shiki language id (from codeBlockOptions.supportedLanguages) or null
 * when not confident. Intentionally conservative — null means "leave as-is". */
export function detectLanguage(raw: string): string | null {
  const code = raw.trim();
  if (code.length < 3) return null;

  // JSON — must actually parse.
  if (/^[[{]/.test(code)) {
    try {
      JSON.parse(code);
      return "json";
    } catch {
      /* not json, keep checking */
    }
  }

  // HTML / markup.
  if (/<\/?[a-z][\s\S]*>/i.test(code) &&
      /<(!doctype|html|head|body|div|span|p|a|ul|ol|li|table|tr|td|img|section|header|footer|nav|h[1-6])\b/i.test(code)) {
    return "html";
  }

  // SQL.
  if (/\b(select|insert\s+into|update|delete\s+from|create\s+table|alter\s+table|drop\s+table)\b/i.test(code) &&
      /\b(from|into|table|where|values|set)\b/i.test(code)) {
    return "sql";
  }

  // Shell.
  if (/^#!.*\b(sh|bash|zsh)\b/m.test(code) ||
      /^\s*(\$\s|sudo |apt(-get)? |brew |npm |pnpm |yarn |git |cd |echo |export |chmod |mkdir |curl )/m.test(code)) {
    return "shellscript";
  }

  // Python.
  if (/^\s*(def|class)\s+\w+|^\s*(import\s+\w+|from\s+[\w.]+\s+import)|\bprint\s*\(|\belif\b|if\s+__name__\s*==/m.test(code)) {
    return "python";
  }

  // TypeScript — type annotations / interfaces.
  if (/\binterface\s+\w+|\btype\s+\w+\s*=|:\s*(string|number|boolean|any|void|unknown)\b|\benum\s+\w+|\bas\s+\w+\s*[;)\n]/.test(code)) {
    return "typescript";
  }

  // JavaScript.
  if (/\b(const|let|var|function)\b|=>|\bconsole\.(log|error|warn)|\brequire\s*\(|\bexport\b|\bimport\b/.test(code)) {
    return "javascript";
  }

  // CSS — selector { prop: value }. Checked last: it's the most ambiguous
  // ({ name: value } also looks like a TS object/interface), so code-language
  // signals above win first.
  if (/@media|@import|@keyframes/.test(code) ||
      /[.#]?[\w-]+\s*\{[^}]*[\w-]+\s*:\s*[^;{}]+;?[^}]*\}/.test(code)) {
    return "css";
  }

  return null;
}
