/** Language ids that codeBlockOptions.supportedLanguages can actually highlight.
 * The detector's result is guarded against this set so it never assigns a
 * language Shiki can't render (which would show as plain text anyway).
 * Keep in sync with @blocknote/code-block's bundled grammars. */
export const SUPPORTED_LANGUAGES = new Set([
  "text", "c", "cpp", "css", "glsl", "graphql", "haml", "html", "java",
  "javascript", "json", "jsonc", "jsonl", "jsx", "julia", "less", "markdown",
  "mdx", "php", "postcss", "pug", "python", "r", "regexp", "sass", "scss",
  "shellscript", "sql", "svelte", "typescript", "vue", "vue-html", "wasm",
  "wgsl", "xml", "yaml", "tsx", "haskell", "csharp", "latex", "lua", "mermaid",
  "ruby", "rust", "scala", "swift", "kotlin", "objective-c",
]);

/** Heuristically guess a code block's language from its content. Returns a
 * BlockNote/Shiki language id (from SUPPORTED_LANGUAGES) or null when not
 * confident. Intentionally conservative — null means "leave as-is".
 *
 * Checks are ordered most-distinctive-first: languages with an unambiguous
 * marker (e.g. `<?php`, `#include`, a shebang) win before keyword heuristics,
 * and the most ambiguous (css, yaml, markdown) are checked last. The result is
 * guarded against SUPPORTED_LANGUAGES so it always actually highlights. */
export function detectLanguage(raw: string): string | null {
  const guess = guessLanguage(raw);
  return guess && SUPPORTED_LANGUAGES.has(guess) ? guess : null;
}

