export default function NotesIndexPage() {
  return (
    <div className="h-full flex items-center justify-center p-8 text-center">
      <div>
        <div className="text-4xl mb-3">📝</div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Select a page on the left, or create a new one to start writing.
        </p>
      </div>
    </div>
  );
}
