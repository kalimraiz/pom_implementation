# Playwright TypeScript POM E2E Demo

This repository contains a Playwright + TypeScript end-to-end test framework scaffold using the Page Object Model (POM). It's wired in "demo" mode so you can run an interactive session against the target site.

Site under test: https://api-mprt-grp1.ai.azm-dev.com/

Quick start

1. Install dependencies:

```bash
cd /Users/azmdev/AI-Assignment-Project
npm install
```

2. Install Playwright browsers (required):

```bash
npm run install:drivers
```

3. Run tests in demo/debug mode (interactive):

```bash
npm run test:debug
```

Notes

- Tests run against the baseURL configured in `playwright.config.ts`.
- `tests/home.spec.ts` is a minimal smoke test using POM.
- Next steps: add more Page Objects, fixtures (auth), CI pipeline.
