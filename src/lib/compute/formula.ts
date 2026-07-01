/**
 * A tiny, SAFE arithmetic expression evaluator — the generative fallback for
 * computations that the fixed primitive kit doesn't cover (e.g. gross =
 * hours * rate). Supports + - * / , parentheses, unary minus, numeric literals,
 * and field references (unknown refs = 0). No eval(), no code execution: a
 * hand-written recursive-descent parser over a fixed token set. Returns null on
 * malformed input or divide-by-zero.
 */

type Token =
  | { t: "num"; v: number }
  | { t: "id"; v: string }
  | { t: "op"; v: "+" | "-" | "*" | "/" }
  | { t: "lp" }
  | { t: "rp" };

function tokenize(expr: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (c === " " || c === "\t" || c === "\n") {
      i++;
      continue;
    }
    if (c === "(") { tokens.push({ t: "lp" }); i++; continue; }
    if (c === ")") { tokens.push({ t: "rp" }); i++; continue; }
    if (c === "+" || c === "-" || c === "*" || c === "/") {
      tokens.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let num = "";
      while (i < expr.length && /[0-9.]/.test(expr[i])) num += expr[i++];
      const v = Number(num);
      if (!Number.isFinite(v)) return null;
      tokens.push({ t: "num", v });
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let id = "";
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) id += expr[i++];
      tokens.push({ t: "id", v: id });
      continue;
    }
    return null; // any other character is rejected
  }
  return tokens;
}

/** Evaluate a formula against entry data. Returns null on error / div-by-zero. */
export function evalFormula(expr: string, data: Record<string, unknown>): number | null {
  const tokens = tokenize(expr);
  if (!tokens || tokens.length === 0) return null;
  // Bound complexity so pathological input can't blow the recursion stack.
  if (tokens.length > 200) return null;

  let pos = 0;
  let failed = false;
  const peek = () => tokens[pos];

  const num = (v: unknown): number => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // factor := number | id | '(' expr ')' | '-' factor
  function factor(): number {
    const tok = peek();
    if (!tok) { failed = true; return 0; }
    if (tok.t === "op" && tok.v === "-") { pos++; return -factor(); }
    if (tok.t === "num") { pos++; return tok.v; }
    if (tok.t === "id") { pos++; return num(data[tok.v]); }
    if (tok.t === "lp") {
      pos++;
      const val = expression();
      const close = peek();
      if (!close || close.t !== "rp") { failed = true; return 0; }
      pos++;
      return val;
    }
    failed = true;
    return 0;
  }

  // term := factor (('*' | '/') factor)*
  function term(): number {
    let val = factor();
    while (!failed) {
      const tok = peek();
      if (tok && tok.t === "op" && (tok.v === "*" || tok.v === "/")) {
        pos++;
        const rhs = factor();
        if (tok.v === "*") val *= rhs;
        else {
          if (rhs === 0) { failed = true; return 0; }
          val /= rhs;
        }
      } else break;
    }
    return val;
  }

  // expression := term (('+' | '-') term)*
  function expression(): number {
    let val = term();
    while (!failed) {
      const tok = peek();
      if (tok && tok.t === "op" && (tok.v === "+" || tok.v === "-")) {
        pos++;
        const rhs = term();
        val = tok.v === "+" ? val + rhs : val - rhs;
      } else break;
    }
    return val;
  }

  const result = expression();
  if (failed || pos !== tokens.length || !Number.isFinite(result)) return null;
  return Math.round(result * 100) / 100;
}
