import { test, expect } from '@playwright/test';
import HomePage from '../src/pages/HomePage';

test.describe('Home page smoke', () => {
  test('should load and show heading', async ({ page, baseURL }) => {
    const home = new HomePage(page);
    await home.goto('/');
    const title = await home.title();
    // basic assertion: page has a title
    expect(title.length).toBeGreaterThan(0);

    // try to read an h1 if present (not required)
    const h1 = await home.getHeadingText();
    if (h1) {
      expect(h1.trim().length).toBeGreaterThan(0);
    }
  });
});
