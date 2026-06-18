export interface LinkMeta {
  title: string;
  description: string;
  image: string;
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&nbsp;": " ",
};
function decodeEntities(s: string): string {
  return s.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&apos;|&nbsp;/g, (m) => ENTITIES[m] ?? m);
}

/** Extract title/description/image from raw HTML (OpenGraph first, then fallbacks).
 * Tolerant of attribute order (content before/after property). */
export function extractMeta(html: string): LinkMeta {
  const first = (re: RegExp): string => {
    const m = re.exec(html);
    return m ? m[1].trim() : "";
  };
  const ogProp = (prop: string): string =>
    first(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']*)["']`, "i")) ||
    first(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:${prop}["']`, "i"));

  const title = ogProp("title") || first(/<title[^>]*>([^<]*)<\/title>/i);
  const description =
    ogProp("description") ||
    first(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
    first(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const image = ogProp("image");

  return {
    title: decodeEntities(title),
    description: decodeEntities(description),
    image: decodeEntities(image),
  };
}
