const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');

const TARGET_URL = 'https://amebazaar.in';
const OUTPUT_DIR = path.join(__dirname, '..', 'qa');

// Ensure output directories exist
const screenshotsDir = path.join(OUTPUT_DIR, 'screenshots');
const lighthouseDir = path.join(OUTPUT_DIR, 'lighthouse');
fs.mkdirSync(screenshotsDir, { recursive: true });
fs.mkdirSync(lighthouseDir, { recursive: true });

async function run() {
  console.log(`Starting QA checks for ${TARGET_URL}...`);
  const report = {
    url: TARGET_URL,
    timestamp: new Date().toISOString(),
    screenshots: {},
    consoleErrors: [],
    brokenLinks: [],
    schemas: [],
    openGraph: {},
    lighthouse: {},
    status: 'PASSED'
  };

  const browser = await chromium.launch({ headless: true });
  
  // 1. Desktop Check (1280x800)
  console.log('Running Desktop Audits...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  });
  const desktopPage = await desktopContext.newPage();
  
  // Hook console errors
  desktopPage.on('console', msg => {
    if (msg.type() === 'error') {
      report.consoleErrors.push(msg.text());
    }
  });

  try {
    await desktopPage.goto(TARGET_URL, { waitUntil: 'networkidle' });
    
    // Save Desktop Screenshot
    const desktopScreenshotPath = path.join(screenshotsDir, 'desktop.png');
    await desktopPage.screenshot({ path: desktopScreenshotPath });
    report.screenshots.desktop = '/qa/screenshots/desktop.png';
    console.log(`Desktop screenshot saved to ${desktopScreenshotPath}`);

    // Validate Open Graph
    const metaTags = await desktopPage.$$eval('meta', tags => {
      return tags.map(t => ({
        property: t.getAttribute('property'),
        name: t.getAttribute('name'),
        content: t.getAttribute('content')
      }));
    });
    
    metaTags.forEach(tag => {
      if (tag.property && tag.property.startsWith('og:')) {
        report.openGraph[tag.property] = tag.content;
      }
      if (tag.name && tag.name.startsWith('twitter:')) {
        report.openGraph[tag.name] = tag.content;
      }
    });

    // Validate Schema JSON-LD
    const schemaContents = await desktopPage.$$eval('script[type="application/ld+json"]', scripts => {
      return scripts.map(s => s.textContent);
    });

    schemaContents.forEach(rawJson => {
      try {
        const parsed = JSON.parse(rawJson);
        if (parsed['@graph']) {
          report.schemas.push(...parsed['@graph']);
        } else {
          report.schemas.push(parsed);
        }
      } catch (err) {
        console.error('Failed to parse schema JSON-LD: ', err.message);
      }
    });

    // Extract links for broken links check
    const rawLinks = await desktopPage.$$eval('a', anchors => {
      return anchors.map(a => a.href);
    });
    const uniqueLinks = [...new Set(rawLinks)].filter(l => l && l.startsWith(TARGET_URL));

    console.log(`Checking ${uniqueLinks.length} internal links...`);
    for (const link of uniqueLinks) {
      try {
        const res = await axios.head(link, { timeout: 5000, validateStatus: () => true });
        if (res.status >= 400) {
          report.brokenLinks.push({ url: link, status: res.status });
        }
      } catch (err) {
        // Fallback to GET on HEAD failure
        try {
          const resGet = await axios.get(link, { timeout: 5000, validateStatus: () => true });
          if (resGet.status >= 400) {
            report.brokenLinks.push({ url: link, status: resGet.status });
          }
        } catch (getErr) {
          report.brokenLinks.push({ url: link, status: 'TIMEOUT/FAILED', error: getErr.message });
        }
      }
    }

  } catch (err) {
    console.error('Desktop audit failed: ', err.message);
    report.status = 'FAILED';
  } finally {
    await desktopContext.close();
  }

  // 2. Mobile Check (375x812)
  console.log('Running Mobile Audits...');
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true
  });
  const mobilePage = await mobileContext.newPage();
  try {
    await mobilePage.goto(TARGET_URL, { waitUntil: 'networkidle' });
    const mobileScreenshotPath = path.join(screenshotsDir, 'mobile.png');
    await mobilePage.screenshot({ path: mobileScreenshotPath });
    report.screenshots.mobile = '/qa/screenshots/mobile.png';
    console.log(`Mobile screenshot saved to ${mobileScreenshotPath}`);
  } catch (err) {
    console.error('Mobile audit failed: ', err.message);
  } finally {
    await mobileContext.close();
  }

  // 3. Full Page Screenshot Check
  console.log('Running Full Page Screenshot...');
  const fpContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const fpPage = await fpContext.newPage();
  try {
    await fpPage.goto(TARGET_URL, { waitUntil: 'networkidle' });
    const fpScreenshotPath = path.join(screenshotsDir, 'fullpage.png');
    await fpPage.screenshot({ path: fpScreenshotPath, fullPage: true });
    report.screenshots.fullpage = '/qa/screenshots/fullpage.png';
    console.log(`Full-page screenshot saved to ${fpScreenshotPath}`);
  } catch (err) {
    console.error('Full page screenshot failed: ', err.message);
  } finally {
    await fpContext.close();
  }

  await browser.close();

  // 4. Run Lighthouse CLI
  console.log('Running Lighthouse Audit...');
  try {
    const jsonOutput = path.join(lighthouseDir, 'report.json');
    const htmlOutput = path.join(lighthouseDir, 'report.html');
    execSync(`npx lighthouse ${TARGET_URL} --chrome-flags="--headless --no-sandbox" --output json --output html --output-path=${path.join(lighthouseDir, 'report')}`, { stdio: 'inherit' });
    
    // Rename output files to fixed paths
    if (fs.existsSync(`${path.join(lighthouseDir, 'report')}.report.json`)) {
      fs.renameSync(`${path.join(lighthouseDir, 'report')}.report.json`, jsonOutput);
    }
    if (fs.existsSync(`${path.join(lighthouseDir, 'report')}.report.html`)) {
      fs.renameSync(`${path.join(lighthouseDir, 'report')}.report.html`, htmlOutput);
    }

    const lhData = JSON.parse(fs.readFileSync(jsonOutput, 'utf-8'));
    report.lighthouse = {
      performance: lhData.categories.performance.score * 100,
      accessibility: lhData.categories.accessibility.score * 100,
      bestPractices: lhData.categories['best-practices'].score * 100,
      seo: lhData.categories.seo.score * 100
    };
    console.log('Lighthouse Metrics:', report.lighthouse);
  } catch (err) {
    console.error('Lighthouse audit failed: ', err.message);
    report.lighthouse = { error: err.message };
  }

  // 5. Critical Gate Verifications
  console.log('Evaluating Quality Gate rules...');
  
  // Rule A: Check for console errors
  if (report.consoleErrors.length > 0) {
    console.warn(`Quality Gate Alert: ${report.consoleErrors.length} console errors detected.`);
  }

  // Rule B: Check for broken links
  if (report.brokenLinks.length > 0) {
    console.error(`Quality Gate Failed: ${report.brokenLinks.length} broken internal links detected!`);
    report.status = 'FAILED';
  }

  // Rule C: Validate Logo in OG Image
  if (!report.openGraph['og:image'] || !report.openGraph['og:image'].includes('logo.png')) {
    console.error('Quality Gate Failed: OpenGraph og:image is missing or does not point to logo.png!');
    report.status = 'FAILED';
  }

  // Rule D: Validate Schema details
  const orgSchema = report.schemas.find(s => s['@type'] === 'Organization' || s['@type'] === 'ClothingStore');
  if (!orgSchema) {
    console.error('Quality Gate Failed: Missing Organization/Store Schema context!');
    report.status = 'FAILED';
  }

  // 6. Generate final HTML report
  const reportHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>AME Bazaar QA Report</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 1000px; margin: 0 auto; padding: 2rem; background: #fafaf9; }
      h1, h2, h3 { color: #0f172a; }
      .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: 700; font-size: 0.85rem; }
      .badge-success { background: #dcfce7; color: #15803d; }
      .badge-danger { background: #fee2e2; color: #b91c1c; }
      .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 2rem 0; }
      .metric-card { background: #fff; padding: 1.5rem; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
      .metric-val { font-size: 2.25rem; font-weight: 800; color: #0f172a; margin-top: 0.5rem; }
      .screenshot-container { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 2rem; }
      .screenshot-card { background: #fff; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 8px; width: 300px; }
      .screenshot-card img { width: 100%; height: auto; border: 1px solid #cbd5e1; border-radius: 4px; }
      .error-list { background: #fff; border: 1px solid #fee2e2; border-radius: 8px; padding: 1.5rem; color: #b91c1c; list-style: none; }
      .error-list li { margin-bottom: 0.5rem; border-bottom: 1px solid #fecaca; padding-bottom: 0.5rem; }
    </style>
  </head>
  <body>
    <header style="border-bottom: 1px solid #e2e8f0; padding-bottom: 1.5rem; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h1>AME Bazaar QA Verification</h1>
        <p style="color: #64748b; margin: 0;">Audit URL: <a href="${TARGET_URL}">${TARGET_URL}</a> | Date: ${report.timestamp}</p>
      </div>
      <span class="badge ${report.status === 'PASSED' ? 'badge-success' : 'badge-danger'}">${report.status}</span>
    </header>

    <h2>Lighthouse Metrics</h2>
    <div class="metrics-grid">
      <div class="metric-card">
        <div>Performance</div>
        <div class="metric-val" style="color: ${report.lighthouse.performance >= 90 ? '#16a34a' : '#ea580c'}">${report.lighthouse.performance || 'N/A'}</div>
      </div>
      <div class="metric-card">
        <div>Accessibility</div>
        <div class="metric-val" style="color: ${report.lighthouse.accessibility >= 90 ? '#16a34a' : '#ea580c'}">${report.lighthouse.accessibility || 'N/A'}</div>
      </div>
      <div class="metric-card">
        <div>Best Practices</div>
        <div class="metric-val" style="color: ${report.lighthouse.bestPractices >= 90 ? '#16a34a' : '#ea580c'}">${report.lighthouse.bestPractices || 'N/A'}</div>
      </div>
      <div class="metric-card">
        <div>SEO</div>
        <div class="metric-val" style="color: ${report.lighthouse.seo >= 90 ? '#16a34a' : '#ea580c'}">${report.lighthouse.seo || 'N/A'}</div>
      </div>
    </div>

    <h2>Open Graph Properties</h2>
    <table style="width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin: 2rem 0;">
      <thead>
        <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
          <th style="padding: 1rem; text-align: left;">Property</th>
          <th style="padding: 1rem; text-align: left;">Value</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(report.openGraph).map(([prop, val]) => `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 1rem; font-weight: 600;">${prop}</td>
            <td style="padding: 1rem; color: #475569;">${val}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    ${report.consoleErrors.length > 0 ? `
      <h2>Console Errors (${report.consoleErrors.length})</h2>
      <ul class="error-list">
        ${report.consoleErrors.map(e => `<li>${e}</li>`).join('')}
      </ul>
    ` : '<h2>Console Errors</h2><p style="color: #16a34a; font-weight: bold;">✔ No console errors recorded.</p>'}

    ${report.brokenLinks.length > 0 ? `
      <h2>Broken Links (${report.brokenLinks.length})</h2>
      <ul class="error-list">
        ${report.brokenLinks.map(l => `<li>Broken Link: <strong>${l.url}</strong> (Status: ${l.status})</li>`).join('')}
      </ul>
    ` : '<h2>Broken Links</h2><p style="color: #16a34a; font-weight: bold;">✔ No broken links detected.</p>'}

    <h2>Screenshots</h2>
    <div class="screenshot-container">
      <div class="screenshot-card">
        <h3>Desktop (1280x800)</h3>
        <img src="screenshots/desktop.png" />
      </div>
      <div class="screenshot-card">
        <h3>Mobile (375x812)</h3>
        <img src="screenshots/mobile.png" />
      </div>
      <div class="screenshot-card">
        <h3>Full Page</h3>
        <img src="screenshots/fullpage.png" />
      </div>
    </div>
  </body>
  </html>
  `;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'report.html'), reportHtml);
  console.log(`QA HTML Report saved to ${path.join(OUTPUT_DIR, 'report.html')}`);

  // Exit with error code if status failed
  if (report.status === 'FAILED') {
    console.error('Quality Gate Failed! Exit status 1.');
    process.exit(1);
  } else {
    console.log('Quality Gate Passed successfully!');
    process.exit(0);
  }
}

run();
