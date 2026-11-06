// Pure 2024 rules: everything computed from CoreSheetData.
// Every derived value goes through resolve(key) = overrides[key] ?? computed.
import type { CoreSheetData, DerivedKey } from './character';
import { ABILITIES, SKILL_INFO, SKILLS, type Ability, type Skill } from './data/abilities';
import { classData, type CasterKind } from './data/classes';
import { PACT_SLOTS, SPELL_SLOTS } from './data/spellSlots';

export interface DerivedValue {
  /** What the rules give. */
  computed: number;
  /** Override if set, otherwise computed. */
  value: number;
  overridden: boolean;
  /** Exhaustion penalty already applied to `total` (0 if not affected). */
  penalty: number;
  /** Value to show and use: `value` minus the penalty. */
  total: number;
}

export interface SpellcastingInfo {
  ability: Ability;
  /** Classes casting with this ability. */
  classes: string[];
  saveDc: DerivedValue;
  attack: DerivedValue;
}

export interface HitDicePool {
  die: number;
  total: number;
  spent: number;
}

export interface Derived {
  totalLevel: number;
  proficiencyBonus: DerivedValue;
  scores: Record<Ability, DerivedValue>;
  /** Modifiers from the resolved scores. */
  mods: Record<Ability, number>;
  saves: Record<Ability, DerivedValue>;
  skills: Record<Skill, DerivedValue>;
  initiative: DerivedValue;
  ac: DerivedValue;
  speed: DerivedValue;
  hpMax: DerivedValue;
  hpCurrent: number;
  passivePerception: DerivedValue;
  passiveInsight: DerivedValue;
  passiveInvestigation: DerivedValue;
  spellcasting: SpellcastingInfo[];
  /** Slots per spell level (index 0 = 1st), excluding Pact Magic. */
  spellSlots: number[];
  pactMagic?: { slots: number; level: number };
  hitDice: HitDicePool[];
  weaponMasteryLimit: number;
  jackOfAllTrades: boolean;
  exhaustion: { d20Penalty: number; speedPenalty: number; dead: boolean };
}

export const abilityMod = (score: number): number => Math.floor((score - 10) / 2);

export const proficiencyBonusForLevel = (totalLevel: number): number =>
  2 + Math.floor((Math.max(1, totalLevel) - 1) / 4);

export const formatModifier = (n: number): string => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

export const exhaustionPenalties = (level: number) => ({
  d20Penalty: 2 * level,
  speedPenalty: 5 * level,
  dead: level >= 6,
});

/** Average HP gained per level after the first (2024: half the die + 1). */
export const averageHitDie = (die: number): number => die / 2 + 1;

export function totalLevel(data: Pick<CoreSheetData, 'classes'>): number {
  return data.classes.reduce((sum, c) => sum + Math.max(0, c.level), 0);
}

/** Ability score before overrides: base + background + adjustments, capped at 20 (or a raised cap). */
export function computeAbilityScore(data: CoreSheetData, ability: Ability): number {
  const base = data.baseAbilities[ability];
  const background = data.background.abilityIncreases[ability] ?? 0;
  const adjustments = data.abilityAdjustments.filter((a) => a.ability === ability);
  const bonus = adjustments.reduce((sum, a) => sum + a.amount, 0);
  const cap = Math.max(20, ...adjustments.map((a) => a.maxScore ?? 20));
  const total = base + background + bonus;
  // The cap limits increases; it never lowers a base score that is already higher.
  return Math.min(total, Math.max(cap, base));
}

/** HP maximum using fixed averages: max die at character level 1, then the average. */
export function computeHpMax(data: CoreSheetData, conMod: number): number {
  let hp = 0;
  let first = true;
  for (const c of data.classes) {
    for (let i = 0; i < c.level; i++) {
      const gain = (first ? c.hitDie : averageHitDie(c.hitDie)) + conMod;
      hp += Math.max(1, gain);
      first = false;
    }
  }
  return hp;
}

