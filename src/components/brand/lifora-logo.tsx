/**
 * Lifora logo mark — a geometric "L" in clay with a sage sunrise arc in the crook.
 * Pure SVG, so it stays crisp at any size. Transparent background (the corner gap
 * shows whatever is behind it). Colors are the brand clay + muted sage.
 */
export function LiforaLogo({
  size = 28,
  className,
  title = "Lifora",
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* the L */}
      <path d="M20 18 H42 V58 H82 V80 H20 Z" fill="#C0613C" />
      {/* quarter disc filling the crook (inset, leaving a gap that reads as the corner) */}
      <path d="M45 55 V25 A30 30 0 0 1 75 55 Z" fill="#C0613C" />
      {/* sage sunrise arc, just outside the disc */}
      <path d="M45 22 A33 33 0 0 1 78 55" stroke="#9CA39B" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
