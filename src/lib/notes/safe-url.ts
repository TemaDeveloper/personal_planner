export type SafeUrlResult = { ok: true; url: string } | { ok: false; reason: string };

/** True if a URL is safe to open from a click (http/https/mailto only).
 * Blocks XSS-capable schemes like javascript:, data:, vbscript:, file:.
 * Unlike isPublicHttpUrl this allows any host (user opening their own link) —
 * it only guards the scheme. A bare "example.com" (no scheme) is rejected;
 * callers should normalize before validating if they want to allow that. */
export function isSafeLinkUrl(input: string): boolean {
  const s = (input ?? "").trim();
  if (!s) return false;
  // Reject control chars / whitespace that can smuggle a scheme past the parser
  // (e.g. a tab inside "java\tscript:"). Covers \x00-\x1F, space and \x7F.
  if (/[\x00-\x20\x7f]/.test(s)) return false;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return false;
  }
  return u.protocol === "http:" || u.protocol === "https:" || u.protocol === "mailto:";
}

/** True if a bare IPv4 literal falls in a private / loopback / link-local / reserved range. */
function isPrivateIpv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const o = m.slice(1).map(Number);
  if (o.some((n) => n > 255)) return true; // malformed → treat as unsafe
  const [a, b] = o;
  if (a === 0 || a === 127) return true; // this-host / loopback
  if (a === 10) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 169 && b === 254) return true; // link-local
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved / broadcast
  return false;
}

/** True if an IPv6 literal is loopback / unspecified / unique-local / link-local. */
function isPrivateIpv6(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "::1" || h === "::") return true;
  if (h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  // IPv4-mapped (::ffff:127.0.0.1) → check the embedded v4
  const mapped = /::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i.exec(h);
  if (mapped && isPrivateIpv4(mapped[1])) return true;
  return false;
}

/** Validate that a URL is a public http(s) URL safe to fetch server-side (SSRF guard).
 * NOTE: this blocks literal private hosts/IPs and obvious internal names; it does NOT
 * resolve DNS, so a hostname that resolves to a private IP (DNS rebinding) is a residual
 * risk. Callers should also validate redirect targets. */
export function isPublicHttpUrl(input: string): SafeUrlResult {
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    return { ok: false, reason: "Invalid URL" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ok: false, reason: "Only http(s) URLs are allowed" };
  }
  const host = u.hostname.toLowerCase();
  if (!host) return { ok: false, reason: "Missing host" };
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) {
    return { ok: false, reason: "Internal host blocked" };
  }
  if (isPrivateIpv4(host)) return { ok: false, reason: "Private address blocked" };
  if (host.includes(":") && isPrivateIpv6(host)) return { ok: false, reason: "Private address blocked" };
  return { ok: true, url: u.toString() };
}
