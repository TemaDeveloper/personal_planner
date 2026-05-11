import { requireSection } from "@/lib/section-guard";

export default async function WorkLayout({ children }: { children: React.ReactNode }) {
  await requireSection("work");
  return <>{children}</>;
}
