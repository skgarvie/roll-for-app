// SRD 5.2 weapons (with 2024 Weapon Mastery properties) and armor.

export const MASTERY_PROPERTIES = {
  Cleave: 'Hit a second creature within 5 ft of the first (once per turn), no ability modifier.',
  Graze: 'On a miss, deal damage equal to the ability modifier.',
  Nick: 'Make the Light weapon extra attack as part of the Attack action.',
  Push: 'Push a Large or smaller target up to 10 ft away.',
  Sap: 'Target has Disadvantage on its next attack roll before your next turn.',
  Slow: 'Target’s Speed drops by 10 ft until the start of your next turn.',
  Topple: 'Target makes a CON save (DC 8 + mod + PB) or falls Prone.',
  Vex: 'Advantage on your next attack roll against the target before the end of your next turn.',
} as const;
export type Mastery = keyof typeof MASTERY_PROPERTIES;

export interface WeaponData {
  name: string;
  category: 'simple' | 'martial';
  ranged: boolean;
  damage: string;
  damageType: 'Bludgeoning' | 'Piercing' | 'Slashing';
  properties: string[];
  mastery: Mastery;
}

const w = (
  name: string,
  category: WeaponData['category'],
  ranged: boolean,
  damage: string,
  damageType: WeaponData['damageType'],
  properties: string[],
  mastery: Mastery,
): WeaponData => ({ name, category, ranged, damage, damageType, properties, mastery });

export const WEAPONS: readonly WeaponData[] = [
  w('Club', 'simple', false, '1d4', 'Bludgeoning', ['Light'], 'Slow'),
  w('Dagger', 'simple', false, '1d4', 'Piercing', ['Finesse', 'Light', 'Thrown'], 'Nick'),
  w('Greatclub', 'simple', false, '1d8', 'Bludgeoning', ['Two-Handed'], 'Push'),
  w('Handaxe', 'simple', false, '1d6', 'Slashing', ['Light', 'Thrown'], 'Vex'),
  w('Javelin', 'simple', false, '1d6', 'Piercing', ['Thrown'], 'Slow'),
  w('Light Hammer', 'simple', false, '1d4', 'Bludgeoning', ['Light', 'Thrown'], 'Nick'),
  w('Mace', 'simple', false, '1d6', 'Bludgeoning', [], 'Sap'),
  w('Quarterstaff', 'simple', false, '1d6', 'Bludgeoning', ['Versatile (1d8)'], 'Topple'),
  w('Sickle', 'simple', false, '1d4', 'Slashing', ['Light'], 'Nick'),
  w('Spear', 'simple', false, '1d6', 'Piercing', ['Thrown', 'Versatile (1d8)'], 'Sap'),
  w('Dart', 'simple', true, '1d4', 'Piercing', ['Finesse', 'Thrown'], 'Vex'),
  w('Light Crossbow', 'simple', true, '1d8', 'Piercing', ['Loading', 'Two-Handed'], 'Slow'),
  w('Shortbow', 'simple', true, '1d6', 'Piercing', ['Two-Handed'], 'Vex'),
  w('Sling', 'simple', true, '1d4', 'Bludgeoning', ['Ammunition'], 'Slow'),
  w('Battleaxe', 'martial', false, '1d8', 'Slashing', ['Versatile (1d10)'], 'Topple'),
  w('Flail', 'martial', false, '1d8', 'Bludgeoning', [], 'Sap'),
  w('Glaive', 'martial', false, '1d10', 'Slashing', ['Heavy', 'Reach', 'Two-Handed'], 'Graze'),
  w('Greataxe', 'martial', false, '1d12', 'Slashing', ['Heavy', 'Two-Handed'], 'Cleave'),
  w('Greatsword', 'martial', false, '2d6', 'Slashing', ['Heavy', 'Two-Handed'], 'Graze'),
  w('Halberd', 'martial', false, '1d10', 'Slashing', ['Heavy', 'Reach', 'Two-Handed'], 'Cleave'),
  w('Lance', 'martial', false, '1d10', 'Piercing', ['Heavy', 'Reach', 'Two-Handed*'], 'Topple'),
  w('Longsword', 'martial', false, '1d8', 'Slashing', ['Versatile (1d10)'], 'Sap'),
  w('Maul', 'martial', false, '2d6', 'Bludgeoning', ['Heavy', 'Two-Handed'], 'Topple'),
  w('Morningstar', 'martial', false, '1d8', 'Piercing', [], 'Sap'),
  w('Pike', 'martial', false, '1d10', 'Piercing', ['Heavy', 'Reach', 'Two-Handed'], 'Push'),
  w('Rapier', 'martial', false, '1d8', 'Piercing', ['Finesse'], 'Vex'),
  w('Scimitar', 'martial', false, '1d6', 'Slashing', ['Finesse', 'Light'], 'Nick'),
  w('Shortsword', 'martial', false, '1d6', 'Piercing', ['Finesse', 'Light'], 'Vex'),
  w('Trident', 'martial', false, '1d8', 'Piercing', ['Thrown', 'Versatile (1d10)'], 'Topple'),
  w('Warhammer', 'martial', false, '1d8', 'Bludgeoning', ['Versatile (1d10)'], 'Push'),
  w('War Pick', 'martial', false, '1d8', 'Piercing', ['Versatile (1d10)'], 'Sap'),
  w('Whip', 'martial', false, '1d4', 'Slashing', ['Finesse', 'Reach'], 'Slow'),
  w('Blowgun', 'martial', true, '1', 'Piercing', ['Ammunition', 'Loading'], 'Vex'),
  w('Hand Crossbow', 'martial', true, '1d6', 'Piercing', ['Ammunition', 'Light', 'Loading'], 'Vex'),
  w('Heavy Crossbow', 'martial', true, '1d10', 'Piercing', ['Heavy', 'Loading'], 'Push'),
  w('Longbow', 'martial', true, '1d8', 'Piercing', ['Heavy', 'Two-Handed'], 'Slow'),
  w('Musket', 'martial', true, '1d12', 'Piercing', ['Loading', 'Two-Handed'], 'Slow'),
  w('Pistol', 'martial', true, '1d10', 'Piercing', ['Loading'], 'Vex'),
];

