"use client";

export type ChipEvent = {
  id: string;
  title: string;
  color: string;
  allDay?: boolean;
  start?: string | Date;
};

export function EventChip({
  event,
  onClick,
  variant = "chip",
}: {
  event: ChipEvent;
  onClick?: () => void;
  variant?: "chip" | "block" | "row";
}) {
  const time =
    !event.allDay && event.start
      ? new Date(event.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : null;

  if (variant === "block") {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full h-full text-left rounded-md px-1.5 py-1 text-xs overflow-hidden"
        style={{ background: `${event.color}22`, borderLeft: `3px solid ${event.color}`, color: "var(--text-primary)" }}
      >
        <span className="font-medium">{event.title}</span>
      </button>
    );
  }

  if (variant === "row") {
    return (
      <button type="button" onClick={onClick} className="w-full flex items-center gap-2 py-1.5 text-left">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: event.color }} />
        {time && <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>{time}</span>}
        <span className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{event.title}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-1 rounded px-1 py-0.5 text-[11px] truncate"
      style={{ background: `${event.color}22`, color: "var(--text-primary)" }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: event.color }} />
      <span className="truncate">{event.title}</span>
    </button>
  );
}
