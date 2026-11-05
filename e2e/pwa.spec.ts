import { expect, test } from '@playwright/test';

test('renders the app shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'RollFor', level: 1 })).toBeVisible();
});

test('serves a valid web app manifest', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const res = await request.get(href!);
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest.name).toBe('RollFor');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
});

test('has an apple-touch-icon and iPad splash screens', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  expect(await page.locator('link[rel="apple-touch-startup-image"]').count()).toBeGreaterThan(0);
});

test('loads offline after the service worker installs', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'RollFor', level: 1 })).toBeVisible();
  await expect(page.locator('img[src="/logo.svg"]')).toHaveJSProperty('complete', true);
});
