import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import User from "@/lib/models/user";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { Briefcase, ArrowRight, Download } from "lucide-react";
import { SectionCustomFields } from "@/components/sections/custom-fields";

export default async function WorkPage() {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) return null;

  await connectDB();
  const user = await User.findById(userId).lean();
  const jobs = user?.workConfig?.jobs?.filter((j: { active: boolean }) => j.active) || [];

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Work"
        description="Track hours and earnings across your jobs"
        action={
          <a
            href="/api/export/work"
            download
            className="p-2 rounded-lg hover:bg-[var(--surface-1)] transition-colors text-[var(--text-muted)] inline-flex"
            aria-label="Export to Excel"
          >
            <Download size={16} />
          </a>
        }
      />

      {jobs.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={Briefcase}
            title="No jobs yet"
            description="Add a job in Settings to start tracking your hours and earnings."
          />
          <div className="text-center -mt-6 pb-2">
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent-text)] hover:underline"
            >
              Go to Settings <ArrowRight size={13} />
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job: { name: string; hourlyRate: number; weeklyTarget: number }) => (
            <Link
              key={job.name}
              href={`/work/${encodeURIComponent(job.name.toLowerCase())}`}
              className="block"
            >
              <Card interactive padding="md" className="flex items-center justify-between group">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--accent-glow)" }}
                  >
                    <Briefcase size={18} style={{ color: "var(--accent-color)" }} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate text-[var(--text-primary)]">
                      {job.name}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      <span className="num">{job.weeklyTarget}</span>h/week
                      {job.hourlyRate > 0 && (
                        <> · $<span className="num">{job.hourlyRate}</span>/hr</>
                      )}
                    </p>
                  </div>
                </div>
                <ArrowRight
                  size={16}
                  className="text-[var(--text-faint)] transition-transform group-hover:translate-x-1"
                />
              </Card>
            </Link>
          ))}
        </div>
      )}
      <SectionCustomFields sectionKey="work" />
    </div>
  );
}
