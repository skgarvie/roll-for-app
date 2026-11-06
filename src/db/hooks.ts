import { useLiveQuery } from 'dexie-react-hooks';
import { normalizeCoreData } from '@/domain/character';
import { classSummary } from '@/domain/derive';
import { db } from './db';
import { getActiveCharacter, getArchivedCharacters, orderSheets } from './repos/characters';
import type { Campaign, Character, ID, Sheet } from './types';

// Convention: `undefined` = still loading, `null` = not found.

export function useCampaigns(): Campaign[] | undefined {
  return useLiveQuery(() => db.campaigns.toArray(), []);
}

export function useCampaign(id: ID | undefined): Campaign | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.campaigns.get(id)) ?? null) : null), [id]);
}

export function useAllCharacters(): Character[] | undefined {
  return useLiveQuery(() => db.characters.toArray(), []);
}

export function useActiveCharacter(campaignId: ID | undefined): Character | null | undefined {
  return useLiveQuery(
    async () => (campaignId ? ((await getActiveCharacter(campaignId)) ?? null) : null),
    [campaignId],
  );
}

export function useArchivedCharacters(campaignId: ID | undefined): Character[] | undefined {
  return useLiveQuery(
    async () => (campaignId ? getArchivedCharacters(campaignId) : []),
    [campaignId],
  );
}

/**
 * Sheets of a character in tab order. `undefined` while loading, including the
 * moment the character changes (so routes never see a stale or empty list).
 */
export function useSheets(character: Character | null | undefined): Sheet[] | undefined {
  const result = useLiveQuery(async () => {
    if (!character) return { characterId: undefined, sheets: [] as Sheet[] };
    const sheets = await db.sheets.where('characterId').equals(character.id).toArray();
    return { characterId: character.id, sheets: orderSheets(character, sheets) };
  }, [character]);
  if (character === undefined || !result || result.characterId !== character?.id) return undefined;
  return result.sheets;
}

/** "Fighter 3 / Wizard 1" for each character that has a class, keyed by character id. */
export function useClassSummaries(): Map<ID, string> | undefined {
  return useLiveQuery(async () => {
    const cores = await db.sheets.where('kind').equals('core').toArray();
    return new Map(
      cores.map((s) => [s.characterId, classSummary(normalizeCoreData(s.data).classes)]),
    );
  }, []);
}
