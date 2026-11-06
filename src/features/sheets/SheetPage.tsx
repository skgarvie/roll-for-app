import type { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router';
import type { Character, Sheet, SheetKind } from '@/db/types';
import { useCampaignContext } from '../campaigns/campaignContext';
import { CombatSheet } from './CombatSheet';
import { useCoreEditor } from './coreEditor';
import { CoreSheet } from './CoreSheet';

const COMING_IN: Partial<Record<SheetKind, string>> = {
  spells: 'M5',
  inventory: 'M5',
  features: 'M5',
  backstory: 'M5',
  custom: 'M5',
  form: 'M5',
};

export function SheetPage() {
  const { sheetId } = useParams();
  const { campaign, character, sheets } = useCampaignContext();
  const sheet = sheets.find((s) => s.id === sheetId);

  // e.g. after replacing the character, old sheet URLs no longer exist.
  if (!sheet || !character) return <Navigate to={`/campaign/${campaign.id}`} replace />;

  if (sheet.kind === 'core' || sheet.kind === 'combat') {
    const core = sheets.find((s) => s.kind === 'core');
    if (!core) {
      return (
        <Placeholder title={sheet.title}>
          This character has no Core sheet to read from.
        </Placeholder>
      );
    }
    // Keyed by sheet so local editing state never leaks between sheets or characters.
    return <RulesSheet key={sheet.id} sheet={sheet} core={core} character={character} />;
  }

  return (
    <Placeholder title={sheet.title}>
      This sheet is coming in {COMING_IN[sheet.kind] ?? 'a later milestone'}.
    </Placeholder>
  );
}

function RulesSheet({
  sheet,
  core,
  character,
}: {
  sheet: Sheet;
  core: Sheet;
  character: Character;
}) {
  const editor = useCoreEditor(core, character);
  return sheet.kind === 'combat' ? (
    <CombatSheet editor={editor} title={sheet.title} />
  ) : (
    <CoreSheet editor={editor} title={sheet.title} />
  );
}

function Placeholder({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm dark:bg-stone-900">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-2 text-stone-500">{children}</p>
    </section>
  );
}
