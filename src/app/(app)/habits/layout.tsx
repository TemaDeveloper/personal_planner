import { requireSection } from "@/lib/section-guard";

export default async function HabitsLayout({ children }: { children: React.ReactNode }) {
  await requireSection("habits");
  return <>{children}</>;
}