export function weaponData(name: string): WeaponData | undefined {
  return WEAPONS.find((x) => x.name.toLowerCase() === name.trim().toLowerCase());
}

export type ArmorType = 'light' | 'medium' | 'heavy';

export interface ArmorData {
  name: string;
  type: ArmorType;
  baseAc: number;
}

export const ARMOR: readonly ArmorData[] = [
  { name: 'Padded Armor', type: 'light', baseAc: 11 },
  { name: 'Leather Armor', type: 'light', baseAc: 11 },
  { name: 'Studded Leather Armor', type: 'light', baseAc: 12 },
  { name: 'Hide Armor', type: 'medium', baseAc: 12 },
  { name: 'Chain Shirt', type: 'medium', baseAc: 13 },
  { name: 'Scale Mail', type: 'medium', baseAc: 14 },
  { name: 'Breastplate', type: 'medium', baseAc: 14 },
  { name: 'Half Plate Armor', type: 'medium', baseAc: 15 },
  { name: 'Ring Mail', type: 'heavy', baseAc: 14 },
  { name: 'Chain Mail', type: 'heavy', baseAc: 16 },
  { name: 'Splint Armor', type: 'heavy', baseAc: 17 },
  { name: 'Plate Armor', type: 'heavy', baseAc: 18 },
];

/** 2024 conditions (Exhaustion has its own stepper). */
export const CONDITIONS = [
  'Blinded',
  'Charmed',
  'Deafened',
  'Frightened',
  'Grappled',
  'Incapacitated',
  'Invisible',
  'Paralyzed',
  'Petrified',
  'Poisoned',
  'Prone',
  'Restrained',
  'Stunned',
  'Unconscious',
] as const;
export type Condition = (typeof CONDITIONS)[number];
