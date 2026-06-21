import { describe, it, expect } from "vitest";
import { isPublicHttpUrl, isSafeLinkUrl } from "@/lib/notes/safe-url";

describe("isSafeLinkUrl", () => {
  it("allows http/https/mailto", () => {
    expect(isSafeLinkUrl("https://example.com")).toBe(true);
    expect(isSafeLinkUrl("http://localhost:3000/x")).toBe(true); // any host ok for click-open
    expect(isSafeLinkUrl("mailto:a@b.com")).toBe(true);
  });
  it("blocks XSS-capable and other schemes", () => {
    expect(isSafeLinkUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeLinkUrl("data:text/html,<script>1</script>")).toBe(false);
    expect(isSafeLinkUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isSafeLinkUrl("file:///etc/passwd")).toBe(false);
  });
  it("rejects whitespace-smuggled schemes, blanks, and bare hosts", () => {
    expect(isSafeLinkUrl("java\tscript:alert(1)")).toBe(false);
    expect(isSafeLinkUrl("  ")).toBe(false);
    expect(isSafeLinkUrl("example.com")).toBe(false);
  });
});

describe("isPublicHttpUrl", () => {
  it("allows public http(s) URLs", () => {
    expect(isPublicHttpUrl("https://example.com/path").ok).toBe(true);
    expect(isPublicHttpUrl("http://notion.so").ok).toBe(true);
    expect(isPublicHttpUrl("https://8.8.8.8/").ok).toBe(true);
  });
  it("rejects non-http protocols", () => {
    expect(isPublicHttpUrl("ftp://example.com").ok).toBe(false);
    expect(isPublicHttpUrl("javascript:alert(1)").ok).toBe(false);
    expect(isPublicHttpUrl("file:///etc/passwd").ok).toBe(false);
  });
  it("rejects invalid URLs", () => {
    expect(isPublicHttpUrl("not a url").ok).toBe(false);
  });
  it("blocks loopback / private / link-local hosts", () => {
    for (const u of [
      "http://localhost/x",
      "http://127.0.0.1/",
      "http://10.1.2.3/",
      "http://192.168.0.1/",
      "http://172.16.5.5/",
      "http://169.254.1.1/",
      "http://app.local/",
      "http://[::1]/",
      "http://[fc00::1]/",
      "http://[fe80::1]/",
    ]) {
      expect(isPublicHttpUrl(u).ok, u).toBe(false);
    }
  });
  it("allows a public 172.x outside the private block", () => {
    expect(isPublicHttpUrl("http://172.15.0.1/").ok).toBe(true);
    expect(isPublicHttpUrl("http://172.32.0.1/").ok).toBe(true);
  });
});
