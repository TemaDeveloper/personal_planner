import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import User from "@/lib/models/user";
import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";
import { Briefcase, ArrowRight } from "lucide-react";

export default async function WorkPage() {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) return null;

  await connectDB();
  const user = await User.findById(userId).lean();
  const jobs = user?.workConfig?.jobs?.filter((j: { active: boolean }) => j.active) || [];

  return (
    <div className="animate-slide-up">
      <PageHeader title="Work" description="Track hours and earnings across your jobs" />

      {jobs.length === 0 ? (
        <div className="planner-surface p-8 text-center">
          <Briefcase size={32} className="mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground text-sm mb-4">
            No jobs configured yet.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Add a job in Settings <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job: { name: string; hourlyRate: number; weeklyTarget: number }) => (
            <Link
              key={job.name}
              href={`/work/${encodeURIComponent(job.name.toLowerCase())}`}
              className="planner-surface p-5 flex items-center justify-between group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg block"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--accent-glow)" }}
                >
                  <Briefcase size={18} style={{ color: "var(--accent-color)" }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{job.name}</h3>
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
