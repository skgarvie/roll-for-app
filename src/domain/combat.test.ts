import {
  buildCoreData,
  isStandardArray,
  isValidBackgroundIncrease,
  isValidPointBuy,
  pointBuyCost,
  type CharacterBuild,
} from './build';
import { emptyCoreData, type CoreSheetData } from './character';
import {
  applyDamage,
  applyHealing,
  attackFromWeapon,
  attackStats,
  longRest,
  setCurrentHp,
  setExhaustion,
  setTempHp,
  spendHitDie,
} from './combat';
import { deriveCharacter } from './derive';

const fighter = (): CoreSheetData => ({
  ...emptyCoreData(),
  classes: [{ name: 'Fighter', level: 3, hitDie: 10 }],
  baseAbilities: { str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 8 },
});
// HP max: 10 + 6 + 6 + 3 × 2 = 28

describe('damage and healing', () => {
  it('damage hits temporary HP first', () => {
    const data = setTempHp(fighter(), 5);
    const hit = applyDamage(data, 8, 28);
    expect(hit.hp).toEqual({ temp: 0, damage: 3 });
    expect(applyDamage(data, 4, 28).hp).toEqual({ temp: 1, damage: 0 });
  });

  it('HP never goes below 0, and damage at 0 HP is a failed death save', () => {
    const down = applyDamage(fighter(), 100, 28);
    expect(down.hp.damage).toBe(28);
    expect(down.deathSaves.failures).toBe(0);
    const again = applyDamage(down, 3, 28);
    expect(again.deathSaves.failures).toBe(1);
    expect(applyDamage(applyDamage(again, 1, 28), 1, 28).deathSaves.failures).toBe(3);
    expect(
      applyDamage(applyDamage(applyDamage(again, 1, 28), 1, 28), 1, 28).deathSaves.failures,
    ).toBe(3);
  });

  it('healing is capped at the maximum and resets death saves from 0', () => {
    const down = { ...applyDamage(fighter(), 40, 28), deathSaves: { successes: 1, failures: 2 } };
    const healed = applyHealing(down, 5, 28);
    expect(healed.hp.damage).toBe(23);
    expect(healed.deathSaves).toEqual({ successes: 0, failures: 0 });
    expect(applyHealing(healed, 1000, 28).hp.damage).toBe(0);
  });

  it('temp HP replace rather than stack, and ignore bad input', () => {
    expect(setTempHp(setTempHp(fighter(), 5), 3).hp.temp).toBe(3);
    expect(applyDamage(fighter(), -5, 28)).toEqual(fighter());
    expect(applyHealing(fighter(), Number.NaN, 28)).toEqual(fighter());
  });

  it('setCurrentHp stores damage and clamps', () => {
    expect(setCurrentHp(fighter(), 20, 28).hp.damage).toBe(8);
    expect(setCurrentHp(fighter(), 99, 28).hp.damage).toBe(0);
    expect(setCurrentHp(fighter(), -4, 28).hp.damage).toBe(28);
  });

  it('exhaustion is clamped to 0–6', () => {
    expect(setExhaustion(fighter(), 9).exhaustion).toBe(6);
    expect(setExhaustion(fighter(), -1).exhaustion).toBe(0);
  });
});

describe('rests', () => {
  it('spending a hit die heals the roll + CON and uses up the die', () => {
    let data = applyDamage(fighter(), 20, 28);
    data = spendHitDie(data, deriveCharacter(data), 10, 7);
    expect(data.hp.damage).toBe(20 - 9);
    expect(data.hitDiceSpent).toEqual({ '10': 1 });
    data = spendHitDie(data, deriveCharacter(data), 10, 1);
    data = spendHitDie(data, deriveCharacter(data), 10, 1);
    const allSpent = spendHitDie(data, deriveCharacter(data), 10, 10);
    expect(allSpent).toBe(data); // no dice left
    expect(spendHitDie(data, deriveCharacter(data), 6, 3)).toBe(data); // no such pool
  });

  it('long rest restores HP and hit dice, removes temp HP, lowers exhaustion by 1', () => {
    const tired: CoreSheetData = {
      ...fighter(),
      hp: { damage: 15, temp: 4 },
      hitDiceSpent: { '10': 2 },
      exhaustion: 2,
      deathSaves: { successes: 2, failures: 1 },
      heroicInspiration: true,
    };
    const rested = longRest(tired);
    expect(rested.hp).toEqual({ damage: 0, temp: 0 });
    expect(rested.hitDiceSpent).toEqual({});
    expect(rested.exhaustion).toBe(1);
    expect(rested.deathSaves).toEqual({ successes: 0, failures: 0 });
    expect(rested.heroicInspiration).toBe(true);
    expect(longRest({ ...tired, exhaustion: 0 }).exhaustion).toBe(0);
  });
});