function guessLanguage(raw: string): string | null {
  const code = raw.trim();
  if (code.length < 3) return null;

  // ── Unambiguous markers ───────────────────────────────────────────────
  // PHP open tag.
  if (/<\?php\b/.test(code)) return "php";

  // C / C++ — preprocessor includes.
  if (/^\s*#\s*include\s*[<"]/m.test(code)) {
    if (/\b(std::|cout\s*<<|cin\s*>>|using\s+namespace\s+std|template\s*<|class\s+\w+|nullptr|->\s*\w+\s*\()/.test(code)) return "cpp";
    return "c";
  }

  // JSON — must actually parse.
  if (/^[[{]/.test(code)) {
    try { JSON.parse(code); return "json"; } catch { /* not json */ }
  }

  // Shebang.
  if (/^#!.*\b(sh|bash|zsh)\b/m.test(code)) return "shellscript";
  if (/^#!.*\bpython[0-9.]*\b/m.test(code)) return "python";
  if (/^#!.*\b(node|deno)\b/m.test(code)) return "javascript";
  if (/^#!.*\bruby\b/m.test(code)) return "ruby";

  // Shell commands (no shebang) — a leading prompt or unambiguous CLI verbs.
  // `echo`/`export` are intentionally excluded: they collide with PHP/JS.
  if (/^\s*(\$\s|sudo |apt(-get)? |brew |npm |pnpm |yarn |git |cd |chmod |mkdir |curl |wget |docker |kubectl )/m.test(code)) {
    return "shellscript";
  }

  // HTML / markup.
  if (/<\/?[a-z][\s\S]*>/i.test(code) &&
      /<(!doctype|html|head|body|div|span|p|a|ul|ol|li|table|tr|td|img|section|header|footer|nav|h[1-6])\b/i.test(code)) {
    return "html";
  }

  // ── Keyword / signature heuristics ────────────────────────────────────
  // SQL.
  if (/\b(select|insert\s+into|update|delete\s+from|create\s+table|alter\s+table|drop\s+table)\b/i.test(code) &&
      /\b(from|into|table|where|values|set|join)\b/i.test(code)) {
    return "sql";
  }

  // Rust — distinctive macros + fn + let mut.
  if (/\bfn\s+\w+\s*\(|\blet\s+mut\b|\bprintln!|\buse\s+std::|\bimpl\b|->\s*\w+\s*\{|&str\b|Vec<|\bpub\s+fn\b/.test(code)) {
    return "rust";
  }

  // Go — package + func, := short var, fmt.Println. (Supported only if Shiki
  // ships it; guarded by the supported-set check below.)
  if (/^\s*package\s+\w+/m.test(code) && /\bfunc\b|\bimport\b|fmt\.\w+|:=/.test(code)) {
    return "go";
  }

  // Kotlin — `fun` keyword (Python/Swift never use it).
  if (/\bfun\s+\w+\s*\(/.test(code) &&
      /\b(val|var)\s+\w+|companion\s+object|println\(/.test(code)) {
    return "kotlin";
  }

  // Swift — `func` + Apple frameworks / guard-let; checked before Python so
  // `import Foundation` + `print(` doesn't get misread as Python.
  if (/\bfunc\s+\w+\s*\(/.test(code) &&
      (/\bimport\s+(Foundation|UIKit|SwiftUI|Combine)\b|\bguard\s+let\b|@State\b|\bstruct\s+\w+\s*:\s*View\b|\blet\s+\w+\s*=|\bvar\s+\w+\s*:/.test(code)) &&
      !/\bfun\b/.test(code)) {
    return "swift";
  }

  // Python.
  if (/^\s*def\s+\w+\s*\(.*\)\s*:|^\s*(import\s+[a-z]\w*|from\s+[\w.]+\s+import)|\bprint\s*\(|\belif\b|if\s+__name__\s*==|^\s*class\s+\w+.*:\s*$/m.test(code) &&
      !/\bfunc\b|\bfun\b|\{[\s\S]*\}/.test(code)) {
    return "python";
  }

  // Ruby — def…end, puts, symbols, blocks.
  if (/\bdef\s+\w+[\s\S]*\bend\b|\bputs\b|\brequire\s+['"]|\battr_(accessor|reader|writer)\b|\bdo\s*\|[\w,\s]*\||\bend\b\s*$/m.test(code) &&
      !/\bfunction\b|;\s*$/m.test(code)) {
    return "ruby";
  }

  // Java.
  if (/\bpublic\s+(class|interface|enum)\b|\bpublic\s+static\s+void\s+main\b|System\.out\.print|import\s+java\.|@Override\b/.test(code)) {
    return "java";
  }

  // C#.
  if (/\busing\s+System\b|\bnamespace\s+\w+|Console\.(WriteLine|Write)\b|\bstatic\s+void\s+Main\b|\bpublic\s+class\b.*\{[\s\S]*\bstring\b/.test(code)) {
    return "csharp";
  }

  // PHP without open tag (variables + arrows + echo).
  if (/\$\w+\s*=|\becho\b|\bnamespace\s+\w+|->\w+\(|\bfunction\s+\w+\s*\([^)]*\)\s*\{/.test(code) &&
      /\$\w+/.test(code)) {
    return "php";
  }

  // Lua.
  if (/\blocal\s+\w+\s*=|\bfunction\b[\s\S]*\bend\b|\bthen\b[\s\S]*\bend\b|\bnil\b|\belseif\b|\brepeat\b[\s\S]*\buntil\b/.test(code) &&
      /\bend\b/.test(code) && !/[{};]/.test(code)) {
    return "lua";
  }

  // TypeScript — type annotations / interfaces.
  if (/\binterface\s+\w+|\btype\s+\w+\s*=|:\s*(string|number|boolean|any|void|unknown)\b|\benum\s+\w+|\bas\s+\w+\s*[;)\n]/.test(code)) {
    return "typescript";
  }

  // JavaScript.
  if (/\b(const|let|var|function)\b|=>|\bconsole\.(log|error|warn)|\brequire\s*\(|\bexport\b|\bimport\b/.test(code)) {
    return "javascript";
  }

  // CSS — selector { prop: value }.
  if (/@media|@import|@keyframes/.test(code) ||
      /[.#]?[\w-]+\s*\{[^}]*[\w-]+\s*:\s*[^;{}]+;?[^}]*\}/.test(code)) {
    return "css";
  }

  // ── Most ambiguous, checked last ──────────────────────────────────────
  // YAML — key: value lines / doc marker / list items, and NOT brace-y code.
  if ((/^---\s*$/m.test(code) || /^\s*[\w-]+:\s.+$/m.test(code)) &&
      !/[{};]/.test(code) && /^\s*([\w-]+:|-\s)/m.test(code)) {
    const lines = code.split("\n").filter((l) => l.trim());
    const yamlish = lines.filter((l) => /^\s*([\w-]+:(\s|$)|-\s)/.test(l)).length;
    if (yamlish >= 2 && yamlish / lines.length > 0.5) return "yaml";
  }

  // Markdown — headings, lists, links, fenced code, emphasis.
  if (/^#{1,6}\s+\S/m.test(code) || /^\s*[-*+]\s+\S/m.test(code) ||
      /\[[^\]]+\]\([^)]+\)/.test(code) || /```/.test(code) || /\*\*[^*]+\*\*/.test(code)) {
    return "markdown";
  }

  return null;
}
