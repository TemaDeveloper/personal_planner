/** A fractional order value placing an item between two neighbors.
 * Lets us reorder/re-nest by drag without renumbering siblings. */
export function orderBetween(prev: number | undefined, next: number | undefined): number {
  if (prev === undefined && next === undefined) return 0;
  if (prev === undefined) return (next as number) - 1;
  if (next === undefined) return prev + 1;
  return (prev + next) / 2;
}
