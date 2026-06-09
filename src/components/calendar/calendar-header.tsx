"use client";

export type CalView = "month" | "week" | "day" | "agenda";

export function CalendarHeader({ monthLabel, yearLabel, view, onView, onPrev, onNext }: {
  monthLabel: string; yearLabel: string; view: CalView;
  onView: (v: CalView) => void; onPrev: () => void; onNext: () => void;
}) {
  const views: CalView[] = ["month", "week", "day", "agenda"];
  return (
    <div className="flex items-end justify-between px-1 pb-3.5">
      <div className="flex items-baseline gap-2 leading-none">
        <span className="text-[30px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>{monthLabel}</span>
        <span className="text-[30px] font-light tracking-tight" style={{ color: "var(--text-faint, rgba(28,25,23,.34))" }}>{yearLabel}</span>
      </div>
      <div className="flex items-center gap-3.5">
        <div className="flex items-center gap-0.5">
          <button type="button" aria-label="Previous" onClick={onPrev} className="w-8 h-8 rounded-lg text-[18px]" style={{ color: "var(--text-muted)" }}>‹</button>
          <button type="button" aria-label="Next" onClick={onNext} className="w-8 h-8 rounded-lg text-[18px]" style={{ color: "var(--text-muted)" }}>›</button>
        </div>
        <div className="flex rounded-[9px] p-0.5" style={{ background: "rgba(28,25,23,.05)" }}>
          {views.map((v) => (
            <button key={v} type="button" onClick={() => onView(v)}
              className="px-3 py-1 text-[12.5px] rounded-[7px] capitalize"
              style={view === v ? { background: "var(--surface-1)", color: "var(--text-primary)", boxShadow: "0 1px 3px rgba(0,0,0,.08)" } : { color: "var(--text-muted)" }}>{v}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