/** Spell slots from the (multiclass) caster table. A single class rounds partial casters up. */
export function computeSpellSlots(classes: CoreSheetData['classes']): number[] {
  const casters = classes
    .map((c) => ({ level: c.level, caster: classData(c.name)?.caster ?? 'none' }))
    .filter((c): c is { level: number; caster: Exclude<CasterKind, 'none' | 'pact'> } =>
      ['full', 'half', 'third'].includes(c.caster),
    );
  if (casters.length === 0) return [];
  const single = casters.length === 1;
  const casterLevel = casters.reduce((sum, { level, caster }) => {
    if (caster === 'full') return sum + level;
    if (caster === 'half') return sum + Math.ceil(level / 2);
    return sum + (single ? Math.ceil(level / 3) : Math.floor(level / 3));
  }, 0);
  if (casterLevel < 1) return [];
  return [...SPELL_SLOTS[Math.min(casterLevel, 20) - 1]!];
}

export function computePactMagic(
  classes: CoreSheetData['classes'],
): { slots: number; level: number } | undefined {
  const levels = classes
    .filter((c) => classData(c.name)?.caster === 'pact')
    .reduce((s, c) => s + c.level, 0);
  if (levels < 1) return undefined;
  const [slots, level] = PACT_SLOTS[Math.min(levels, 20) - 1]!;
  return { slots, level };
}

export function weaponMasteryLimit(classes: CoreSheetData['classes']): number {
  let limit = 0;
  for (const c of classes) {
    for (const [level, count] of classData(c.name)?.weaponMasteries ?? []) {
      if (c.level >= level) limit = Math.max(limit, count);
    }
  }
  return limit;
}

export function hitDicePools(data: CoreSheetData): HitDicePool[] {
  const totals = new Map<number, number>();
  for (const c of data.classes) {
    if (c.level > 0) totals.set(c.hitDie, (totals.get(c.hitDie) ?? 0) + c.level);
  }
  return [...totals.entries()]
    .sort(([a], [b]) => b - a)
    .map(([die, total]) => ({
      die,
      total,
      spent: Math.min(total, Math.max(0, data.hitDiceSpent[String(die)] ?? 0)),
    }));
}

const hasFeat = (data: CoreSheetData, name: string) =>
  data.feats.some((f) => f.name.trim().toLowerCase() === name.toLowerCase()) ||
  data.background.originFeat.trim().toLowerCase() === name.toLowerCase();

export function computeArmorClass(data: CoreSheetData, mods: Record<Ability, number>): number {
  const { armor } = data;
  const dex = mods.dex;
  const shield = armor.shield ? 2 : 0;
  let base: number;
  switch (armor.type) {
    case 'light':
      base = armor.baseAc + dex;
      break;
    case 'medium':
      base = armor.baseAc + Math.min(dex, 2);
      break;
    case 'heavy':
      base = armor.baseAc;
      break;
    default: {
      // Unarmored: 10 + DEX, or Unarmored Defense from Barbarian / Monk (Monk: no shield).
      base = 10 + dex;
      for (const c of data.classes) {
        const cd = classData(c.name);
        if (!cd?.unarmoredDefense || c.level < 1) continue;
        if (cd.name === 'Monk' && armor.shield) continue;
        base = Math.max(base, 10 + dex + cd.unarmoredDefense.reduce((s, a) => s + mods[a], 0));
      }
    }
  }
  return base + shield + armor.bonus;
}

