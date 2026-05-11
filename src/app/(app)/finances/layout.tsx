import { requireSection } from "@/lib/section-guard";

export default async function FinancesLayout({ children }: { children: React.ReactNode }) {
  await requireSection("finances");
  return <>{children}</>;
}
