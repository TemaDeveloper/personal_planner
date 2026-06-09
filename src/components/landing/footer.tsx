import { GitFork } from "lucide-react";
import { LiforaLogo } from "@/components/brand/lifora-logo";

export function Footer() {
  return (
    <footer
      className="px-6 py-12 border-t"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <LiforaLogo size={26} />
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Lifora
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm" style={{ color: "var(--text-muted)" }}>
          <a
            href="https://github.com/TemaDeveloper/personal_planner"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline cursor-pointer flex items-center gap-1.5 transition-colors"
            style={{ color: "var(--accent-text)" }}
          >
            <GitFork size={14} />
            GitHub
          </a>
          <a
            href="https://github.com/TemaDeveloper/personal_planner/blob/main/CONTRIBUTING.md"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline cursor-pointer transition-colors"
          >
            Contributing
          </a>
          <a
            href="https://github.com/TemaDeveloper/personal_planner/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline cursor-pointer transition-colors"
          >
            MIT License
          </a>
        </div>

        <p className="text-xs" style={{ color: "var(--text-faint)" }}>
          Built with Next.js, MongoDB & AI
        </p>
      </div>
    </footer>
  );
}
