import { ShardField } from "@/components/auth/shard-field";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: "var(--bg-page)" }}
    >
      <ShardField />
      <div className="w-full max-w-md relative" style={{ zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
