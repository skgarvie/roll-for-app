import { Link, useNavigate, useParams } from 'react-router';
import { useActiveCharacter, useCampaign } from '@/db/hooks';
import { createCharacter, replaceActiveCharacter } from '@/db/repos/characters';
import { TopBar } from '@/ui/TopBar';
import { CharacterWizard, type WizardResult } from './wizard/CharacterWizard';

/**
 * Creates the campaign's character with the 2024 wizard. If there's already an
 * active character, it's archived (kept under Previous characters).
 */
export function NewCharacterPage() {
  const { campaignId } = useParams();
  const campaign = useCampaign(campaignId);
  const current = useActiveCharacter(campaignId);
  const navigate = useNavigate();
  const back = `/campaign/${campaignId}`;

  if (campaign === undefined || current === undefined) {
    return <div className="min-h-full" aria-busy="true" />;
  }
  if (campaign === null) {
    return (
      <div className="flex min-h-full flex-col">
        <TopBar title="Campaign not found" back={{ to: '/', label: 'Back to campaigns' }} />
        <main className="px-safe mx-auto w-full max-w-2xl py-10 text-center">
          <Link to="/" className="font-semibold text-amber-700 underline">
            Go to campaigns
          </Link>
        </main>
      </div>
    );
  }

  const submit = async ({ name, core }: WizardResult) => {
    if (current) await replaceActiveCharacter(campaign.id, { name, core });
    else await createCharacter(campaign.id, { name, core });
    void navigate(back, { replace: true });
  };

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title={current ? 'Replace character' : 'New character'}
        subtitle={campaign.name}
        back={{ to: back, label: 'Back to campaign' }}
      />
      <main className="px-safe pb-safe mx-auto w-full max-w-4xl flex-1 py-6">
        <CharacterWizard
          submitLabel={current ? 'Replace character' : 'Create character'}
          backLabel="Cancel"
          onBack={() => void navigate(back)}
          onSubmit={submit}
          notice={
            current && (
              <p className="rounded-xl bg-amber-100 px-4 py-3 text-amber-950 dark:bg-amber-500/20 dark:text-amber-100">
                <strong>{current.name}</strong> will be archived. You can still find them under
                Previous characters, or make them active again later.
              </p>
            )
          }
        />
      </main>
    </div>
  );
}
