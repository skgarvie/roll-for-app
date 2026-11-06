import { emptyCoreData, normalizeCoreData, type CoreSheetData } from './character';
import {
  abilityMod,
  classSummary,
  computeAbilityScore,
  computePactMagic,
  computeSpellSlots,
  deriveCharacter,
  formatModifier,
  proficiencyBonusForLevel,
  weaponMasteryLimit,
} from './derive';

function character(patch: Partial<CoreSheetData> = {}): CoreSheetData {
  return { ...emptyCoreData(), ...patch };
}

const fighter = (level: number) => ({ name: 'Fighter', level, hitDie: 10 });

describe('ability scores', () => {
  it('abilityMod follows floor((score - 10) / 2)', () => {
    expect([1, 3, 8, 9, 10, 11, 12, 15, 20, 30].map(abilityMod)).toEqual([
      -5, -4, -1, -1, 0, 0, 1, 2, 5, 10,
    ]);
  });

  it('adds background increases and adjustments to the base', () => {
    const data = character({
      baseAbilities: { str: 15, dex: 10, con: 13, int: 8, wis: 12, cha: 14 },
      background: {
        name: 'Soldier',
        abilityIncreases: { str: 2, con: 1 },
        originFeat: '',
        skillProficiencies: [],
      },
      abilityAdjustments: [{ id: 'a', source: 'ASI', ability: 'str', amount: 2 }],
    });
    expect(computeAbilityScore(data, 'str')).toBe(19);
    expect(computeAbilityScore(data, 'con')).toBe(14);
    expect(computeAbilityScore(data, 'dex')).toBe(10);
  });

  it('caps at 20 unless a source raises the cap (Epic Boon to 30)', () => {
    const data = character({
      baseAbilities: { str: 18, dex: 20, con: 10, int: 10, wis: 10, cha: 10 },
      abilityAdjustments: [
        { id: 'a', source: 'ASI', ability: 'str', amount: 4 },
        { id: 'b', source: 'Boon of Speed', ability: 'dex', amount: 1, maxScore: 30 },
      ],
    });
    expect(computeAbilityScore(data, 'str')).toBe(20);
    expect(computeAbilityScore(data, 'dex')).toBe(21);
  });

  it('overriding a score flows into modifiers, saves and skills', () => {
    const d = deriveCharacter(
      character({
        classes: [fighter(1)],
        saveProficiencies: ['str'],
        overrides: { 'score.str': 21 },
      }),
    );
    expect(d.scores.str).toMatchObject({ computed: 10, value: 21, overridden: true });
    expect(d.mods.str).toBe(5);
    expect(d.saves.str.total).toBe(7);
    expect(d.skills.athletics.total).toBe(5);
  });
});

describe('proficiency', () => {
  it('proficiency bonus by total level', () => {
    expect([1, 4, 5, 8, 9, 12, 13, 16, 17, 20].map(proficiencyBonusForLevel)).toEqual([
      2, 2, 3, 3, 4, 4, 5, 5, 6, 6,
    ]);
  });

  it('uses total level across classes', () => {
    const d = deriveCharacter(
      character({ classes: [fighter(3), { name: 'Wizard', level: 2, hitDie: 6 }] }),
    );
    expect(d.totalLevel).toBe(5);
    expect(d.proficiencyBonus.total).toBe(3);
  });

  it('skills add 0×, 1× or 2× proficiency', () => {
    const data = character({
      classes: [fighter(5)],
      baseAbilities: { str: 10, dex: 16, con: 10, int: 10, wis: 10, cha: 10 },
    });
    data.skills.stealth = 'proficient';
    data.skills.acrobatics = 'expertise';
    const d = deriveCharacter(data);
    expect(d.skills.sleightOfHand.total).toBe(3);
    expect(d.skills.stealth.total).toBe(6);
    expect(d.skills.acrobatics.total).toBe(9);
  });

  it('Jack of All Trades (Bard 2+) adds half proficiency to non-proficient checks', () => {
    const data = character({ classes: [{ name: 'Bard', level: 5, hitDie: 8 }] });
    data.skills.performance = 'proficient';
    const d = deriveCharacter(data);
    expect(d.jackOfAllTrades).toBe(true);
    expect(d.skills.arcana.total).toBe(1); // floor(3 / 2)
    expect(d.skills.performance.total).toBe(3);
    expect(d.initiative.total).toBe(1);
    expect(
      deriveCharacter(character({ classes: [{ name: 'Bard', level: 1, hitDie: 8 }] }))
        .jackOfAllTrades,
    ).toBe(false);
  });

  it('saves use the save proficiencies', () => {
    const d = deriveCharacter(
      character({
        classes: [fighter(1)],
        saveProficiencies: ['str', 'con'],
        baseAbilities: { str: 16, dex: 10, con: 14, int: 10, wis: 8, cha: 10 },
      }),
    );
    expect(d.saves.str.total).toBe(5);
    expect(d.saves.con.total).toBe(4);
    expect(d.saves.wis.total).toBe(-1);
  });
});

