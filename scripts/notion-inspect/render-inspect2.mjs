import { chromium } from "playwright";
const PAGES = [
  { key: "english", url: "https://young-record-a3b.notion.site/English-Build-28ad5ba5f1b080d68304fe0b3b727acb" },
  { key: "japanese", url: "https://diadesigner.notion.site/Japanese-Language-Tracker-21413a436bee80c0b14ff9b2c2109304" },
  { key: "python", url: "https://candle-gosling-511.notion.site/Python-Roadmap-By-Data-With-Baraa-28334b251f12819c924be86a2e85f6eb" },
];
const browser = await chromium.launch();
for (const { key, url } of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch(()=>{});
  await page.waitForTimeout(3000);
  const r = await page.evaluate(() => {
    // For a block class, find the descendant element with the largest font-size (the real text node).
    function metric(sel) {
      const blocks = [...document.querySelectorAll(sel)];
      let best=null, bestSize=0;
      for (const b of blocks) {
        for (const el of [b, ...b.querySelectorAll('*')]) {
          const s = getComputedStyle(el); const fs = parseFloat(s.fontSize);
          if (fs > bestSize && el.textContent.trim()) { bestSize=fs; best=s; }
        }
      }
      return best ? { fontSize: best.fontSize, lineHeight: best.lineHeight, fontWeight: best.fontWeight, color: best.color } : null;
    }
    function bg(sel) {
      const out=[];
      for (const el of document.querySelectorAll(sel)) {
        const s=getComputedStyle(el); const c=s.backgroundColor;
        if (c && c!=="rgba(0, 0, 0, 0)") out.push(c);
      }
      return [...new Set(out)];
    }
    // Page title: the .notion-page-block at top level (largest text overall above content)
    const titleEl = document.querySelector('.notion-page-content')?.parentElement?.querySelector('.notranslate');
    return {
      h1: metric('.notion-header-block'),
      h2: metric('.notion-sub_header-block'),
      h3: metric('.notion-sub_sub_header-block'),
      callouts_bg: bg('.notion-callout-block'),
      pageTitle: (()=>{ // find biggest font on page
        let best=null,bs=0;
        for (const el of document.querySelectorAll('.notion-page-content ~ *, .notion-frame *')) {
          const s=getComputedStyle(el); const f=parseFloat(s.fontSize);
          if (f>bs && f>24 && el.textContent.trim()){bs=f;best={fontSize:s.fontSize,lineHeight:s.lineHeight,fontWeight:s.fontWeight};}
        }
        return best;
      })(),
    };
  });
  console.log(`\n=== ${key} ===`);
  console.log(JSON.stringify(r,null,1));
  await ctx.close();
}
await browser.close();
