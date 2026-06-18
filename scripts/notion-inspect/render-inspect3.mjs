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
  await page.waitForSelector('.notion-page-content', { timeout: 30000 }).catch(()=>{});
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => {
    function metric(sel){
      let best=null,bs=0;
      for (const b of document.querySelectorAll(sel))
        for (const el of [b,...b.querySelectorAll('*')]){
          const s=getComputedStyle(el),f=parseFloat(s.fontSize);
          if(f>bs && el.textContent.trim()){bs=f;best={fontSize:s.fontSize,lineHeight:s.lineHeight,fontWeight:s.fontWeight,color:s.color};}
        }
      return best;
    }
    function bgs(sel){
      const out=new Set();
      for (const b of document.querySelectorAll(sel))
        for (const el of [b,...b.querySelectorAll('*')]){
          const c=getComputedStyle(el).backgroundColor;
          if(c && c!=="rgba(0, 0, 0, 0)") out.add(c);
        }
      return [...out];
    }
    // biggest text element on whole page = page title
    let t=null,ts=0;
    for(const el of document.querySelectorAll('*')){
      const s=getComputedStyle(el),f=parseFloat(s.fontSize);
      if(f>ts && f>=24 && el.textContent.trim() && el.children.length<3){ts=f;t={fontSize:s.fontSize,lineHeight:s.lineHeight,fontWeight:s.fontWeight};}
    }
    return {
      pageTitle:t,
      h1:metric('.notion-header-block'),
      h2:metric('.notion-sub_header-block'),
      h3:metric('.notion-sub_sub_header-block'),
      calloutBg:bgs('.notion-callout-block'),
      collectionBg:bgs('.notion-collection_view-block'),
    };
  });
  console.log(`\n=== ${key} ===\n`+JSON.stringify(r,null,1));
  await ctx.close();
}
await browser.close();
