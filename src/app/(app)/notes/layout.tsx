import { NotesScreen } from "@/components/notes/notes-screen";

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return <NotesScreen>{children}</NotesScreen>;
}
