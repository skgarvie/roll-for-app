import { defineConfig, devices } from '@playwright/test';
import { basePath } from './base-path';

// Match vite.config.ts so CI can test the exact build that gets deployed.
const base = basePath();
const origin = 'http://localhost:4173';

// E2E runs against the production build so the service worker is real.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `${origin}${base}`,
    trace: 'on-first-retry',
  },
  // WebKit is the closest match to iPad Safari.
  projects: [
    { name: 'ipad-landscape', use: { ...devices['iPad Pro 11 landscape'] } },
    { name: 'ipad-portrait', use: { ...devices['iPad Pro 11'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: `${origin}${base}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
