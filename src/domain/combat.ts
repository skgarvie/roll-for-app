// Pure 2024 combat operations on CoreSheetData. Each returns a new object.
import type { Attack, CoreSheetData, ExhaustionLevel } from './character';
import { MASTERY_PROPERTIES, weaponData, type Mastery } from './data/equipment';
import type { Derived } from './derive';
import { formatModifier } from './derive';

const clampInt = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.trunc(Number.isFinite(n) ? n : 0)));

/** Damage hits temporary HP first. Damage while already at 0 HP is a failed death save. */
export function applyDamage(data: CoreSheetData, amount: number, hpMax: number): CoreSheetData {
  const dmg = clampInt(amount, 0, Number.MAX_SAFE_INTEGER);
  if (dmg === 0) return data;
  const wasAtZero = hpMax - data.hp.damage <= 0;
  const absorbed = Math.min(data.hp.temp, dmg);
  const rest = dmg - absorbed;
  const next: CoreSheetData = {
    ...data,
    hp: { temp: data.hp.temp - absorbed, damage: Math.min(hpMax, data.hp.damage + rest) },
  };
  if (wasAtZero && rest > 0) {
    next.deathSaves = {
      ...data.deathSaves,
      failures: Math.min(3, data.deathSaves.failures + 1),
    };
  }
  return next;
}

/** Healing can't exceed the maximum. Regaining any HP from 0 resets death saves. */
export function applyHealing(data: CoreSheetData, amount: number, hpMax: number): CoreSheetData {
  const heal = clampInt(amount, 0, Number.MAX_SAFE_INTEGER);
  if (heal === 0) return data;
  const damage = Math.max(0, Math.min(hpMax, data.hp.damage) - heal);
  const wasAtZero = hpMax - data.hp.damage <= 0;
  return {
    ...data,
    hp: { ...data.hp, damage },
    deathSaves: wasAtZero ? { successes: 0, failures: 0 } : data.deathSaves,
  };
}

/** Temporary HP don't stack: the new amount replaces the old. */
export function setTempHp(data: CoreSheetData, amount: number): CoreSheetData {
  return { ...data, hp: { ...data.hp, temp: clampInt(amount, 0, Number.MAX_SAFE_INTEGER) } };
}

/** Sets current HP directly (stored as damage taken). */
export function setCurrentHp(data: CoreSheetData, current: number, hpMax: number): CoreSheetData {
  return { ...data, hp: { ...data.hp, damage: hpMax - clampInt(current, 0, hpMax) } };
}

export function setExhaustion(data: CoreSheetData, level: number): CoreSheetData {
  return { ...data, exhaustion: clampInt(level, 0, 6) as ExhaustionLevel };
}

/**
 * Spends one hit die during a Short Rest. `rolled` is the number the player
 * rolled on the die (the app has no dice roller); CON modifier is added.
 */
export function spendHitDie(
  data: CoreSheetData,
  derived: Derived,
  die: number,
  rolled: number,
): CoreSheetData {
  const pool = derived.hitDice.find((p) => p.die === die);
  if (!pool || pool.spent >= pool.total) return data;
  const roll = clampInt(rolled, 1, die);
  const spent = { ...data.hitDiceSpent, [String(die)]: pool.spent + 1 };
  return applyHealing(
    { ...data, hitDiceSpent: spent },
    Math.max(0, roll + derived.mods.con),
    derived.hpMax.value,
  );
}

/**
 * 2024 Long Rest: regain all HP and all spent Hit Dice, lose temporary HP,
 * reduce Exhaustion by 1, and reset death saves.
 */
export function longRest(data: CoreSheetData): CoreSheetData {
  return {
    ...data,
    hp: { damage: 0, temp: 0 },
    hitDiceSpent: {},
    exhaustion: Math.max(0, data.exhaustion - 1) as ExhaustionLevel,
    deathSaves: { successes: 0, failures: 0 },
  };
}

export interface AttackStats {
  toHit: number;
  /** e.g. "1d8 + 3 Slashing". */
  damage: string;
  mastery?: { name: Mastery; description: string; known: boolean };
}

export function attackStats(data: CoreSheetData, derived: Derived, attack: Attack): AttackStats {
  const mod =
    attack.ability === 'finesse'
      ? Math.max(derived.mods.str, derived.mods.dex)
      : derived.mods[attack.ability];
  const prof = attack.proficient ? derived.proficiencyBonus.value : 0;
  const toHit = mod + prof + attack.bonus - derived.exhaustion.d20Penalty;
  const flat = mod + attack.bonus;
  const dice = attack.damage.trim();
  let damage = dice
    ? flat === 0
      ? dice
      : `${dice} ${formatModifier(flat).replace(/^([+−])/, '$1 ')}`
    : '';
  if (attack.damageType) damage = `${damage} ${attack.damageType}`.trim();

  const weapon = attack.weapon ? weaponData(attack.weapon) : undefined;
  const mastery = weapon
    ? {
        name: weapon.mastery,
        description: MASTERY_PROPERTIES[weapon.mastery],
        known: data.weaponMasteries.some((m) => m.toLowerCase() === weapon.name.toLowerCase()),
      }
    : undefined;
  return { toHit, damage, mastery };
}

/** A new attack prefilled from an SRD weapon. */
export function attackFromWeapon(id: string, weaponName: string, proficient = true): Attack {
  const weapon = weaponData(weaponName);
  if (!weapon) return { id, name: weaponName, ability: 'str', proficient, bonus: 0, damage: '' };
  return {
    id,
    name: weapon.name,
    weapon: weapon.name,
    ability: weapon.properties.includes('Finesse') ? 'finesse' : weapon.ranged ? 'dex' : 'str',
    proficient,
    bonus: 0,
    damage: weapon.damage,
    damageType: weapon.damageType,
    notes: weapon.properties.join(', ') || undefined,
  };
}
