import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { TemplatePreview } from "@/components/notes/template-preview";
import { TEMPLATES, buildTemplate, type PresetBlock } from "@/lib/notes/templates";

afterEach(cleanup);

function firstText(blocks: PresetBlock[]): string | null {
  for (const b of blocks) {
    if (b.content) return b.content;
    if (b.children) {
      const nested = firstText(b.children);
      if (nested) return nested;
    }
  }
  return null;
}

describe("TemplatePreview", () => {
  for (const t of TEMPLATES) {
    it(`renders "${t.key}"'s actual content, not just an empty shell`, () => {
      const { container } = render(<TemplatePreview templateKey={t.key} />);
      expect(container.firstChild).not.toBeNull();
      const expected = firstText(buildTemplate(t.key));
      if (expected) expect(container.textContent).toContain(expected);
    });
  }

  it("shows a database placeholder with the DB title for DB templates", () => {
    // task-tracker embeds a 'Tasks' database — its title should appear in the preview.
    render(<TemplatePreview templateKey="task-tracker" />);
    expect(screen.getByText(/Tasks/)).toBeTruthy();
  });

  it("renders multi-column rows as side-by-side columns", () => {
    // project brief has a 4-column header → 4 column children in a flex row.
    const { container } = render(<TemplatePreview templateKey="work-project" />);
    const flexRow = container.querySelector(".flex.gap-3");
    expect(flexRow).not.toBeNull();
    expect((flexRow as HTMLElement).children.length).toBe(4);
  });

  it("numbers consecutive numberedListItem blocks sequentially instead of repeating \"1.\"", () => {
    // study-planner has two consecutive numbered("") items under "Today's focus".
    const { container } = render(<TemplatePreview templateKey="study-planner" />);
    const markers = Array.from(container.querySelectorAll(".flex.gap-1\\.5.ml-1 > span:first-child"))
      .map((el) => el.textContent)
      .filter((t) => /^\d+\.$/.test(t ?? ""));
    expect(markers).toEqual(["1.", "2."]);
  });
});
