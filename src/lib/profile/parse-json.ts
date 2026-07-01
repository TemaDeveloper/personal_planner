/**
 * Extract a JSON block from an AI response, tolerating code fences and leading
 * prose, and handling both object (`{...}`) and array (`[...]`) roots.
 * (The shared extractJSON in ai.ts only handles object roots.)
 */
export function extractJsonBlock(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced ? fenced[1] : text).trim();

  const firstObj = body.indexOf("{");
  const firstArr = body.indexOf("[");

  let start = -1;
  let openChar = "{";
  if (firstArr !== -1 && (firstObj === -1 || firstArr < firstObj)) {
    start = firstArr;
    openChar = "[";
  } else if (firstObj !== -1) {
    start = firstObj;
    openChar = "{";
  }
  if (start === -1) return body;

  const closeChar = openChar === "{" ? "}" : "]";
  const end = body.lastIndexOf(closeChar);
  if (end === -1 || end < start) return body.slice(start);
  return body.slice(start, end + 1);
}
