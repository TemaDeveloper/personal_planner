export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--bg-page)" }}
    >
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
