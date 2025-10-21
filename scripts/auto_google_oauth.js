const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const EMAIL = process.env.EMAIL;
  const PASSWORD = process.env.PASSWORD;
  const url = process.env.TARGET_URL || 'https://api-mprt-grp1.ai.azm-dev.com/';

  if (!EMAIL || !PASSWORD) {
    console.error('ERROR: EMAIL and PASSWORD environment variables are required.');
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  try {
    console.log('Navigating to', url);
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Click the site's Google button if present
    const googleBtn = page.locator('button:has-text("Google"), button:has-text("Continue with Google"), button.btn-google').first();
    if (await googleBtn.count() === 0) {
      console.error('Google button not found on page.');
      await page.screenshot({ path: 'artifacts/google-missing-button.png' }).catch(()=>{});
      await browser.close();
      process.exit(1);
    }

    // Intercept new page / navigation
    const [responsePromise] = await Promise.all([
      context.waitForEvent('page').catch(()=>null),
      googleBtn.click({ timeout: 10000 }).catch(e=>{throw e}),
    ]);

    // Give time for navigation to accounts.google.com
    await page.waitForTimeout(1500);

    // Determine which page to operate on: either a new popup or the same page
    let googlePage = responsePromise || page;

    // If the click opened a popup, wait for it to load
    if (googlePage !== page) {
      await googlePage.waitForLoadState('load');
    } else {
      // if same page, ensure url includes accounts.google
      await page.waitForLoadState('load');
    }

    const gpUrl = (googlePage || page).url();
    console.log('Google flow URL:', gpUrl);

    if (!/accounts.google.com/.test(gpUrl)) {
      // sometimes redirect happens later; wait a bit
      await (googlePage || page).waitForTimeout(2000);
    }

    const g = googlePage || page;

    // Wait for email input
    const emailSelector = '#identifierId';
    await g.waitForTimeout(500);
    if (await g.locator(emailSelector).count() > 0) {
      console.log('Filling Google email...');
      await g.fill(emailSelector, EMAIL);
      // click next
      const idNext = g.locator('#identifierNext');
      if (await idNext.count() > 0) {
        await Promise.all([idNext.click(), g.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(()=>{})]);
      } else {
        await g.keyboard.press('Enter');
        await g.waitForTimeout(1000);
      }
    } else {
      console.warn('Email input not found on Google page. URL:', g.url());
      const snippet = (await g.content()).slice(0,4000);
      fs.mkdirSync('artifacts', { recursive: true }); fs.writeFileSync('artifacts/google-snippet.html', snippet);
      await g.screenshot({ path: 'artifacts/google-no-email.png' }).catch(()=>{});
      await browser.close();
      process.exit(1);
    }

    // Wait for password input
    await g.waitForTimeout(1500);
    const passInput = g.locator('input[type="password"]').first();
    if (await passInput.count() > 0) {
      console.log('Filling Google password...');
      await passInput.fill(PASSWORD);
      const pwNext = g.locator('#passwordNext');
      if (await pwNext.count() > 0) {
        await Promise.all([pwNext.click(), g.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(()=>{})]);
      } else {
        await g.keyboard.press('Enter');
        await g.waitForTimeout(1000);
      }
    } else {
      console.warn('Password input not found; possibly account requires extra verification.');
      await g.screenshot({ path: 'artifacts/google-no-password.png' }).catch(()=>{});
      await browser.close();
      process.exit(1);
    }

    // Wait and detect if we were challenged for 2FA or redirected back
    await g.waitForTimeout(3000);
    const finalUrl = g.url();
    console.log('After submit URL:', finalUrl);

    // detect 2FA or challenge pages
    const pageContent = await g.content();
    if (/challenge|2-step verification|verify|Verify it's you|phone/i.test(pageContent)) {
      console.log('Detected 2FA / challenge page. Automation cannot proceed without manual interaction.');
      fs.mkdirSync('artifacts', { recursive: true });
      await g.screenshot({ path: 'artifacts/google-2fa.png' }).catch(()=>{});
      await browser.close();
      process.exit(2);
    }

    // If redirected back to the application domain, consider success
    if (/api-mprt-grp1.ai.azm-dev.com/.test(finalUrl) || /signin-google/.test(finalUrl) || !/accounts.google.com/.test(finalUrl)) {
      console.log('Google OAuth appears to have returned to app or left accounts.google.com. finalUrl=', finalUrl);
      await g.screenshot({ path: 'artifacts/google-success.png' }).catch(()=>{});
      await browser.close();
      process.exit(0);
    }

    console.log('Flow ended at', finalUrl, '— saving screenshot for inspection.');
    fs.mkdirSync('artifacts', { recursive: true });
    await g.screenshot({ path: 'artifacts/google-end.png' }).catch(()=>{});
    await browser.close();
    process.exit(1);

  } catch (err) {
    console.error('Script error:', err && err.message ? err.message : err);
    try { fs.mkdirSync('artifacts', { recursive: true }); await page.screenshot({ path: 'artifacts/google-error.png' }); } catch(e){}
    try { await browser.close(); } catch(e){}
    process.exit(3);
  }
})();
