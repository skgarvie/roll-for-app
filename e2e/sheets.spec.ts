import { expect, test, type Page } from '@playwright/test';

// These tests walk through the whole character wizard before testing the sheet,
// so they take about a minute on slow CI machines (~15 s on a Mac).
test.describe.configure({ timeout: 120_000 });

/** Creates a level 1 Goliath Fighter (Soldier) through the full 2024 wizard. */
async function createFighter(page: Page) {
  await page.goto('./campaigns/new');
  await page.getByLabel('Campaign name').fill('Phandelver');
  await page.getByRole('button', { name: 'Next: character' }).click();

  // Class
  await page.getByRole('radio', { name: /^Fighter/ }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  // Background: Soldier, +2 STR / +1 CON
  await page.getByRole('radio', { name: /^Soldier/ }).click();
  await page.getByRole('button', { name: '+2 to Strength' }).click();
  await page.getByRole('button', { name: '+1 to Constitution' }).click();
  await expect(page.getByLabel('Origin feat')).toHaveValue('Savage Attacker');
  await page.getByRole('button', { name: 'Next' }).click();

  // Species
  await page.getByRole('radio', { name: /^Goliath/ }).click();
  await expect(page.getByLabel('Speed (ft)')).toHaveValue('35');
  await page.getByRole('button', { name: 'Next' }).click();

  // Ability scores: standard array
  const scores = {
    Strength: 15,
    Dexterity: 14,
    Constitution: 13,
    Intelligence: 8,
    Wisdom: 12,
    Charisma: 10,
  };
  const next = page.getByRole('button', { name: 'Next' });
  for (const [ability, score] of Object.entries(scores)) {
    await expect(next).toBeDisabled();
    await page.getByLabel(`${ability} score`).selectOption(String(score));
  }
  await expect(page.getByTestId('wizard-score-str')).toHaveText('17');
  await expect(page.getByTestId('wizard-score-con')).toHaveText('14');
  await next.click();

  // Skills: Athletics comes from Soldier, so it isn't offered again.
  await expect(page.getByRole('button', { name: 'Athletics' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Perception' }).click();
  await page.getByRole('button', { name: 'Survival' }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  // Name
  await page.getByLabel('Character name').fill('Grog');
  await expect(page.getByText('Hit points').locator('..')).toContainText('12');
  await page.getByRole('button', { name: 'Create campaign' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Phandelver' })).toBeVisible();
}

const saved = (page: Page) =>
  expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();

test('wizard → Core sheet: derived values, edits, undo and overrides persist', async ({ page }) => {
  await createFighter(page);
  await expect(page.getByRole('heading', { level: 2, name: 'Core' })).toBeVisible();
  await expect(page.getByText('Fighter 1 · Goliath · Soldier')).toBeVisible();

  await expect(page.getByTestId('score-str')).toHaveText('17');
  await expect(page.getByTestId('mod-str')).toHaveText('+3');
  await expect(page.getByTestId('stat-proficiencyBonus')).toHaveText('+2');
  await expect(page.getByTestId('stat-skill.athletics')).toHaveText('+5');
  await expect(page.getByTestId('stat-skill.perception')).toHaveText('+3');
  await expect(page.getByTestId('stat-save.str')).toHaveText('+5');
  await expect(page.getByTestId('stat-passivePerception')).toHaveText('13');

  // Raise base STR: 18 → +4 everywhere it's used.
  await page.getByRole('button', { name: /^Strength 17/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Strength' });
  await dialog.getByRole('button', { name: 'Increase Strength base score' }).click();
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByTestId('score-str')).toHaveText('18');
  await expect(page.getByTestId('stat-skill.athletics')).toHaveText('+6');

  // Undo it.
  await page.getByRole('button', { name: 'Undo last change' }).click();
  await expect(page.getByTestId('score-str')).toHaveText('17');

  // Tap a skill to cycle proficiency: Stealth → proficient → expertise.
  const stealth = page.getByRole('button', { name: /^Stealth: not proficient/ });
  await stealth.click();
  await page.getByRole('button', { name: /^Stealth: proficient/ }).click();
  await expect(page.getByTestId('stat-skill.stealth')).toHaveText('+6');

  // Override Athletics.
  await page.getByRole('button', { name: /^Athletics \+5\. Edit/ }).click();
  const override = page.getByRole('dialog', { name: 'Athletics' });
  await override.getByLabel('Override').fill('10');
  await override.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByTestId('stat-skill.athletics')).toHaveText('+10');

  await saved(page);
  await page.reload();
  await expect(page.getByTestId('stat-skill.athletics')).toHaveText('+10');
  await expect(page.getByTestId('stat-skill.stealth')).toHaveText('+6');
  await expect(page.getByTestId('score-str')).toHaveText('17');

  // Clear the override.
  await page.getByRole('button', { name: /^Athletics \+10 \(overridden\)/ }).click();
  await page
    .getByRole('dialog', { name: 'Athletics' })
    .getByRole('button', { name: 'Use calculated' })
    .click();
  await expect(page.getByTestId('stat-skill.athletics')).toHaveText('+5');

  // The campaign card shows class and level.
  await saved(page);
  await page.getByRole('link', { name: 'Back to campaigns' }).click();
  await expect(page.getByRole('link', { name: /Phandelver.*Grog.*Fighter 1/ })).toBeVisible();
});

test('Combat sheet: damage, healing, conditions, exhaustion and rests', async ({ page }) => {
  await createFighter(page);
  await page
    .getByRole('navigation', { name: 'Sheets' })
    .getByRole('link', { name: 'Combat' })
    .click();
  await expect(page.getByRole('heading', { level: 2, name: 'Combat' })).toBeVisible();

  const current = page.getByTestId('hp-current');
  const amount = page.getByLabel('Amount', { exact: true });
  await expect(current).toHaveText('12');
  await expect(page.getByTestId('stat-ac')).toHaveText('12');
  await expect(page.getByTestId('stat-speed')).toHaveText('35 ft');
  await expect(page.getByTestId('stat-initiative')).toHaveText('+2');

  await amount.fill('5');
  await page.getByRole('button', { name: 'Damage' }).click();
  await expect(current).toHaveText('7');

  await amount.fill('3');
  await page.getByRole('button', { name: 'Set temp HP' }).click();
  await expect(page.getByTestId('hp-temp')).toHaveText('+3');
  await amount.fill('4');
  await page.getByRole('button', { name: 'Damage' }).click();
  await expect(page.getByTestId('hp-temp')).toHaveText('0');
  await expect(current).toHaveText('6');

  await amount.fill('20');
  await page.getByRole('button', { name: 'Heal' }).click();
  await expect(current).toHaveText('12');

  // Armor and shield.
  await page.getByLabel('Armor worn').selectOption('Chain Mail');
  await page.getByRole('button', { name: 'Shield (+2)' }).click();
  await expect(page.getByTestId('stat-ac')).toHaveText('18');

  // An attack with weapon mastery.
  await page.getByLabel('Add attack').selectOption('Greatsword');
  await expect(page.getByLabel('Greatsword to hit +5')).toBeVisible();
  await expect(page.getByText('2d6 + 3 Slashing')).toBeVisible();
  await expect(page.getByText('Mastery: Graze (not mastered)')).toBeVisible();

  // Conditions and exhaustion.
  const poisoned = page.getByRole('button', { name: 'Poisoned' });
  await poisoned.click();
  await expect(poisoned).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Increase Exhaustion level' }).click();
  await page.getByRole('button', { name: 'Increase Exhaustion level' }).click();
  await expect(page.getByText('−4 to d20 tests, −10 ft speed')).toBeVisible();
  await expect(page.getByTestId('stat-speed')).toHaveText('25 ft');
  await expect(page.getByTestId('stat-initiative')).toHaveText('−2');
  await expect(page.getByLabel('Greatsword to hit +1')).toBeVisible();

  // Drop to 0: death saves appear, damage at 0 is a failure.
  await amount.fill('50');
  await page.getByRole('button', { name: 'Damage' }).click();
  await expect(current).toHaveText('0');
  await expect(page.getByTestId('death-status')).toHaveText('Dying');
  await amount.fill('1');
  await page.getByRole('button', { name: 'Damage' }).click();
  await expect(page.getByRole('button', { name: 'Failure 1' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // Short rest: spend a hit die (rolled 6 + CON 2).
  await page.getByRole('button', { name: 'Short rest' }).click();
  const shortRest = page.getByRole('dialog', { name: 'Short rest' });
  await shortRest.getByLabel('d10 roll').fill('6');
  await shortRest.getByRole('button', { name: 'Spend d10' }).click();
  await expect(shortRest.getByTestId('short-rest-hp')).toHaveText('8');
  await shortRest.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByTestId('hit-dice-d10')).toContainText('0 / 1 d10');

  // Long rest: full HP, hit dice back, exhaustion −1.
  await page.getByRole('button', { name: 'Long rest' }).click();
  await page
    .getByRole('dialog', { name: 'Long rest' })
    .getByRole('button', { name: 'Take long rest' })
    .click();
  await expect(current).toHaveText('12');
  await expect(page.getByTestId('hit-dice-d10')).toContainText('1 / 1 d10');
  await expect(page.getByTestId('stat-speed')).toHaveText('30 ft');

  // Heroic Inspiration, then everything survives a reload.
  await page.getByRole('button', { name: 'Heroic Inspiration' }).click();
  await saved(page);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Poisoned' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Heroic Inspiration' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('stat-ac')).toHaveText('18');
  await expect(page.getByText('−2 to d20 tests, −5 ft speed')).toBeVisible();

  // Combat edits show up on the Core sheet (same data).
  await page
    .getByRole('navigation', { name: 'Sheets' })
    .getByRole('link', { name: 'Core' })
    .click();
  await expect(page.getByTestId('stat-skill.athletics')).toHaveText('+3'); // +5 − 2 exhaustion
});

test('wizard: subclass at level 3 and point buy', async ({ page }) => {
  await page.goto('./campaigns/new');
  await page.getByLabel('Campaign name').fill('Saltmarsh');
  await page.getByRole('button', { name: 'Next: character' }).click();

  await page.getByRole('radio', { name: /^Wizard/ }).click();
  await expect(page.getByLabel('Subclass')).toHaveCount(0);
  await page.getByRole('button', { name: 'Increase Level' }).click();
  await page.getByRole('button', { name: 'Increase Level' }).click();
  await page.getByLabel('Subclass').fill('Evoker');
  await page.getByRole('button', { name: 'Next' }).click();

  await page.getByRole('radio', { name: /^Sage/ }).click();
  await page.getByRole('radio', { name: /^\+1 to all three/ }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('radio', { name: /^Elf/ }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  await page.getByRole('radio', { name: /^Point buy/ }).click();
  for (let i = 0; i < 7; i++) {
    await page.getByRole('button', { name: 'Increase Intelligence score' }).click();
  }
  await expect(page.getByRole('status').filter({ hasText: 'Points spent: 9 / 27' })).toBeVisible();
  await expect(page.getByTestId('wizard-score-int')).toHaveText('16');
  await page.getByRole('button', { name: 'Next' }).click();

  await page.getByRole('button', { name: 'Investigation' }).click();
  await page.getByRole('button', { name: 'Medicine' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Character name').fill('Elara');
  await page.getByRole('button', { name: 'Create campaign' }).click();

  await expect(page.getByText('Wizard 3 (Evoker) · Elf · Sage')).toBeVisible();
  await expect(page.getByTestId('stat-spellDc.int')).toHaveText('13');
  await expect(page.getByTestId('stat-spellAttack.int')).toHaveText('+5');
});
