import { Inter } from "next/font/google";
import { NotesScreen } from "@/components/notes/notes-screen";

// Notion uses Inter; scope it to the Notes surface so the rest of the app keeps its brand font.
const inter = Inter({ subsets: ["latin"], variable: "--font-notes", display: "swap" });

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} font-notes h-full`}>
      <NotesScreen>{children}</NotesScreen>
    </div>
  );
}
