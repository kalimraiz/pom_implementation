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

    // Try to open a sign-in form if there's a link/button
    const entrySelectors = [
      'a:has-text("Sign in")',
      'a:has-text("Sign In")',
      'a:has-text("Login")',
      'button:has-text("Sign in")',
      'button:has-text("Login")',
      'text=Sign in',
      'text=Login',
    ];

    for (const sel of entrySelectors) {
      const loc = page.locator(sel).first();
      if (await loc.count() > 0) {
        console.log('Found entry element:', sel);
        try { await loc.click({ timeout: 5000 }); await page.waitForTimeout(800); } catch(e) {}
        break;
      }
    }

    // Wait a bit for form to appear
    await page.waitForTimeout(500);

    // Candidate input selectors
    const emailSelectors = ['input[type="email"]', 'input[name="email"]', 'input[id*=email]', 'input[name*=user]', 'input[type="text"]'];
    const passSelectors = ['input[type="password"]', 'input[name="password"]', 'input[id*=pass]'];

    let emailFound = null;
    for (const s of emailSelectors) {
      const loc = page.locator(s).first();
      if (await loc.count() > 0) { emailFound = s; break; }
    }

    let passFound = null;
    for (const s of passSelectors) {
      const loc = page.locator(s).first();
      if (await loc.count() > 0) { passFound = s; break; }
    }

    if (!emailFound || !passFound) {
      console.warn('Could not find email or password fields using common selectors. Dumping snippet for inspection.');
      const snippet = (await page.content()).slice(0, 4000);
      console.log(snippet);
      const dumpPath = 'artifacts/login-page.html';
      try { fs.mkdirSync('artifacts', { recursive: true }); fs.writeFileSync(dumpPath, snippet); console.log('Wrote snippet to', dumpPath); } catch(e){}
      await page.screenshot({ path: 'artifacts/login-failed.png', fullPage: false });
      console.log('Saved screenshot to artifacts/login-failed.png');
      await browser.close();
      process.exit(1);
    }

    // Fill the fields
    console.log('Filling email using selector:', emailFound);
    await page.fill(emailFound, EMAIL);
    await page.fill(passFound, PASSWORD);

    // Try submit buttons
    const submitSelectors = ['button[type="submit"]', 'button:has-text("Sign in")', 'button:has-text("Login")', 'input[type="submit"]'];
    let submitted = false;
    for (const s of submitSelectors) {
      const loc = page.locator(s).first();
      if (await loc.count() > 0) {
        try { await Promise.all([loc.click({ timeout: 5000 }), page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(()=>{})]); submitted = true; break; } catch(e) { /* ignore */ }
      }
    }

    if (!submitted) {
      // fallback: press Enter in password
      await page.press(passFound, 'Enter').catch(()=>{});
      await page.waitForTimeout(1500);
    }

    await page.waitForTimeout(1500);

    // Determine success heuristics
    const currentUrl = page.url();
    console.log('Post-submit URL:', currentUrl);

    // success if redirected away from sign-in path and not to Google accounts
    const success = !/signin|login|accounts.google.com/i.test(currentUrl);

    // Also look for common logged-in indicators
    const accountSelectors = ['text=Logout', 'text=Sign out', 'text=My account', 'text=Profile', 'a:has-text("Logout")', 'button:has-text("Logout")'];
    let accountFound = false;
    for (const s of accountSelectors) {
      const loc = page.locator(s).first();
      if (await loc.count() > 0) { accountFound = true; break; }
    }

    const finalSuccess = success || accountFound;

    // Save a screenshot (doesn't contain credentials)
    try { fs.mkdirSync('artifacts', { recursive: true }); await page.screenshot({ path: 'artifacts/login-result.png', fullPage: false }); console.log('Saved screenshot to artifacts/login-result.png'); } catch(e){}

    if (finalSuccess) {
      console.log('Login appears successful. Current URL:', currentUrl);
      await browser.close();
      process.exit(0);
    } else {
      console.log('Login did not appear successful. Current URL:', currentUrl);
      await browser.close();
      process.exit(1);
    }
  } catch (err) {
    console.error('Script error:', err && err.message ? err.message : err);
    try { await page.screenshot({ path: 'artifacts/login-error.png', fullPage: false }); } catch(e){}
    try { await browser.close(); } catch(e){}
    process.exit(2);
  }
})();
