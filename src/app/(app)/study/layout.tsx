import { requireSection } from "@/lib/section-guard";

export default async function StudyLayout({ children }: { children: React.ReactNode }) {
  await requireSection("study");
  return <>{children}</>;
}
