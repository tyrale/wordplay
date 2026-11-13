// Renders the app icon set (apps/native/assets) with Playwright Chromium and
// Inter 900 (npm pack @fontsource/inter, files/inter-latin-900-normal.woff2).
// usage (from the repo root):
//   node scripts/render-app-icons.cjs <inter-900.woff2> apps/native/assets scripts/app-icons.json
// Each job: { file, size, bg (css or "transparent"), word, fontSize, left,
//             top, tracking (em), center (bool), colors: [per-letter css colors] }
const fs = require('fs');
const path = require('path');
const { chromium } = require(path.join(process.cwd(), 'node_modules', 'playwright'));

const [fontPath, outDir, jobsPath] = process.argv.slice(2);
const font = fs.readFileSync(fontPath).toString('base64');
const jobs = JSON.parse(fs.readFileSync(jobsPath, 'utf8'));

function html(job) {
  const letters = [...job.word]
    .map((ch, i) => `<span style="color:${job.colors[i % job.colors.length]}">${ch}</span>`)
    .join('');
  return `<!doctype html><html><head><style>
    @font-face { font-family: InterBlack; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 900; }
    html, body { margin: 0; padding: 0; background: transparent; }
    #c { position: relative; width: ${job.size}px; height: ${job.size}px; overflow: hidden; background: ${job.bg}; }
    #w { position: absolute; ${job.center ? "left: 50%; top: 50%; transform: translate(-50%, -54%);" : `left: ${job.left}px; top: ${job.top}px;`} white-space: nowrap;
         font-family: InterBlack; font-weight: 900; font-size: ${job.fontSize}px; line-height: 1;
         letter-spacing: ${job.tracking ?? -0.04}em; }
  </style></head><body><div id="c"><div id="w">${letters}</div></div></body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const job of jobs) {
    await page.setViewportSize({ width: job.size, height: job.size });
    await page.setContent(html(job));
    await page.evaluate(() => document.fonts.ready);
    const out = path.join(outDir, job.file);
    await page.locator('#c').screenshot({ path: out, omitBackground: job.bg === 'transparent' });
    console.log('wrote', out);
  }
  await browser.close();
})();
