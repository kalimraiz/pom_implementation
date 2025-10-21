const { chromium } = require('playwright');

(async () => {
  const url = process.env.TARGET_URL || 'https://api-mprt-grp1.ai.azm-dev.com/';
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  try {
    console.log('Navigating to', url);
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500);

    const selectors = [
      'button:has-text("Demo")',
      'button:has-text("demo")',
      'button:has-text("Try demo")',
      'text="Try demo mode"',
      'text="Try demo"',
      'a:has-text("Demo")',
      '[aria-label*="demo"]',
      'button[role="button"]:has-text("Demo")',
    ];

    let clicked = false;
    for (const sel of selectors) {
      const loc = page.locator(sel).first();
      const count = await loc.count();
      if (count > 0) {
        console.log('Found element for selector:', sel);
        await loc.scrollIntoViewIfNeeded();
        try {
          await loc.click({ timeout: 5000 });
          console.log('Clicked selector:', sel);
          clicked = true;
          break;
        } catch (err) {
          console.warn('Click failed for', sel, err.message);
        }
      }
    }

    if (!clicked) {
      console.log('No demo button found. Dumping first 4000 chars of page HTML for inspection:');
      const html = await page.content();
      console.log(html.slice(0, 4000));
    } else {
      await page.waitForTimeout(3000);
    }
  } catch (err) {
    console.error('Script error:', err.message);
  } finally {
    try { await browser.close(); } catch(e){}
  }
})();
