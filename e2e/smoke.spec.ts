import { expect, test } from '@playwright/test';

test('app exposes at least one canvas in the DOM', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveCount(1);
});