describe('attacks', () => {
  it('to-hit and damage use the right ability, proficiency and bonus', () => {
    const data = { ...fighter(), weaponMasteries: ['Longsword'] };
    const d = deriveCharacter(data);
    const longsword = attackFromWeapon('a', 'Longsword');
    expect(longsword).toMatchObject({ ability: 'str', damage: '1d8', damageType: 'Slashing' });
    expect(attackStats(data, d, longsword)).toMatchObject({
      toHit: 5,
      damage: '1d8 + 3 Slashing',
      mastery: { name: 'Sap', known: true },
    });

    const rapier = { ...attackFromWeapon('b', 'Rapier'), bonus: 1 };
    expect(rapier.ability).toBe('finesse');
    expect(attackStats(data, d, rapier)).toMatchObject({ toHit: 6, damage: '1d8 + 4 Piercing' });
    expect(attackStats(data, d, rapier).mastery?.known).toBe(false);

    expect(attackFromWeapon('c', 'Longbow').ability).toBe('dex');
  });

  it('exhaustion lowers attack rolls; negative damage modifiers read naturally', () => {
    const data = {
      ...fighter(),
      exhaustion: 1 as const,
      baseAbilities: { ...fighter().baseAbilities, str: 8 },
    };
    const stats = attackStats(data, deriveCharacter(data), attackFromWeapon('a', 'Club'));
    expect(stats.toHit).toBe(-1 + 2 - 2);
    expect(stats.damage).toBe('1d4 − 1 Bludgeoning');
  });
});

describe('character creation', () => {
  const build: CharacterBuild = {
    class: { name: 'Fighter', level: 1, hitDie: 10 },
    background: {
      name: 'Soldier',
      abilities: ['str', 'dex', 'con'],
      abilityIncreases: { str: 2, con: 1 },
      originFeat: 'Savage Attacker',
      skills: ['athletics', 'intimidation'],
      tool: 'Dice Set',
    },
    species: { name: 'Goliath', size: 'Medium', speed: 35 },
    baseAbilities: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
    classSkills: ['perception', 'survival'],
  };

  it('builds a complete level 1 character', () => {
    const data = buildCoreData(build);
    expect(data.classes).toEqual([{ name: 'Fighter', level: 1, hitDie: 10, subclass: undefined }]);
    expect(data.saveProficiencies).toEqual(['str', 'con']);
    expect(data.skills.athletics).toBe('proficient');
    expect(data.skills.perception).toBe('proficient');
    expect(data.skills.arcana).toBe('none');
    expect(data.feats.map((f) => f.name)).toEqual(['Savage Attacker']);
    expect(data.baseSpeed).toBe(35);
    expect(data.proficiencies.tools).toBe('Dice Set');

    const d = deriveCharacter(data);
    expect(d.scores.str.total).toBe(17);
    expect(d.scores.con.total).toBe(15);
    expect(d.hpMax.total).toBe(12);
    expect(d.hpCurrent).toBe(12);
    expect(d.skills.athletics.total).toBe(5);
    expect(d.saves.con.total).toBe(4);
    expect(d.speed.total).toBe(35);
    expect(d.weaponMasteryLimit).toBe(3);
  });

  it('validates 2024 background increases', () => {
    const allowed = ['str', 'dex', 'con'] as const;
    expect(isValidBackgroundIncrease(allowed, { str: 2, dex: 1 })).toBe(true);
    expect(isValidBackgroundIncrease(allowed, { str: 1, dex: 1, con: 1 })).toBe(true);
    expect(isValidBackgroundIncrease(allowed, { str: 2 })).toBe(false);
    expect(isValidBackgroundIncrease(allowed, { str: 2, dex: 2 })).toBe(false);
    expect(isValidBackgroundIncrease(allowed, { str: 1, dex: 1 })).toBe(false);
    expect(isValidBackgroundIncrease(allowed, { str: 2, int: 1 })).toBe(false);
  });

  it('point buy and standard array', () => {
    const array = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
    expect(isStandardArray(array)).toBe(true);
    expect(isStandardArray({ ...array, cha: 9 })).toBe(false);
    expect(pointBuyCost(array)).toBe(27);
    expect(isValidPointBuy(array)).toBe(true);
    expect(isValidPointBuy({ ...array, cha: 10 })).toBe(false);
    expect(pointBuyCost({ ...array, str: 16 })).toBeUndefined();
  });
});
