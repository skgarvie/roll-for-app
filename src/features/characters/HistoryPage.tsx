import { useState } from 'react';
import { useArchivedCharacters } from '@/db/hooks';
import { deleteArchivedCharacter, makeCharacterActive } from '@/db/repos/characters';
import type { Character } from '@/db/types';
import { Button } from '@/ui/Button';
import { FormDialog } from '@/ui/Dialog';
import { formatDate } from '@/ui/format';
import { useCampaignContext } from '../campaigns/campaignContext';

/** Archived (earlier) characters of the campaign. */
export function HistoryPage() {
  const { campaign, character: active } = useCampaignContext();
  const archived = useArchivedCharacters(campaign.id);
  const [toDelete, setToDelete] = useState<Character | null>(null);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Previous characters</h2>
        <p className="mt-1 text-stone-500">
          Characters who died or retired in {campaign.name}. Making one active archives{' '}
          {active ? active.name : 'the current character'}.
        </p>
      </div>

      {archived && archived.length === 0 && (
        <p className="rounded-2xl border-2 border-dashed border-stone-300 p-8 text-center text-stone-500 dark:border-stone-700">
          No previous characters.
        </p>
      )}

      <ul className="space-y-3">
        {archived?.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{c.name}</p>
              <p className="text-sm text-stone-500">
                Archived {c.archivedAt ? formatDate(c.archivedAt) : ''}
              </p>
            </div>
            <Button onClick={() => void makeCharacterActive(c.id)}>Make active</Button>
            <Button variant="ghost" className="text-red-600" onClick={() => setToDelete(c)}>
              Delete
            </Button>
          </li>
        ))}
      </ul>

      {toDelete && (
        <FormDialog
          open
          onClose={() => setToDelete(null)}
          title={`Delete ${toDelete.name}?`}
          submitLabel="Delete character"
          submitVariant="danger"
          onSubmit={() => deleteArchivedCharacter(toDelete.id)}
        >
          <p>This permanently deletes the character and all their sheets.</p>
        </FormDialog>
      )}
    </section>
  );
}
