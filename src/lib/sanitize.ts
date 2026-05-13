/**
 * Pick only allowed fields from a request body.
 * Prevents mass assignment attacks on MongoDB update operations.
 */
export function pickFields(
  body: Record<string, unknown>,
  allowed: string[]
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  );
}
