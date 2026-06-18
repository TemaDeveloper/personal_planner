import katex from "katex";

/** Render a LaTeX string to KaTeX HTML. Empty input → "". Never throws
 * (invalid LaTeX renders an inline error rather than crashing the editor). */
export function katexHtml(latex: string, displayMode = true): string {
  const src = latex.trim();
  if (!src) return "";
  return katex.renderToString(src, { throwOnError: false, displayMode, output: "html" });
}
