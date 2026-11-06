import { deriveCharacter } from '@/domain/derive';
import {
  backgroundIncreases,
  baseScores,
  classSkillOptions,
  CUSTOM,
  initialWizardState,
  isStepValid,
  wizardCoreData,
  type WizardState,
} from './wizardState';

const fighterSoldier = (): WizardState => ({
  ...initialWizardState(),
  classKey: 'Fighter',
  backgroundKey: 'Soldier',
  plusTwo: 'str',
  plusOne: 'con',
  originFeat: 'Savage Attacker',
  speciesKey: 'Human',
  size: 'Medium',
  speed: 30,
  standard: { str: 15, dex: 14, con: 13, int: 8, wis: 12, cha: 10 },
  classSkills: ['perception', 'acrobatics'],
  name: 'Brienne',
});

describe('wizard state', () => {
  it('validates each step', () => {
    const empty = initialWizardState();
    expect(isStepValid('class', empty)).toBe(false);
    expect(isStepValid('background', empty)).toBe(false);
    expect(isStepValid('abilities', empty)).toBe(false);
    expect(isStepValid('details', empty)).toBe(false);

    const s = fighterSoldier();
    for (const step of [
      'class',
      'background',
      'species',
      'abilities',
      'skills',
      'details',
    ] as const) {
      expect(isStepValid(step, s), step).toBe(true);
    }
  });

  it('background increases: +2/+1 or +1 to all three', () => {
    const s = fighterSoldier();
    expect(backgroundIncreases(s)).toEqual({ str: 2, con: 1 });
    expect(backgroundIncreases({ ...s, increaseMode: 'three-ones' })).toEqual({
      str: 1,
      dex: 1,
      con: 1,
    });
    expect(isStepValid('background', { ...s, plusOne: undefined })).toBe(false);
  });

  it('custom background needs three abilities and two skills', () => {
    const s: WizardState = {
      ...fighterSoldier(),
      backgroundKey: CUSTOM,
      customBackgroundName: 'Guard',
      customBackgroundAbilities: ['str', 'wis'],
      customBackgroundSkills: ['perception', 'insight'],
      plusTwo: 'str',
      plusOne: 'wis',
    };
    expect(isStepValid('background', s)).toBe(false);
    expect(
      isStepValid('background', { ...s, customBackgroundAbilities: ['str', 'int', 'wis'] }),
    ).toBe(true);
  });

  it('ability score methods', () => {
    const s = fighterSoldier();
    expect(baseScores(s)).toEqual(s.standard);
    expect(baseScores({ ...s, standard: { ...s.standard, cha: 15 } })).toBeUndefined();
    expect(baseScores({ ...s, method: 'pointBuy' })).toEqual({
      str: 8,
      dex: 8,
      con: 8,
      int: 8,
      wis: 8,
      cha: 8,
    });
    expect(
      baseScores({
        ...s,
        method: 'pointBuy',
        pointBuy: { str: 15, dex: 15, con: 15, int: 9, wis: 8, cha: 8 },
      }),
    ).toBeUndefined();
    expect(baseScores({ ...s, method: 'manual', manual: { str: 18 } })).toBeUndefined();
  });

  it('class skills exclude the background skills and need the exact count', () => {
    const s = fighterSoldier();
    const { count, from } = classSkillOptions(s);
    expect(count).toBe(2);
    expect(from).not.toContain('athletics'); // from Soldier
    expect(isStepValid('skills', { ...s, classSkills: ['perception'] })).toBe(false);
    // A homebrew class has no fixed count.
    expect(
      isStepValid('skills', { ...s, classKey: CUSTOM, customClassName: 'Witch', classSkills: [] }),
    ).toBe(true);
  });

  it('produces core data that derives the expected values', () => {
    const core = wizardCoreData({ ...fighterSoldier(), level: 3, subclass: 'Champion' })!;
    expect(core.classes).toEqual([{ name: 'Fighter', level: 3, hitDie: 10, subclass: 'Champion' }]);
    const d = deriveCharacter(core);
    expect(d.scores.str.total).toBe(17);
    expect(d.scores.con.total).toBe(14);
    expect(d.hpMax.total).toBe(10 + 6 + 6 + 3 * 2);
    expect(d.skills.athletics.total).toBe(5);
    expect(d.skills.acrobatics.total).toBe(4);
    // Subclass is dropped below level 3.
    expect(
      wizardCoreData({ ...fighterSoldier(), subclass: 'Champion' })!.classes[0]!.subclass,
    ).toBeUndefined();
  });
});
