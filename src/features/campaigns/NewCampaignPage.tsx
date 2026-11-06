import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAllCharacters, useCampaigns } from '@/db/hooks';
import { createCampaign } from '@/db/repos/campaigns';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';
import { TextField } from '@/ui/TextField';
import { TopBar } from '@/ui/TopBar';

type CharacterMode = 'new' | 'copy';

/**
 * Creates a campaign and its character in one step. The character section
 * grows into the full 2024 creation wizard in M2.
 */
export function NewCampaignPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const copyFrom = params.get('copyFrom') ?? undefined;

  const campaigns = useCampaigns();
  const characters = useAllCharacters();

  const [name, setName] = useState('');
  const [dmName, setDmName] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<CharacterMode>(copyFrom ? 'copy' : 'new');
  const [characterName, setCharacterName] = useState('');
  const [copyId, setCopyId] = useState<string | undefined>(copyFrom);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const campaignName = new Map((campaigns ?? []).map((c) => [c.id, c.name]));
  const copyable = [...(characters ?? [])].sort((a, b) => a.name.localeCompare(b.name));

  const canSubmit =
    name.trim() !== '' && (mode === 'new' ? characterName.trim() !== '' : copyId !== undefined);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const { campaignId } = await createCampaign(
        { name, dmName, description },
        mode === 'new'
          ? { kind: 'new', name: characterName }
          : { kind: 'copy', characterId: copyId! },
      );
      void navigate(`/campaign/${campaignId}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="New campaign" back={{ to: '/', label: 'Back to campaigns' }} />
      <main className="px-safe pb-safe mx-auto w-full max-w-2xl flex-1 py-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="space-y-4 rounded-2xl bg-white p-6 shadow-sm dark:bg-stone-900">
            <h2 className="text-lg font-semibold">Campaign</h2>
            <TextField
              label="Campaign name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              autoComplete="off"
              placeholder="e.g. Curse of Strahd"
            />
            <TextField
              label="Dungeon Master"
              hint="Optional"
              value={dmName}
              onChange={(e) => setDmName(e.target.value)}
              autoComplete="off"
            />
            <TextField
              label="Description"
              hint="Optional"
              multiline
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </section>

          <section className="space-y-4 rounded-2xl bg-white p-6 shadow-sm dark:bg-stone-900">
            <h2 className="text-lg font-semibold">Character</h2>

            {copyable.length > 0 && (
              <div role="radiogroup" aria-label="Character" className="grid gap-2 sm:grid-cols-2">
                <ModeOption
                  checked={mode === 'new'}
                  onSelect={() => setMode('new')}
                  title="New character"
                  description="Start a fresh character sheet."
                />
                <ModeOption
                  checked={mode === 'copy'}
                  onSelect={() => setMode('copy')}
                  title="Copy a character"
                  description="Bring a character from another campaign."
                />
              </div>
            )}

            {mode === 'new' || copyable.length === 0 ? (
              <TextField
                label="Character name"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                required
                autoComplete="off"
              />
            ) : (
              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-medium text-stone-700 dark:text-stone-300">
                  Character to copy
                </legend>
                <ul className="max-h-80 space-y-2 overflow-y-auto">
                  {copyable.map((c) => (
                    <li key={c.id}>
                      <label
                        className={cx(
                          'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-4 py-2',
                          copyId === c.id
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                            : 'border-stone-200 dark:border-stone-700',
                        )}
                      >
                        <input
                          type="radio"
                          name="copy-character"
                          value={c.id}
                          checked={copyId === c.id}
                          onChange={() => setCopyId(c.id)}
                          className="size-5 accent-amber-500"
                        />
                        <span>
                          <span className="font-medium">{c.name}</span>
                          <span className="block text-sm text-stone-500">
                            {campaignName.get(c.campaignId) ?? 'Unknown campaign'}
                            {c.archivedAt !== undefined && ' · previous character'}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-stone-500">
                  The copy is independent: changes won&rsquo;t affect the original.
                </p>
              </fieldset>
            )}
          </section>

          {error && (
            <p role="alert" className="font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                // Go back if we came from inside the app, otherwise to the campaign list.
                const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
                void (idx > 0 ? navigate(-1) : navigate('/'));
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!canSubmit || busy}>
              Create campaign
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

function ModeOption({
  checked,
  onSelect,
  title,
  description,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cx(
        'rounded-xl border-2 p-4 text-left transition-colors',
        checked
          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
          : 'border-stone-200 hover:border-stone-300 dark:border-stone-700',
      )}
    >
      <span className="block font-semibold">{title}</span>
      <span className="block text-sm text-stone-500">{description}</span>
    </button>
  );
}