describe('exhaustion (2024)', () => {
  it('each level is −2 to d20 tests and −5 ft speed; level 6 is death', () => {
    const data = character({
      classes: [fighter(1)],
      exhaustion: 2,
      baseAbilities: { str: 14, dex: 14, con: 10, int: 10, wis: 12, cha: 10 },
    });
    data.skills.perception = 'proficient';
    const d = deriveCharacter(data);
    expect(d.skills.perception.total).toBe(3 - 4);
    expect(d.skills.perception.penalty).toBe(4);
    expect(d.saves.dex.total).toBe(-2);
    expect(d.initiative.total).toBe(-2);
    expect(d.speed.total).toBe(20);
    expect(d.speed.penalty).toBe(10);
    // Passive scores and AC are not d20 tests.
    expect(d.passivePerception.total).toBe(13);
    expect(d.ac.total).toBe(12);
    expect(d.exhaustion.dead).toBe(false);
    expect(deriveCharacter(character({ exhaustion: 6 })).exhaustion.dead).toBe(true);
  });

  it('speed never goes below 0', () => {
    const d = deriveCharacter(character({ exhaustion: 5, baseSpeed: 20 }));
    expect(d.speed.total).toBe(0);
  });

  it('the exhaustion penalty still applies on top of an override', () => {
    const d = deriveCharacter(character({ exhaustion: 1, overrides: { 'skill.stealth': 10 } }));
    expect(d.skills.stealth).toMatchObject({ value: 10, penalty: 2, total: 8 });
  });
});

describe('derived combat values', () => {
  it('HP max: max hit die at level 1, then the average, plus CON each level', () => {
    const d = deriveCharacter(
      character({
        classes: [fighter(3), { name: 'Wizard', level: 1, hitDie: 6 }],
        baseAbilities: { str: 10, dex: 10, con: 14, int: 10, wis: 10, cha: 10 },
      }),
    );
    // 10 + 6 + 6 (fighter) + 4 (wizard) + 4 × 2 CON
    expect(d.hpMax.total).toBe(34);
  });

  it('each level gives at least 1 HP', () => {
    const d = deriveCharacter(
      character({
        classes: [{ name: 'Wizard', level: 2, hitDie: 6 }],
        baseAbilities: { str: 10, dex: 10, con: 1, int: 10, wis: 10, cha: 10 },
      }),
    );
    expect(d.hpMax.total).toBe(2);
  });

  it('current HP is max minus damage', () => {
    const d = deriveCharacter(character({ classes: [fighter(1)], hp: { damage: 4, temp: 0 } }));
    expect(d.hpCurrent).toBe(6);
  });

  it('AC by armor type', () => {
    const base = character({
      baseAbilities: { str: 10, dex: 18, con: 16, int: 10, wis: 14, cha: 10 },
    });
    const ac = (armor: Partial<CoreSheetData['armor']>, patch: Partial<CoreSheetData> = {}) =>
      deriveCharacter({ ...base, ...patch, armor: { ...base.armor, ...armor } }).ac.total;
    expect(ac({})).toBe(14);
    expect(ac({ type: 'light', baseAc: 12 })).toBe(16);
    expect(ac({ type: 'medium', baseAc: 14 })).toBe(16);
    expect(ac({ type: 'heavy', baseAc: 18, shield: true })).toBe(20);
    expect(ac({ type: 'heavy', baseAc: 16, bonus: 1 })).toBe(17);
    // Unarmored Defense
    expect(ac({ shield: true }, { classes: [{ name: 'Barbarian', level: 1, hitDie: 12 }] })).toBe(
      19,
    );
    expect(ac({}, { classes: [{ name: 'Monk', level: 1, hitDie: 8 }] })).toBe(16);
    expect(ac({ shield: true }, { classes: [{ name: 'Monk', level: 1, hitDie: 8 }] })).toBe(16);
  });

  it('initiative adds proficiency with the Alert feat', () => {
    const d = deriveCharacter(
      character({
        classes: [fighter(1)],
        baseAbilities: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
        background: {
          name: 'Criminal',
          abilityIncreases: {},
          originFeat: 'Alert',
          skillProficiencies: [],
        },
      }),
    );
    expect(d.initiative.total).toBe(4);
  });

  it('passive Perception, Insight and Investigation', () => {
    const data = character({
      classes: [fighter(1)],
      baseAbilities: { str: 10, dex: 10, con: 10, int: 12, wis: 14, cha: 10 },
    });
    data.skills.perception = 'proficient';
    const d = deriveCharacter(data);
    expect(d.passivePerception.total).toBe(14);
    expect(d.passiveInsight.total).toBe(12);
    expect(d.passiveInvestigation.total).toBe(11);
  });

  it('spell save DC and attack bonus per spellcasting ability', () => {
    const d = deriveCharacter(
      character({
        classes: [
          { name: 'Wizard', level: 4, hitDie: 6 },
          { name: 'Cleric', level: 1, hitDie: 8 },
        ],
        baseAbilities: { str: 10, dex: 10, con: 10, int: 18, wis: 14, cha: 10 },
        exhaustion: 1,
      }),
    );
    expect(d.spellcasting.map((s) => s.ability)).toEqual(['int', 'wis']);
    expect(d.spellcasting[0]!.saveDc.total).toBe(15);
    expect(d.spellcasting[0]!.attack.total).toBe(7 - 2);
    expect(d.spellcasting[1]!.saveDc.total).toBe(13);
    expect(deriveCharacter(character({ classes: [fighter(5)] })).spellcasting).toEqual([]);
  });

  it('hit dice pools per die size, with spent dice', () => {
    const d = deriveCharacter(
      character({
        classes: [
          fighter(3),
          { name: 'Paladin', level: 2, hitDie: 10 },
          { name: 'Wizard', level: 1, hitDie: 6 },
        ],
        hitDiceSpent: { '10': 2, '6': 5 },
      }),
    );
    expect(d.hitDice).toEqual([
      { die: 10, total: 5, spent: 2 },
      { die: 6, total: 1, spent: 1 },
    ]);
  });
});

