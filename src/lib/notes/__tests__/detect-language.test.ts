import { describe, it, expect } from "vitest";
import { detectLanguage } from "@/lib/notes/detect-language";

describe("detectLanguage", () => {
  it("detects JSON (must parse)", () => {
    expect(detectLanguage('{ "a": 1, "b": [2,3] }')).toBe("json");
    expect(detectLanguage("[1, 2, 3]")).toBe("json");
  });
  it("detects HTML", () => {
    expect(detectLanguage('<div class="x"><p>hi</p></div>')).toBe("html");
    expect(detectLanguage("<!DOCTYPE html><html></html>")).toBe("html");
  });
  it("detects CSS", () => {
    expect(detectLanguage(".foo { color: red; padding: 4px; }")).toBe("css");
    expect(detectLanguage("@media (min-width: 600px) { a { color: blue } }")).toBe("css");
  });
  it("detects SQL", () => {
    expect(detectLanguage("SELECT id, name FROM users WHERE active = 1;")).toBe("sql");
  });
  it("detects shell", () => {
    expect(detectLanguage("#!/bin/bash\necho hello")).toBe("shellscript");
    expect(detectLanguage("pnpm install && git commit -m x")).toBe("shellscript");
  });
  it("detects Python", () => {
    expect(detectLanguage("def add(a, b):\n    return a + b")).toBe("python");
    expect(detectLanguage("from os import path\nprint(path)")).toBe("python");
  });
  it("detects TypeScript", () => {
    expect(detectLanguage("interface User { name: string; age: number }")).toBe("typescript");
    expect(detectLanguage("const x: number = 1;")).toBe("typescript");
  });
  it("detects JavaScript", () => {
    expect(detectLanguage("const f = () => console.log('hi');")).toBe("javascript");
    expect(detectLanguage("function add(a, b) { return a + b }")).toBe("javascript");
  });
  it("returns null when unsure or too short", () => {
    expect(detectLanguage("hello world this is prose")).toBeNull();
    expect(detectLanguage("hi")).toBeNull();
  });
});
