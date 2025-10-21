import BasePage from './BasePage';
import { Locator, Page } from '@playwright/test';

export default class HomePage extends BasePage {
  readonly heading: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.locator('h1');
  }

  async getHeadingText() {
    return this.heading.textContent();
  }
}