export function deriveCharacter(data: CoreSheetData): Derived {
  const resolve = (key: DerivedKey, computed: number, penalty = 0): DerivedValue => {
    const override = data.overrides[key];
    const overridden = typeof override === 'number' && Number.isFinite(override);
    const value = overridden ? override : computed;
    return { computed, value, overridden, penalty, total: value - penalty };
  };

  const level = totalLevel(data);
  const exhaustion = exhaustionPenalties(data.exhaustion);
  const d20 = exhaustion.d20Penalty;
  const pb = resolve('proficiencyBonus', proficiencyBonusForLevel(level));
  const prof = pb.value;
  const jackOfAllTrades = data.classes.some(
    (c) => classData(c.name)?.name === 'Bard' && c.level >= 2,
  );

  const scores = {} as Record<Ability, DerivedValue>;
  const mods = {} as Record<Ability, number>;
  const saves = {} as Record<Ability, DerivedValue>;
  for (const a of ABILITIES) {
    scores[a] = resolve(`score.${a}`, computeAbilityScore(data, a));
    mods[a] = abilityMod(scores[a].value);
  }
  for (const a of ABILITIES) {
    const proficient = data.saveProficiencies.includes(a);
    saves[a] = resolve(`save.${a}`, mods[a] + (proficient ? prof : 0), d20);
  }

  const skills = {} as Record<Skill, DerivedValue>;
  for (const s of SKILLS) {
    const p = data.skills[s];
    const mult = p === 'expertise' ? 2 : p === 'proficient' ? 1 : 0;
    const joat = mult === 0 && jackOfAllTrades ? Math.floor(prof / 2) : 0;
    skills[s] = resolve(`skill.${s}`, mods[SKILL_INFO[s].ability] + mult * prof + joat, d20);
  }

  // Initiative is a DEX check: Alert adds PB, otherwise Jack of All Trades adds half.
  const initiativeBonus = hasFeat(data, 'Alert')
    ? prof
    : jackOfAllTrades
      ? Math.floor(prof / 2)
      : 0;
  const initiative = resolve('initiative', mods.dex + initiativeBonus, d20);

  const ac = resolve('ac', computeArmorClass(data, mods));
  const speedValue = resolve('speed', data.baseSpeed);
  const speed: DerivedValue = {
    ...speedValue,
    penalty: Math.min(exhaustion.speedPenalty, Math.max(0, speedValue.value)),
    total: Math.max(0, speedValue.value - exhaustion.speedPenalty),
  };
  const hpMax = resolve('hpMax', computeHpMax(data, mods.con));
  const hpCurrent = Math.max(0, hpMax.value - Math.max(0, data.hp.damage));

  const spellcasting: SpellcastingInfo[] = [];
  for (const c of data.classes) {
    const ability = classData(c.name)?.spellAbility;
    if (!ability || c.level < 1) continue;
    const existing = spellcasting.find((s) => s.ability === ability);
    if (existing) {
      existing.classes.push(c.name);
      continue;
    }
    spellcasting.push({
      ability,
      classes: [c.name],
      saveDc: resolve(`spellDc.${ability}`, 8 + mods[ability] + prof),
      attack: resolve(`spellAttack.${ability}`, mods[ability] + prof, d20),
    });
  }

  return {
    totalLevel: level,
    proficiencyBonus: pb,
    scores,
    mods,
    saves,
    skills,
    initiative,
    ac,
    speed,
    hpMax,
    hpCurrent,
    passivePerception: resolve('passivePerception', 10 + skills.perception.value),
    passiveInsight: resolve('passiveInsight', 10 + skills.insight.value),
    passiveInvestigation: resolve('passiveInvestigation', 10 + skills.investigation.value),
    spellcasting,
    spellSlots: computeSpellSlots(data.classes),
    pactMagic: computePactMagic(data.classes),
    hitDice: hitDicePools(data),
    weaponMasteryLimit: weaponMasteryLimit(data.classes),
    jackOfAllTrades,
    exhaustion,
  };
}

/** e.g. "Fighter 3 (Champion) / Wizard 1". */
export function classSummary(classes: CoreSheetData['classes']): string {
  return classes
    .filter((c) => c.name.trim())
    .map((c) => `${c.name} ${c.level}${c.subclass ? ` (${c.subclass})` : ''}`)
    .join(' / ');
}
