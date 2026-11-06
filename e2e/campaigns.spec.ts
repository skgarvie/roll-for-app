import { expect, test, type Page } from '@playwright/test';

async function createCampaign(
  page: Page,
  { name, character, dm }: { name: string; character: string; dm?: string },
) {
  await page.goto('./campaigns/new');
  await page.getByLabel('Campaign name').fill(name);
  if (dm) await page.getByLabel('Dungeon Master').fill(dm);
  await page.getByRole('button', { name: 'Next: character' }).click();
  // The full wizard is covered in sheets.spec.ts; start blank here.
  await page.getByRole('button', { name: 'Skip and start with a blank sheet' }).click();
  await page.getByLabel('Character name').fill(character);
  await page.getByRole('button', { name: 'Create campaign' }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

async function openMenuItem(page: Page, item: string) {
  await page.getByRole('button', { name: 'Campaign actions' }).click();
  await page.getByRole('menuitem', { name: item }).click();
}

test('first run: create a campaign from the empty state', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByText('No campaigns yet')).toBeVisible();
  await page.getByRole('link', { name: 'Start your first campaign' }).click();

  await page.getByLabel('Campaign name').fill('Curse of Strahd');
  await page.getByLabel('Dungeon Master').fill('Alex');
  await page.getByRole('button', { name: 'Next: character' }).click();
  await page.getByRole('button', { name: 'Skip and start with a blank sheet' }).click();
  await page.getByLabel('Character name').fill('Ireena');
  await page.getByRole('button', { name: 'Create campaign' }).click();

  // Lands on the first sheet of the new character.
  await expect(page.getByRole('heading', { level: 1, name: 'Curse of Strahd' })).toBeVisible();
  await expect(page.getByText('Ireena', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/campaign\/[^/]+\/s\/[^/]+$/);
  const tabs = page.getByRole('navigation', { name: 'Sheets' });
  for (const tab of [
    'Core',
    'Combat',
    'Spells',
    'Inventory',
    'Features & Traits',
    'Backstory',
    'Notes',
  ]) {
    await expect(tabs.getByRole('link', { name: tab })).toBeVisible();
  }
  await expect(tabs.getByRole('link', { name: 'Core' })).toHaveAttribute('aria-current', 'page');

  // Persisted: reload the deep link, then go back to the list.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Curse of Strahd' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to campaigns' }).click();
  await expect(page.getByRole('link', { name: /Curse of Strahd.*Ireena/ })).toBeVisible();
});

test('edit campaign details and rename the character', async ({ page }) => {
  await createCampaign(page, { name: 'Waterdeep', character: 'Vex' });

  await openMenuItem(page, 'Edit campaign');
  const edit = page.getByRole('dialog', { name: 'Edit campaign' });
  await edit.getByLabel('Campaign name').fill('Waterdeep: Dragon Heist');
  await edit.getByRole('button', { name: 'Save' }).click();
  await expect(edit).toBeHidden();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Waterdeep: Dragon Heist' }),
  ).toBeVisible();

  await openMenuItem(page, 'Rename character');
  const rename = page.getByRole('dialog', { name: 'Rename character' });
  await rename.getByLabel('Character name').fill('Vex’ahlia');
  await rename.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Vex’ahlia', { exact: true })).toBeVisible();
});

test('replace the character, then bring the old one back', async ({ page }) => {
  await createCampaign(page, { name: 'Tomb of Annihilation', character: 'Grog' });

  await openMenuItem(page, 'Replace character…');
  await expect(page.getByRole('heading', { level: 1, name: 'Replace character' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip and start with a blank sheet' }).click();
  await expect(page.getByText('Grog will be archived')).toBeVisible();
  await page.getByLabel('Character name').fill('Pike');
  await page.getByRole('button', { name: 'Replace character' }).click();
  await expect(page.getByText('Pike', { exact: true })).toBeVisible();

  await openMenuItem(page, 'Previous characters');
  await expect(page.getByRole('heading', { name: 'Previous characters' })).toBeVisible();
  const grog = page.getByRole('listitem').filter({ hasText: 'Grog' });
  await grog.getByRole('button', { name: 'Make active' }).click();

  await expect(page.getByText('Grog', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Pike' })).toBeVisible();

  // Delete the archived character.
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Pike' })
    .getByRole('button', { name: 'Delete' })
    .click();
  await page
    .getByRole('dialog', { name: 'Delete Pike?' })
    .getByRole('button', { name: 'Delete character' })
    .click();
  await expect(page.getByText('No previous characters.')).toBeVisible();
});

test('copy a character into a new campaign', async ({ page }) => {
  await createCampaign(page, { name: 'Lost Mine', character: 'Scanlan' });

  await openMenuItem(page, 'Copy character to new campaign');
  await expect(page.getByRole('radio', { name: /Copy a character/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(page.getByRole('radio', { name: /Scanlan/ })).toBeChecked();
  await page.getByLabel('Campaign name').fill('Storm King’s Thunder');
  await page.getByRole('button', { name: 'Create campaign' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Storm King’s Thunder' })).toBeVisible();
  await expect(page.getByText('Scanlan', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Back to campaigns' }).click();
  await expect(page.getByRole('link', { name: /Lost Mine.*Scanlan/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Storm King’s Thunder.*Scanlan/ })).toBeVisible();
});

test('archive, unarchive and delete a campaign', async ({ page }) => {
  await createCampaign(page, { name: 'Keep', character: 'Keeper' });
  await createCampaign(page, { name: 'Out of the Abyss', character: 'Percy' });

  await openMenuItem(page, 'Archive campaign');
  await expect(page.getByText('This campaign is archived.')).toBeVisible();
  await page.getByRole('link', { name: 'Back to campaigns' }).click();
  await page.getByText('Archived campaigns (1)').click();
  await expect(page.getByRole('link', { name: /Out of the Abyss/ })).toBeVisible();

  await page.getByRole('link', { name: /Out of the Abyss/ }).click();
  await page.getByRole('button', { name: 'Unarchive' }).click();
  await expect(page.getByText('This campaign is archived.')).toBeHidden();

  await openMenuItem(page, 'Delete campaign…');
  const del = page.getByRole('dialog', { name: 'Delete “Out of the Abyss”?' });
  await expect(del).toContainText('1 character and 0 session notes');
  await del.getByRole('button', { name: 'Delete campaign' }).click();

  await expect(page.getByRole('heading', { level: 2, name: 'Campaigns' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Out of the Abyss/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Keep/ })).toBeVisible();
});

test('relaunching the app reopens the last campaign', async ({ page, context }) => {
  await createCampaign(page, { name: 'Rime of the Frostmaiden', character: 'Keyleth' });

  // A new tab has fresh sessionStorage, like relaunching the installed app.
  const relaunched = await context.newPage();
  await relaunched.goto('./');
  await expect(
    relaunched.getByRole('heading', { level: 1, name: 'Rime of the Frostmaiden' }),
  ).toBeVisible();

  // Going back to the list in the same session doesn't bounce you back in.
  await relaunched.getByRole('link', { name: 'Back to campaigns' }).click();
  await expect(relaunched.getByRole('heading', { level: 2, name: 'Campaigns' })).toBeVisible();
});

test('unknown pages show not found', async ({ page }) => {
  await page.goto('./nope');
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await page.goto('./campaign/does-not-exist');
  await expect(page.getByRole('heading', { level: 1, name: 'Campaign not found' })).toBeVisible();
});
