import { Navigate, useParams } from 'react-router';
import type { SheetKind } from '@/db/types';
import { useCampaignContext } from '../campaigns/campaignContext';

const COMING_IN: Partial<Record<SheetKind, string>> = {
  core: 'M2',
  combat: 'M2',
  spells: 'M5',
  inventory: 'M5',
  features: 'M5',
  backstory: 'M5',
  custom: 'M5',
  form: 'M5',
};

/** Placeholder until the sheet UIs land (M2 / M5). */
export function SheetPage() {
  const { sheetId } = useParams();
  const { campaign, sheets } = useCampaignContext();
  const sheet = sheets.find((s) => s.id === sheetId);

  // e.g. after replacing the character, old sheet URLs no longer exist.
  if (!sheet) return <Navigate to={`/campaign/${campaign.id}`} replace />;

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-stone-900">
      <h2 className="text-2xl font-semibold">{sheet.title}</h2>
      <p className="mt-2 text-stone-500">
        This sheet is coming in {COMING_IN[sheet.kind] ?? 'a later milestone'}.
      </p>
    </section>
  );
}
