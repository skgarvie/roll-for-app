// 2024 class data (SRD 5.2). Tables live here, not in code, so errata are easy to apply.
import type { Ability, Skill } from './abilities';
import { SKILLS } from './abilities';

export type CasterKind = 'full' | 'half' | 'third' | 'pact' | 'none';

export interface ClassData {
  name: string;
  hitDie: 6 | 8 | 10 | 12;
  primaryAbility: Ability[];
  saves: [Ability, Ability];
  skillChoices: { count: number; from: readonly Skill[] };
  armorTraining: string;
  weaponProficiencies: string;
  caster: CasterKind;
  spellAbility?: Ability;
  /** [class level, masteries known] steps; empty for classes without Weapon Mastery. */
  weaponMasteries: readonly (readonly [level: number, count: number])[];
  /** Abilities added to 10 + DEX for Unarmored Defense. */
  unarmoredDefense?: readonly Ability[];
  /** Subclass from the SRD, offered as a suggestion. Every class picks its subclass at level 3. */
  srdSubclass: string;
}

export const SUBCLASS_LEVEL = 3;

export const CLASSES = {
  Barbarian: {
    name: 'Barbarian',
    hitDie: 12,
    primaryAbility: ['str'],
    saves: ['str', 'con'],
    skillChoices: {
      count: 2,
      from: ['animalHandling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'],
    },
    armorTraining: 'Light and Medium armor, Shields',
    weaponProficiencies: 'Simple and Martial weapons',
    caster: 'none',
    weaponMasteries: [
      [1, 2],
      [4, 3],
      [10, 4],
    ],
    unarmoredDefense: ['con'],
    srdSubclass: 'Path of the Berserker',
  },
  Bard: {
    name: 'Bard',
    hitDie: 8,
    primaryAbility: ['cha'],
    saves: ['dex', 'cha'],
    skillChoices: { count: 3, from: SKILLS },
    armorTraining: 'Light armor',
    weaponProficiencies: 'Simple weapons',
    caster: 'full',
    spellAbility: 'cha',
    weaponMasteries: [],
    srdSubclass: 'College of Lore',
  },
  Cleric: {
    name: 'Cleric',
    hitDie: 8,
    primaryAbility: ['wis'],
    saves: ['wis', 'cha'],
    skillChoices: { count: 2, from: ['history', 'insight', 'medicine', 'persuasion', 'religion'] },
    armorTraining: 'Light and Medium armor, Shields',
    weaponProficiencies: 'Simple weapons',
    caster: 'full',
    spellAbility: 'wis',
    weaponMasteries: [],
    srdSubclass: 'Life Domain',
  },
  Druid: {
    name: 'Druid',
    hitDie: 8,
    primaryAbility: ['wis'],
    saves: ['int', 'wis'],
    skillChoices: {
      count: 2,
      from: [
        'arcana',
        'animalHandling',
        'insight',
        'medicine',
        'nature',
        'perception',
        'religion',
        'survival',
      ],
    },
    armorTraining: 'Light armor, Shields',
    weaponProficiencies: 'Simple weapons',
    caster: 'full',
    spellAbility: 'wis',
    weaponMasteries: [],
    srdSubclass: 'Circle of the Land',
  },
  Fighter: {
    name: 'Fighter',
    hitDie: 10,
    primaryAbility: ['str', 'dex'],
    saves: ['str', 'con'],
    skillChoices: {
      count: 2,
      from: [
        'acrobatics',
        'animalHandling',
        'athletics',
        'history',
        'insight',
        'intimidation',
        'persuasion',
        'perception',
        'survival',
      ],
    },
    armorTraining: 'Light, Medium, and Heavy armor, Shields',
    weaponProficiencies: 'Simple and Martial weapons',
    caster: 'none',
    weaponMasteries: [
      [1, 3],
      [4, 4],
      [10, 5],
      [16, 6],
    ],
    srdSubclass: 'Champion',
  },
  Monk: {
    name: 'Monk',
    hitDie: 8,
    primaryAbility: ['dex', 'wis'],
    saves: ['str', 'dex'],
    skillChoices: {
      count: 2,
      from: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
    },
    armorTraining: 'None',
    weaponProficiencies: 'Simple weapons, Martial weapons with the Light property',
    caster: 'none',
    weaponMasteries: [],
    unarmoredDefense: ['wis'],
    srdSubclass: 'Warrior of the Open Hand',
  },
  Paladin: {
    name: 'Paladin',
    hitDie: 10,
    primaryAbility: ['str', 'cha'],
    saves: ['wis', 'cha'],
    skillChoices: {
      count: 2,
      from: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'],
    },
    armorTraining: 'Light, Medium, and Heavy armor, Shields',
    weaponProficiencies: 'Simple and Martial weapons',
    caster: 'half',
    spellAbility: 'cha',
    weaponMasteries: [[1, 2]],
    srdSubclass: 'Oath of Devotion',
  },
  Ranger: {
    name: 'Ranger',
    hitDie: 10,
    primaryAbility: ['dex', 'wis'],
    saves: ['str', 'dex'],
    skillChoices: {
      count: 3,
      from: [
        'animalHandling',
        'athletics',
        'insight',
        'investigation',
        'nature',
        'perception',
        'stealth',
        'survival',
      ],
    },
    armorTraining: 'Light and Medium armor, Shields',
    weaponProficiencies: 'Simple and Martial weapons',
    caster: 'half',
    spellAbility: 'wis',
    weaponMasteries: [[1, 2]],
    srdSubclass: 'Hunter',
  },
  Rogue: {
    name: 'Rogue',
    hitDie: 8,
    primaryAbility: ['dex'],
    saves: ['dex', 'int'],
    skillChoices: {
      count: 4,
      from: [
        'acrobatics',
        'athletics',
        'deception',
        'insight',
        'intimidation',
        'investigation',
        'perception',
        'persuasion',
        'sleightOfHand',
        'stealth',
      ],
    },
    armorTraining: 'Light armor',
    weaponProficiencies: 'Simple weapons, Martial weapons with the Finesse or Light property',
    caster: 'none',
    weaponMasteries: [[1, 2]],
    srdSubclass: 'Thief',
  },
  Sorcerer: {
    name: 'Sorcerer',
    hitDie: 6,
    primaryAbility: ['cha'],
    saves: ['con', 'cha'],
    skillChoices: {
      count: 2,
      from: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'],
    },
    armorTraining: 'None',
    weaponProficiencies: 'Simple weapons',
    caster: 'full',
    spellAbility: 'cha',
    weaponMasteries: [],
    srdSubclass: 'Draconic Sorcery',
  },
  Warlock: {
    name: 'Warlock',
    hitDie: 8,
    primaryAbility: ['cha'],
    saves: ['wis', 'cha'],
    skillChoices: {
      count: 2,
      from: [
        'arcana',
        'deception',
        'history',
        'intimidation',
        'investigation',
        'nature',
        'religion',
      ],
    },
    armorTraining: 'Light armor',
    weaponProficiencies: 'Simple weapons',
    caster: 'pact',
    spellAbility: 'cha',
    weaponMasteries: [],
    srdSubclass: 'Fiend Patron',
  },
  Wizard: {
    name: 'Wizard',
    hitDie: 6,
    primaryAbility: ['int'],
    saves: ['int', 'wis'],
    skillChoices: {
      count: 2,
      from: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'nature', 'religion'],
    },
    armorTraining: 'None',
    weaponProficiencies: 'Simple weapons',
    caster: 'full',
    spellAbility: 'int',
    weaponMasteries: [],
    srdSubclass: 'Evoker',
  },
} as const satisfies Record<string, ClassData>;

export type ClassName = keyof typeof CLASSES;
export const CLASS_NAMES = Object.keys(CLASSES) as ClassName[];

/** Looks up a class by name (case-insensitive); undefined for homebrew classes. */
export function classData(name: string): ClassData | undefined {
  const key = CLASS_NAMES.find((n) => n.toLowerCase() === name.trim().toLowerCase());
  return key ? CLASSES[key] : undefined;
}
