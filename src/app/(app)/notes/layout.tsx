import { NotesScreen } from "@/components/notes/notes-screen";

// Notion renders its content surface in the system UI font stack (see .font-notes
// in globals.css), so no web font is loaded here — matches Notion for parity.
export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-notes h-full">
      <NotesScreen>{children}</NotesScreen>
    </div>
  );
}
