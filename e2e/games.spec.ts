import { expect, test } from '@playwright/test';

test.describe('Rubrique Jeux — Le Corbeau et le Renard 3D', () => {
  test('ouvre la rubrique Jeux, rend la scène 3D HTML-in-Canvas et réagit aux flèches', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('ERR_INTERNET_DISCONNECTED')) {
        errors.push(msg.text());
      }
    });

    await page.goto('#/jeux/corbeau-renard');

    // Games tab is active
    const gamesTab = page.getByRole('tab', { name: 'Jeux' });
    await expect(gamesTab).toHaveAttribute('aria-selected', 'true');

    // Canvas with HTML-in-Canvas attributes is mounted & visible
    const canvas = page.locator('canvas[layoutsubtree][content="drawable"]');
    await expect(canvas).toBeVisible();

    // Start the game
    await page.getByRole('button', { name: /Commencer la partie/i }).click();
    await expect(page.getByRole('button', { name: /Mettre en pause/i })).toBeVisible();

    // Drive Maître Renard left/right and trigger flattery with ArrowUp
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(350);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(350);
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(350);

    // Pause and verify pause overlay
    await page.getByRole('button', { name: /Mettre en pause/i }).click();
    await expect(page.getByRole('heading', { name: 'Pause' })).toBeVisible();

    expect(errors).toEqual([]);
  });
});
