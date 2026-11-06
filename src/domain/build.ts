// Character creation (2024 order): class → background → species → ability scores.
import { emptyCoreData, type CoreSheetData } from './character';
import {
  ABILITIES,
  POINT_BUY_BUDGET,
  POINT_BUY_COST,
  STANDARD_ARRAY,
  type Ability,
  type Size,
  type Skill,
} from './data/abilities';
import { classData } from './data/classes';
import { newId } from './ids';

export interface CharacterBuild {
  class: { name: string; level: number; subclass?: string; hitDie: number };
  background: {
    name: string;
    abilities: Ability[];
    abilityIncreases: Partial<Record<Ability, 1 | 2>>;
    originFeat: string;
    skills: Skill[];
    tool?: string;
  };
  species: { name: string; size: Size; speed: number };
  baseAbilities: Record<Ability, number>;
  classSkills: Skill[];
  alignment?: string;
}

/** 2024: either +2 and +1 to two different abilities, or +1 to all three, all from the background's list. */
export function isValidBackgroundIncrease(
  allowed: readonly Ability[],
  increases: Partial<Record<Ability, number>>,
): boolean {
  const entries = Object.entries(increases).filter(([, v]) => v) as [Ability, number][];
  if (entries.some(([a]) => !allowed.includes(a))) return false;
  const values = entries.map(([, v]) => v).sort();
  return (
    (values.length === 2 && values[0] === 1 && values[1] === 2) ||
    (values.length === 3 && values.every((v) => v === 1))
  );
}

export function pointBuyCost(scores: Record<Ability, number>): number | undefined {
  let total = 0;
  for (const a of ABILITIES) {
    const cost = POINT_BUY_COST[scores[a]];
    if (cost === undefined) return undefined;
    total += cost;
  }
  return total;
}

export const isValidPointBuy = (scores: Record<Ability, number>): boolean => {
  const cost = pointBuyCost(scores);
  return cost !== undefined && cost <= POINT_BUY_BUDGET;
};

/** True if the six scores are a permutation of the standard array. */
export function isStandardArray(scores: Record<Ability, number>): boolean {
  const sorted = ABILITIES.map((a) => scores[a]).sort((a, b) => b - a);
  return sorted.every((v, i) => v === STANDARD_ARRAY[i]);
}

/** Builds the initial sheet data from the wizard's choices. */
export function buildCoreData(build: CharacterBuild): CoreSheetData {
  const data = emptyCoreData();
  const cls = classData(build.class.name);
  const level = Math.min(20, Math.max(1, Math.trunc(build.class.level)));

  data.classes = [
    {
      name: cls?.name ?? build.class.name.trim(),
      level,
      hitDie: cls?.hitDie ?? build.class.hitDie,
      subclass: build.class.subclass?.trim() || undefined,
    },
  ];
  data.saveProficiencies = cls ? [...cls.saves] : [];
  data.proficiencies = {
    armor: cls?.armorTraining ?? '',
    weapons: cls?.weaponProficiencies ?? '',
    tools: build.background.tool?.trim() ?? '',
    languages: 'Common',
  };

  data.background = {
    name: build.background.name.trim(),
    abilityIncreases: { ...build.background.abilityIncreases },
    originFeat: build.background.originFeat.trim(),
    skillProficiencies: [...build.background.skills],
    toolProficiency: build.background.tool?.trim() || undefined,
  };
  if (data.background.originFeat) {
    data.feats = [{ id: newId(), name: data.background.originFeat, category: 'origin' }];
  }

  data.species = build.species.name.trim();
  data.size = build.species.size;
  data.baseSpeed = build.species.speed;
  data.baseAbilities = { ...build.baseAbilities };
  data.alignment = build.alignment ?? '';

  for (const s of [...build.background.skills, ...build.classSkills]) data.skills[s] = 'proficient';
  return data;
}
