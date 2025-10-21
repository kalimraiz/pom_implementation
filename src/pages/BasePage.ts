import { Page } from '@playwright/test';

const DEFAULT_BASE = 'https://api-mprt-grp1.ai.azm-dev.com';

export default class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a path or full URL. If `path` starts with http(s) it's used as-is.
   * Otherwise it's resolved against BASE_URL env var or the default site.
   */
  async goto(path = '/') {
    const base = process.env.BASE_URL || DEFAULT_BASE;
    const url = path.match(/^https?:\/\//) ? path : `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : '/' + path}`;
    await this.page.goto(url);
  }

  async title() {
    return this.page.title();
  }
}
