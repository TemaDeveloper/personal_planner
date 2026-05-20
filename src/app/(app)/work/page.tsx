import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import User from "@/lib/models/user";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Briefcase, ArrowRight, Download } from "lucide-react";

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
        <Card padding="lg" className="text-center">
          <Briefcase size={32} className="mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground text-sm mb-4">
            No jobs configured yet.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent-color)] hover:underline"
          >
            Add a job in Settings <ArrowRight size={14} />
          </Link>
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
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-[var(--accent-glow)]">
                    <Briefcase size={18} className="text-[var(--accent-color)]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{job.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {job.weeklyTarget}h/week
                      {job.hourlyRate > 0 && ` · $${job.hourlyRate}/hr`}
                    </p>
                  </div>
                </div>
                <ArrowRight
                  size={16}
                  className="text-muted-foreground transition-transform group-hover:translate-x-1"
                />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
