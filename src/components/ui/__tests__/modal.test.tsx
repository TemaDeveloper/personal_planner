import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Modal } from "../modal";

afterEach(cleanup);

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(
      <Modal open={false} onClose={() => {}} title="Test">
        <p>Content</p>
      </Modal>
    );
    expect(screen.queryByText("Test")).toBeNull();
  });

  it("renders title and children when open", () => {
    render(
      <Modal open onClose={() => {}} title="My Modal">
        <p>Hello world</p>
      </Modal>
    );
    expect(screen.getByText("My Modal")).toBeInTheDocument();
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when overlay is clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    );
    fireEvent.click(screen.getByTestId("modal-overlay"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
