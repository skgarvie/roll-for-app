import {
  buildCoreData,
  isStandardArray,
  isValidBackgroundIncrease,
  isValidPointBuy,
  type CharacterBuild,
} from '@/domain/build';
import type { CoreSheetData } from '@/domain/character';
import { ABILITIES, SKILLS, type Ability, type Size, type Skill } from '@/domain/data/abilities';
import { classData } from '@/domain/data/classes';
import { backgroundData, speciesData } from '@/domain/data/origins';

export const STEPS = ['class', 'background', 'species', 'abilities', 'skills', 'details'] as const;
export type Step = (typeof STEPS)[number];

export const STEP_TITLES: Record<Step, string> = {
  class: 'Class',
  background: 'Background',
  species: 'Species',
  abilities: 'Ability scores',
  skills: 'Skills',
  details: 'Name & details',
};

export const CUSTOM = 'custom';

export type ScoreMethod = 'standard' | 'pointBuy' | 'manual';

export interface WizardState {
  /** SRD class name, or CUSTOM. */
  classKey: string;
  customClassName: string;
  customHitDie: number;
  level: number;
  subclass: string;

  /** SRD background name, or CUSTOM. */
  backgroundKey: string;
  customBackgroundName: string;
  customBackgroundAbilities: Ability[];
  customBackgroundSkills: Skill[];
  increaseMode: 'two-one' | 'three-ones';
  plusTwo?: Ability;
  plusOne?: Ability;
  originFeat: string;
  tool: string;

  /** SRD species name, or CUSTOM. */
  speciesKey: string;
  customSpeciesName: string;
  size: Size;
  speed: number;

  method: ScoreMethod;
  standard: Partial<Record<Ability, number>>;
  pointBuy: Record<Ability, number>;
  manual: Partial<Record<Ability, number>>;

  classSkills: Skill[];
  name: string;
  alignment: string;
}

const eight = () => Object.fromEntries(ABILITIES.map((a) => [a, 8])) as Record<Ability, number>;

export function initialWizardState(): WizardState {
  return {
    classKey: '',
    customClassName: '',
    customHitDie: 8,
    level: 1,
    subclass: '',
    backgroundKey: '',
    customBackgroundName: '',
    customBackgroundAbilities: [],
    customBackgroundSkills: [],
    increaseMode: 'two-one',
    originFeat: '',
    tool: '',
    speciesKey: '',
    customSpeciesName: '',
    size: 'Medium',
    speed: 30,
    method: 'standard',
    standard: {},
    pointBuy: eight(),
    manual: {},
    classSkills: [],
    name: '',
    alignment: '',
  };
}

export function selectedClass(s: WizardState) {
  if (s.classKey === CUSTOM) {
    return { name: s.customClassName.trim(), hitDie: s.customHitDie, data: undefined };
  }
  const data = classData(s.classKey);
  return data ? { name: data.name, hitDie: data.hitDie, data } : undefined;
}

export function selectedBackground(s: WizardState) {
  if (s.backgroundKey === CUSTOM) {
    return {
      name: s.customBackgroundName.trim(),
      abilities: s.customBackgroundAbilities,
      skills: s.customBackgroundSkills,
    };
  }
  const data = backgroundData(s.backgroundKey);
  return data ? { name: data.name, abilities: data.abilities, skills: data.skills } : undefined;
}

export function selectedSpecies(s: WizardState) {
  if (s.speciesKey === CUSTOM) return { name: s.customSpeciesName.trim(), sizes: undefined };
  const data = speciesData(s.speciesKey);
  return data ? { name: data.name, sizes: data.sizes } : undefined;
}

export function backgroundIncreases(s: WizardState): Partial<Record<Ability, 1 | 2>> {
  const bg = selectedBackground(s);
  if (!bg) return {};
  if (s.increaseMode === 'three-ones') {
    return Object.fromEntries(bg.abilities.map((a) => [a, 1]));
  }
  const out: Partial<Record<Ability, 1 | 2>> = {};
  if (s.plusTwo) out[s.plusTwo] = 2;
  if (s.plusOne && s.plusOne !== s.plusTwo) out[s.plusOne] = 1;
  return out;
}

/** Base scores from the chosen method, or undefined if incomplete or invalid. */
export function baseScores(s: WizardState): Record<Ability, number> | undefined {
  if (s.method === 'pointBuy') return isValidPointBuy(s.pointBuy) ? s.pointBuy : undefined;
  const source = s.method === 'standard' ? s.standard : s.manual;
  if (ABILITIES.some((a) => source[a] === undefined)) return undefined;
  const scores = source as Record<Ability, number>;
  if (s.method === 'standard') return isStandardArray(scores) ? scores : undefined;
  return ABILITIES.every((a) => scores[a] >= 1 && scores[a] <= 20) ? scores : undefined;
}

/** Skills the class lets you choose (minus ones the background already gives) and how many. */
export function classSkillOptions(s: WizardState): { count: number; from: Skill[] } {
  const bgSkills = selectedBackground(s)?.skills ?? [];
  const cls = selectedClass(s);
  if (!cls?.data) return { count: 0, from: SKILLS.filter((k) => !bgSkills.includes(k)) };
  const from = cls.data.skillChoices.from.filter((k) => !bgSkills.includes(k));
  return { count: Math.min(cls.data.skillChoices.count, from.length), from };
}

export function isStepValid(step: Step, s: WizardState): boolean {
  switch (step) {
    case 'class': {
      const cls = selectedClass(s);
      return !!cls?.name && s.level >= 1 && s.level <= 20;
    }
    case 'background': {
      const bg = selectedBackground(s);
      return (
        !!bg?.name &&
        new Set(bg.abilities).size === 3 &&
        new Set(bg.skills).size === 2 &&
        isValidBackgroundIncrease(bg.abilities, backgroundIncreases(s))
      );
    }
    case 'species':
      return !!selectedSpecies(s)?.name && s.speed >= 0;
    case 'abilities':
      return baseScores(s) !== undefined;
    case 'skills': {
      const { count, from } = classSkillOptions(s);
      const chosen = s.classSkills.filter((k) => from.includes(k));
      // Homebrew classes have no fixed count; SRD classes need exactly their count.
      return selectedClass(s)?.data ? chosen.length === count : true;
    }
    case 'details':
      return s.name.trim() !== '';
  }
}

export function toBuild(s: WizardState): CharacterBuild | undefined {
  const cls = selectedClass(s);
  const bg = selectedBackground(s);
  const species = selectedSpecies(s);
  const scores = baseScores(s);
  if (!cls || !bg || !species || !scores) return undefined;
  const { from } = classSkillOptions(s);
  return {
    class: {
      name: cls.name,
      level: s.level,
      hitDie: cls.hitDie,
      subclass: s.level >= 3 ? s.subclass : undefined,
    },
    background: {
      name: bg.name,
      abilities: [...bg.abilities],
      abilityIncreases: backgroundIncreases(s),
      originFeat: s.originFeat,
      skills: [...bg.skills],
      tool: s.tool,
    },
    species: { name: species.name, size: s.size, speed: s.speed },
    baseAbilities: { ...scores },
    classSkills: s.classSkills.filter((k) => from.includes(k)),
    alignment: s.alignment,
  };
}

export function wizardCoreData(s: WizardState): CoreSheetData | undefined {
  const build = toBuild(s);
  return build ? buildCoreData(build) : undefined;
}
