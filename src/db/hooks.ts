import { useLiveQuery } from 'dexie-react-hooks';
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

/** Sheets of a character in tab order. */
export function useSheets(character: Character | null | undefined): Sheet[] | undefined {
  return useLiveQuery(async () => {
    if (!character) return [];
    const sheets = await db.sheets.where('characterId').equals(character.id).toArray();
    return orderSheets(character, sheets);
  }, [character]);
}
