import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  outputDir: 'test/scratch/playwright',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL:
      process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173/preview/',
    trace: 'retain-on-failure',
  },
  webServer: process.env.PLAYWRIGHT_EXTERNAL_SERVER
    ? undefined
    : {
        command: 'node tests/serve.mjs',
        url: 'http://127.0.0.1:4173/preview/',
        reuseExistingServer: false,
      },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        launchOptions: {
          ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
            ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
            : {}),
        },
      },
    },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
