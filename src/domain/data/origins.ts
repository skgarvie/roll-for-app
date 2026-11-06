// 2024 backgrounds, species and origin feats from SRD 5.2. Anything else is entered as "custom".
import type { Ability, Size, Skill } from './abilities';

export interface BackgroundData {
  name: string;
  /** The three abilities the background's increases can go to. */
  abilities: [Ability, Ability, Ability];
  originFeat: string;
  skills: [Skill, Skill];
  tool: string;
}

export const BACKGROUNDS: readonly BackgroundData[] = [
  {
    name: 'Acolyte',
    abilities: ['int', 'wis', 'cha'],
    originFeat: 'Magic Initiate (Cleric)',
    skills: ['insight', 'religion'],
    tool: 'Calligrapher’s Supplies',
  },
  {
    name: 'Criminal',
    abilities: ['dex', 'con', 'int'],
    originFeat: 'Alert',
    skills: ['sleightOfHand', 'stealth'],
    tool: 'Thieves’ Tools',
  },
  {
    name: 'Sage',
    abilities: ['con', 'int', 'wis'],
    originFeat: 'Magic Initiate (Wizard)',
    skills: ['arcana', 'history'],
    tool: 'Calligrapher’s Supplies',
  },
  {
    name: 'Soldier',
    abilities: ['str', 'dex', 'con'],
    originFeat: 'Savage Attacker',
    skills: ['athletics', 'intimidation'],
    tool: 'Gaming Set (choose one kind)',
  },
];

export const ORIGIN_FEATS = [
  'Alert',
  'Magic Initiate (Cleric)',
  'Magic Initiate (Druid)',
  'Magic Initiate (Wizard)',
  'Savage Attacker',
  'Skilled',
] as const;

export interface SpeciesData {
  name: string;
  /** More than one entry means the player chooses. */
  sizes: Size[];
  speed: number;
  darkvision?: number;
  traits: string[];
}

export const SPECIES: readonly SpeciesData[] = [
  {
    name: 'Dragonborn',
    sizes: ['Medium'],
    speed: 30,
    darkvision: 60,
    traits: [
      'Draconic Ancestry',
      'Breath Weapon',
      'Damage Resistance',
      'Darkvision',
      'Draconic Flight',
    ],
  },
  {
    name: 'Dwarf',
    sizes: ['Medium'],
    speed: 30,
    darkvision: 120,
    traits: ['Darkvision', 'Dwarven Resilience', 'Dwarven Toughness', 'Stonecunning'],
  },
  {
    name: 'Elf',
    sizes: ['Medium'],
    speed: 30,
    darkvision: 60,
    traits: ['Darkvision', 'Elven Lineage', 'Fey Ancestry', 'Keen Senses', 'Trance'],
  },
  {
    name: 'Gnome',
    sizes: ['Small'],
    speed: 30,
    darkvision: 60,
    traits: ['Darkvision', 'Gnomish Cunning', 'Gnomish Lineage'],
  },
  {
    name: 'Goliath',
    sizes: ['Medium'],
    speed: 35,
    traits: ['Giant Ancestry', 'Large Form', 'Powerful Build'],
  },
  {
    name: 'Halfling',
    sizes: ['Small'],
    speed: 30,
    traits: ['Brave', 'Halfling Nimbleness', 'Luck', 'Naturally Stealthy'],
  },
  {
    name: 'Human',
    sizes: ['Medium', 'Small'],
    speed: 30,
    traits: ['Resourceful', 'Skillful', 'Versatile'],
  },
  {
    name: 'Orc',
    sizes: ['Medium'],
    speed: 30,
    darkvision: 120,
    traits: ['Adrenaline Rush', 'Darkvision', 'Relentless Endurance'],
  },
  {
    name: 'Tiefling',
    sizes: ['Medium', 'Small'],
    speed: 30,
    darkvision: 60,
    traits: ['Darkvision', 'Fiendish Legacy', 'Otherworldly Presence'],
  },
];

export function speciesData(name: string): SpeciesData | undefined {
  return SPECIES.find((s) => s.name.toLowerCase() === name.trim().toLowerCase());
}

export function backgroundData(name: string): BackgroundData | undefined {
  return BACKGROUNDS.find((b) => b.name.toLowerCase() === name.trim().toLowerCase());
}
