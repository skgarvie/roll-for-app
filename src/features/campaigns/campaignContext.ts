import { useOutletContext } from 'react-router';
import type { Campaign, Character, Sheet } from '@/db/types';

export interface CampaignContext {
  campaign: Campaign;
  character: Character | null;
  sheets: Sheet[];
}

export function useCampaignContext(): CampaignContext {
  return useOutletContext<CampaignContext>();
}
