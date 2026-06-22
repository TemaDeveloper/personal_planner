import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { TemplatePreview } from "@/components/notes/template-preview";
import { TEMPLATES } from "@/lib/notes/templates";

afterEach(cleanup);

describe("TemplatePreview", () => {
  for (const t of TEMPLATES) {
    it(`renders a non-empty preview for "${t.key}" without crashing`, () => {
      const { container } = render(<TemplatePreview templateKey={t.key} />);
      expect(container.firstChild).not.toBeNull();
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
});
