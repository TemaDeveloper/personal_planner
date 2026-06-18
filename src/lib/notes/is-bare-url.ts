/** True when `text` is a single bare http(s) URL (no surrounding words),
 * i.e. the kind of paste that should unfurl into a bookmark card. */
export function isBareUrl(text: string): boolean {
  const t = text.trim();
  if (!t || /\s/.test(t)) return false;
  if (!/^https?:\/\//i.test(t)) return false;
  try {
    const u = new URL(t);
    return !!u.hostname && u.hostname.includes(".");
  } catch {
    return false;
  }
}
