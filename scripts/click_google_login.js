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
      'button:has-text("Sign in with Google")',
      'button:has-text("Sign in with Google")',
      'button:has-text("Continue with Google")',
      'button:has-text("Continue with Google")',
      'text="Sign in with Google"',
      'a:has-text("Sign in with Google")',
      'button[aria-label*="google"]',
      '[data-provider="google"]',
      'button:has(svg[aria-label*="Google"])',
    ];

    let clicked = false;

    // listen for new pages (popup) or navigation
    const newPages = [];
    context.on('page', p => newPages.push(p));

    for (const sel of selectors) {
      const loc = page.locator(sel).first();
      const count = await loc.count();
      if (count > 0) {
        console.log('Found element for selector:', sel);
        await loc.scrollIntoViewIfNeeded();
        try {
          await Promise.all([
            loc.click({ timeout: 10000 }),
            page.waitForLoadState('networkidle').catch(()=>{}),
          ]);
          console.log('Clicked selector:', sel);
          clicked = true;
          break;
        } catch (err) {
          console.warn('Click failed for', sel, err.message);
        }
      }
    }

    if (!clicked) {
      console.log('No Google-login element found. Dumping snippet:');
      console.log((await page.content()).slice(0, 4000));
    } else {
      await page.waitForTimeout(3000);
      if (newPages.length > 0) {
        console.log('Detected popup pages:', newPages.length);
        for (const p of newPages) {
          console.log('Popup URL:', p.url());
        }
      } else {
        console.log('No popup detected. Current page URL:', page.url());
      }
    }
  } catch (err) {
    console.error('Script error:', err.message);
  } finally {
    try { await browser.close(); } catch(e){}
  }
})();
