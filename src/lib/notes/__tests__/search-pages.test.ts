import { describe, it, expect } from "vitest";
import { searchPages } from "@/lib/notes/search-pages";
import type { FlatPage } from "@/lib/notes/types";

const p = (id: string, title: string): FlatPage => ({ id, parentId: null, title, icon: "📄", order: 0 });

describe("searchPages", () => {
  const pages = [p("1", "Project plan"), p("2", "Reading list"), p("3", "Planning notes")];

  it("returns all (up to limit) for an empty query", () => {
    expect(searchPages(pages, "").map((x) => x.id)).toEqual(["1", "2", "3"]);
  });
  it("matches case-insensitive substrings", () => {
    expect(searchPages(pages, "plan").map((x) => x.id).sort()).toEqual(["1", "3"]);
  });
  it("ranks starts-with above contains", () => {
    // "Planning notes" starts with "plan"; "Project plan" only contains it.
    expect(searchPages(pages, "plan")[0].id).toBe("3");
  });
  it("returns nothing when no title matches", () => {
    expect(searchPages(pages, "zzz")).toEqual([]);
  });
  it("treats an untitled page as 'untitled'", () => {
    expect(searchPages([p("x", "")], "untitled").map((x) => x.id)).toEqual(["x"]);
  });
});
