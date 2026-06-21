import { describe, it, expect } from "vitest";
import { detectLanguage, SUPPORTED_LANGUAGES } from "@/lib/notes/detect-language";

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
  it("detects C and C++ via includes", () => {
    expect(detectLanguage('#include <stdio.h>\nint main() { printf("hi"); return 0; }')).toBe("c");
    expect(detectLanguage("#include <iostream>\nint main(){ std::cout << 1; }")).toBe("cpp");
  });
  it("detects Java", () => {
    expect(detectLanguage("public class Main {\n  public static void main(String[] a){ System.out.println(1); }\n}")).toBe("java");
  });
  it("detects C#", () => {
    expect(detectLanguage("using System;\nclass P { static void Main(){ Console.WriteLine(1); } }")).toBe("csharp");
  });
  it("detects Rust", () => {
    expect(detectLanguage('fn main() {\n    let mut x = 1;\n    println!("{}", x);\n}')).toBe("rust");
  });
  it("detects Ruby", () => {
    expect(detectLanguage('def greet(n)\n  puts "hi #{n}"\nend')).toBe("ruby");
  });
  it("detects PHP with and without open tag", () => {
    expect(detectLanguage("<?php echo $name; ?>")).toBe("php");
    expect(detectLanguage('$user = "x";\necho $user;')).toBe("php");
  });
  it("detects Kotlin and Swift distinctly", () => {
    expect(detectLanguage('fun main() {\n  val x = 1\n  println(x)\n}')).toBe("kotlin");
    expect(detectLanguage('import Foundation\nfunc greet() {\n  let x = 1\n  print(x)\n}')).toBe("swift");
  });
  it("detects Lua", () => {
    expect(detectLanguage('local x = 1\nfunction add(a, b)\n  return a + b\nend')).toBe("lua");
  });
  it("detects YAML and Markdown", () => {
    expect(detectLanguage("name: build\non:\n  push:\n    branches:\n      - main")).toBe("yaml");
    expect(detectLanguage("# Title\n\nSome **bold** text and a [link](http://x).")).toBe("markdown");
  });
  it("never returns an unsupported language id", () => {
    // Go is not in the bundled Shiki set → must fall back to null, not 'go'.
    const r = detectLanguage('package main\nimport "fmt"\nfunc main(){ fmt.Println(1) }');
    expect(r === null || SUPPORTED_LANGUAGES.has(r)).toBe(true);
    expect(r).not.toBe("go");
  });
  it("returns null when unsure or too short", () => {
    expect(detectLanguage("hello world this is prose")).toBeNull();
    expect(detectLanguage("hi")).toBeNull();
  });
});
