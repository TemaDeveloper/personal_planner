import { requireSection } from "@/lib/section-guard";

export default async function GymLayout({ children }: { children: React.ReactNode }) {
  await requireSection("gym");
  return <>{children}</>;
}