describe('spell slots', () => {
  it('single-class full, half and pact casters', () => {
    expect(computeSpellSlots([{ name: 'Wizard', level: 1, hitDie: 6 }])).toEqual([2]);
    expect(computeSpellSlots([{ name: 'Wizard', level: 5, hitDie: 6 }])).toEqual([4, 3, 2]);
    expect(computeSpellSlots([{ name: 'Wizard', level: 20, hitDie: 6 }])).toEqual([
      4, 3, 3, 3, 3, 2, 2, 1, 1,
    ]);
    // 2024 Paladins and Rangers cast from level 1 (half, rounded up).
    expect(computeSpellSlots([{ name: 'Paladin', level: 1, hitDie: 10 }])).toEqual([2]);
    expect(computeSpellSlots([{ name: 'Ranger', level: 5, hitDie: 10 }])).toEqual([4, 2]);
    expect(computeSpellSlots([fighter(5)])).toEqual([]);
    expect(computeSpellSlots([{ name: 'Warlock', level: 5, hitDie: 8 }])).toEqual([]);
    expect(computePactMagic([{ name: 'Warlock', level: 5, hitDie: 8 }])).toEqual({
      slots: 2,
      level: 3,
    });
    expect(computePactMagic([{ name: 'Warlock', level: 11, hitDie: 8 }])).toEqual({
      slots: 3,
      level: 5,
    });
    expect(computePactMagic([fighter(3)])).toBeUndefined();
  });

  it('multiclass caster table: full + half (rounded up)', () => {
    // Wizard 3 + Paladin 3 → caster level 3 + 2 = 5
    expect(
      computeSpellSlots([
        { name: 'Wizard', level: 3, hitDie: 6 },
        { name: 'Paladin', level: 3, hitDie: 10 },
      ]),
    ).toEqual([4, 3, 2]);
    // Pact Magic is separate from the multiclass table.
    expect(
      computeSpellSlots([
        { name: 'Sorcerer', level: 2, hitDie: 6 },
        { name: 'Warlock', level: 3, hitDie: 8 },
      ]),
    ).toEqual([3]);
  });
});

describe('misc', () => {
  it('weapon masteries known by class level', () => {
    expect(weaponMasteryLimit([fighter(1)])).toBe(3);
    expect(weaponMasteryLimit([fighter(16)])).toBe(6);
    expect(weaponMasteryLimit([{ name: 'Barbarian', level: 4, hitDie: 12 }])).toBe(3);
    expect(weaponMasteryLimit([{ name: 'Wizard', level: 20, hitDie: 6 }])).toBe(0);
    expect(weaponMasteryLimit([{ name: 'Rogue', level: 2, hitDie: 8 }, fighter(4)])).toBe(4);
  });

  it('formatModifier and classSummary', () => {
    expect(formatModifier(3)).toBe('+3');
    expect(formatModifier(0)).toBe('+0');
    expect(formatModifier(-2)).toBe('−2');
    expect(
      classSummary([
        { name: 'Fighter', level: 3, hitDie: 10, subclass: 'Champion' },
        { name: 'Wizard', level: 1, hitDie: 6 },
      ]),
    ).toBe('Fighter 3 (Champion) / Wizard 1');
  });

  it('normalizeCoreData fills missing fields (e.g. pre-M2 sheets)', () => {
    expect(normalizeCoreData({})).toEqual(emptyCoreData());
    expect(normalizeCoreData(null)).toEqual(emptyCoreData());
    const partial = normalizeCoreData({
      species: 'Elf',
      skills: { arcana: 'expertise' },
      hp: { damage: 3 },
    });
    expect(partial.species).toBe('Elf');
    expect(partial.skills.arcana).toBe('expertise');
    expect(partial.skills.stealth).toBe('none');
    expect(partial.hp).toEqual({ damage: 3, temp: 0 });
    expect(partial.attacks).toEqual([]);
  });
});
