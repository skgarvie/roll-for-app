import { ABILITIES, SKILLS, type Ability, type Size, type Skill } from './data/abilities';
import type { ArmorType, Condition } from './data/equipment';

export type Proficiency = 'none' | 'proficient' | 'expertise';
export type ExhaustionLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ClassEntry {
  name: string;
  subclass?: string;
  level: number;
  hitDie: number;
}

export interface AbilityAdjustment {
  id: string;
  source: string;
  ability: Ability;
  amount: number;
  /** Raises the score cap (e.g. 30 for an Epic Boon). Default cap is 20. */
  maxScore?: number;
}

export type FeatCategory = 'origin' | 'general' | 'fighting-style' | 'epic-boon';

export interface Feat {
  id: string;
  name: string;
  category: FeatCategory;
  notes?: string;
}

export interface Attack {
  id: string;
  name: string;
  /** SRD weapon this attack uses, for its Mastery property. */
  weapon?: string;
  /** 'finesse' uses the better of STR and DEX. */
  ability: Ability | 'finesse';
  proficient: boolean;
  /** Magic or other flat bonus to attack and damage rolls. */
  bonus: number;
  damage: string;
  damageType?: string;
  notes?: string;
}

export interface ArmorState {
  name: string;
  type: ArmorType | 'none';
  baseAc: number;
  shield: boolean;
  /** Rings, cloaks, fighting style, etc. */
  bonus: number;
}

export type DerivedKey =
  | 'proficiencyBonus'
  | 'initiative'
  | 'ac'
  | 'speed'
  | 'hpMax'
  | 'passivePerception'
  | 'passiveInsight'
  | 'passiveInvestigation'
  | `score.${Ability}`
  | `save.${Ability}`
  | `skill.${Skill}`
  | `spellDc.${Ability}`
  | `spellAttack.${Ability}`;

/**
 * Everything the 2024 rules need about a character. Stored on the character's
 * Core sheet; the Combat sheet is another view of the same data.
 */
export interface CoreSheetData {
  classes: ClassEntry[];
  species: string;
  size: Size;
  alignment: string;
  background: {
    name: string;
    /** 2024: +2/+1 or +1/+1/+1 across the background's three abilities. */
    abilityIncreases: Partial<Record<Ability, 1 | 2>>;
    originFeat: string;
    skillProficiencies: Skill[];
    toolProficiency?: string;
  };
  /** Scores before background increases and adjustments. */
  baseAbilities: Record<Ability, number>;
  abilityAdjustments: AbilityAdjustment[];
  saveProficiencies: Ability[];
  skills: Record<Skill, Proficiency>;
  /** Weapon names whose Mastery property the character can use. */
  weaponMasteries: string[];
  feats: Feat[];
  proficiencies: { armor: string; weapons: string; tools: string; languages: string };
  heroicInspiration: boolean;
  exhaustion: ExhaustionLevel;
  /** Manual override of any computed value. */
  overrides: Partial<Record<DerivedKey, number>>;

  // Combat state
  /** Walking speed before exhaustion (from species). */
  baseSpeed: number;
  /** Damage taken, so current HP follows changes to the maximum. Current = max − damage. */
  hp: { damage: number; temp: number };
  deathSaves: { successes: number; failures: number };
  /** Spent hit dice by die size ("8" → 2). */
  hitDiceSpent: Record<string, number>;
  conditions: Condition[];
  armor: ArmorState;
  attacks: Attack[];
}

export function emptyCoreData(): CoreSheetData {
  return {
    classes: [],
    species: '',
    size: 'Medium',
    alignment: '',
    background: { name: '', abilityIncreases: {}, originFeat: '', skillProficiencies: [] },
    baseAbilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    abilityAdjustments: [],
    saveProficiencies: [],
    skills: Object.fromEntries(SKILLS.map((s) => [s, 'none'])) as Record<Skill, Proficiency>,
    weaponMasteries: [],
    feats: [],
    proficiencies: { armor: '', weapons: '', tools: '', languages: 'Common' },
    heroicInspiration: false,
    exhaustion: 0,
    overrides: {},
    baseSpeed: 30,
    hp: { damage: 0, temp: 0 },
    deathSaves: { successes: 0, failures: 0 },
    hitDiceSpent: {},
    conditions: [],
    armor: { name: '', type: 'none', baseAc: 10, shield: false, bonus: 0 },
    attacks: [],
  };
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Fills in defaults for missing fields so older or partial rows (e.g. sheets
 * created before M2 with `data: {}`) are always safe to read.
 */
export function normalizeCoreData(raw: unknown): CoreSheetData {
  const base = emptyCoreData();
  if (!isObject(raw)) return base;
  const data = { ...base, ...raw } as CoreSheetData;
  // Experience points were dropped from the sheet.
  delete (data as unknown as Record<string, unknown>).xp;
  const r = raw as Partial<CoreSheetData>;
  data.background = { ...base.background, ...(isObject(r.background) ? r.background : {}) };
  data.baseAbilities = {
    ...base.baseAbilities,
    ...(isObject(r.baseAbilities) ? r.baseAbilities : {}),
  };
  data.skills = { ...base.skills, ...(isObject(r.skills) ? r.skills : {}) };
  data.proficiencies = {
    ...base.proficiencies,
    ...(isObject(r.proficiencies) ? r.proficiencies : {}),
  };
  data.hp = { ...base.hp, ...(isObject(r.hp) ? r.hp : {}) };
  data.deathSaves = { ...base.deathSaves, ...(isObject(r.deathSaves) ? r.deathSaves : {}) };
  data.armor = { ...base.armor, ...(isObject(r.armor) ? r.armor : {}) };
  for (const key of [
    'classes',
    'abilityAdjustments',
    'saveProficiencies',
    'weaponMasteries',
    'feats',
    'conditions',
    'attacks',
  ] as const) {
    if (!Array.isArray(data[key])) (data as unknown as Record<string, unknown>)[key] = base[key];
  }
  for (const key of ['overrides', 'hitDiceSpent'] as const) {
    if (!isObject(data[key])) (data as unknown as Record<string, unknown>)[key] = {};
  }
  data.saveProficiencies = data.saveProficiencies.filter((a) => ABILITIES.includes(a));
  return data;
}
