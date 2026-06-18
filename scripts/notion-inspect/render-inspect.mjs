// Rendered-design inspection of public Notion pages.
// Measures computed CSS (typography, spacing, color, layout) so we can match
// the look. Public pages only — no login, no proprietary code copied.
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const OUT = path.resolve("scripts/notion-inspect/out/render");
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  { key: "english", url: "https://young-record-a3b.notion.site/English-Build-28ad5ba5f1b080d68304fe0b3b727acb" },
  { key: "japanese", url: "https://diadesigner.notion.site/Japanese-Language-Tracker-21413a436bee80c0b14ff9b2c2109304" },
  { key: "python", url: "https://candle-gosling-511.notion.site/Python-Roadmap-By-Data-With-Baraa-28334b251f12819c924be86a2e85f6eb" },
];

// Properties we care about for copying a design.
const PROPS = [
  "fontFamily", "fontSize", "lineHeight", "fontWeight", "letterSpacing",
  "color", "backgroundColor", "textAlign",
  "marginTop", "marginBottom", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight",
  "borderRadius", "borderLeft", "border", "width", "maxWidth",
];

function pick(styleObj) {
  const o = {};
  for (const p of PROPS) if (styleObj[p] && styleObj[p] !== "normal" && styleObj[p] !== "0px") o[p] = styleObj[p];
  return o;
}

const browser = await chromium.launch();
const summary = {};

for (const { key, url } of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  // Notion renders content async; wait for a content block to appear.
  await page.waitForSelector('[class*="notion-page-content"], .notion-page-content, main', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2500);

  await page.screenshot({ path: path.join(OUT, `${key}-viewport.png`) });
  await page.screenshot({ path: path.join(OUT, `${key}-full.png`), fullPage: true });

  const data = await page.evaluate((PROPS) => {
    const cs = (el) => {
      const s = getComputedStyle(el); const o = {};
      for (const p of PROPS) o[p] = s[p];
      return o;
    };
    const firstStyle = (sel) => { const el = document.querySelector(sel); return el ? cs(el) : null; };

    // Inventory of every notion-* class and how many times it appears.
    const classCounts = {};
    for (const el of document.querySelectorAll('[class]')) {
      for (const c of el.classList) if (c.startsWith("notion-")) classCounts[c] = (classCounts[c] || 0) + 1;
    }

    // Representative element computed styles.
    const targets = {
      body: "body",
      pageContent: '.notion-page-content, [class*="notion-page-content"]',
      title: '.notion-page-block .notranslate, [class*="notion-page-block"] [contenteditable], h1',
      h1: '.notion-header-block, [class*="header-block"]',
      h2: '.notion-sub_header-block, [class*="sub_header-block"]',
      h3: '.notion-sub_sub_header-block, [class*="sub_sub_header-block"]',
      paragraph: '.notion-text-block, [class*="notion-text-block"]',
      callout: '.notion-callout-block, [class*="callout-block"]',
      quote: '.notion-quote-block, [class*="quote-block"]',
      bullet: '.notion-bulleted_list-block, [class*="bulleted_list-block"]',
      todo: '.notion-to_do-block, [class*="to_do-block"]',
      column: '.notion-column-block, [class*="column-block"]',
      collection: '.notion-collection-view-block, [class*="collection-view"]',
      divider: '.notion-divider-block, [class*="divider-block"]',
    };
    const styles = {};
    for (const [k, sel] of Object.entries(targets)) styles[k] = firstStyle(sel);

    // Content column geometry.
    const content = document.querySelector('.notion-page-content, [class*="notion-page-content"]');
    const geom = content ? (() => { const r = content.getBoundingClientRect(); return { width: Math.round(r.width), left: Math.round(r.left) }; })() : null;

    return { classCounts, styles, geom, scrollW: document.documentElement.scrollWidth };
  }, PROPS);

  const trimmed = {};
  for (const [k, v] of Object.entries(data.styles)) trimmed[k] = v ? pick(v) : null;

  summary[key] = {
    contentGeom: data.geom,
    scrollWidth: data.scrollW,
    topClasses: Object.entries(data.classCounts).sort((a, b) => b[1] - a[1]).slice(0, 30),
    styles: trimmed,
  };
  fs.writeFileSync(path.join(OUT, `${key}-classes.json`), JSON.stringify(data.classCounts, null, 2));
  await ctx.close();
  console.log(`done: ${key}`);
}

fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
await browser.close();
console.log("\nWrote", path.join(OUT, "summary.json"));
