import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import type { CoreSheetData } from '@/domain/character';
import {
  ABILITIES,
  ABILITY_ABBR,
  ABILITY_NAMES,
  ALIGNMENTS,
  POINT_BUY_BUDGET,
  SKILL_INFO,
  SKILLS,
  STANDARD_ARRAY,
  type Ability,
  type Skill,
} from '@/domain/data/abilities';
import { CLASS_NAMES, CLASSES, SUBCLASS_LEVEL } from '@/domain/data/classes';
import { BACKGROUNDS, ORIGIN_FEATS, SPECIES } from '@/domain/data/origins';
import { pointBuyCost } from '@/domain/build';
import { abilityMod, deriveCharacter, formatModifier } from '@/domain/derive';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';
import { Chip, inputClass, NumberField, NumberInput, SelectField, Stepper } from '@/ui/fields';
import { TextField } from '@/ui/TextField';
import {
  backgroundIncreases,
  baseScores,
  classSkillOptions,
  CUSTOM,
  initialWizardState,
  isStepValid,
  selectedBackground,
  selectedClass,
  selectedSpecies,
  STEP_TITLES,
  STEPS,
  wizardCoreData,
  type Step,
  type WizardState,
} from './wizardState';

export interface WizardResult {
  name: string;
  /** Undefined when the player skipped the wizard for a blank sheet. */
  core?: CoreSheetData;
}

export interface CharacterWizardProps {
  submitLabel: string;
  onSubmit: (result: WizardResult) => Promise<void>;
  /** Called from the first step's back button. */
  onBack: () => void;
  backLabel?: string;
  /** Shown above the final step's button (e.g. "X will be archived"). */
  notice?: ReactNode;
}

type Setter = (patch: Partial<WizardState>) => void;

/** 2024 character creation: class → background → species → ability scores → skills → name. */
export function CharacterWizard({
  submitLabel,
  onSubmit,
  onBack,
  backLabel = 'Back',
  notice,
}: CharacterWizardProps) {
  const [state, setState] = useState(initialWizardState);
  const [step, setStep] = useState<Step>('class');
  const [blank, setBlank] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const set: Setter = (patch) => setState((s) => ({ ...s, ...patch }));

  const index = STEPS.indexOf(step);
  const valid = isStepValid(step, state);
  const isLast = step === 'details';

  const goBack = () => {
    setError(undefined);
    if (index === 0) return onBack();
    setStep(blank && step === 'details' ? 'class' : STEPS[index - 1]!);
    if (step === 'details') setBlank(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    if (!isLast) {
      setStep(STEPS[index + 1]!);
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await onSubmit({ name: state.name, core: blank ? undefined : wizardCoreData(state) });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6" aria-label="Create character">
      {!blank && (
        <ol className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li
              key={s}
              aria-current={s === step ? 'step' : undefined}
              className={cx(
                'flex items-center gap-1',
                s === step ? 'font-semibold text-amber-700 dark:text-amber-400' : 'text-stone-500',
              )}
            >
              <span
                className={cx(
                  'inline-flex size-6 items-center justify-center rounded-full text-xs',
                  i < index
                    ? 'bg-amber-500 text-stone-950'
                    : s === step
                      ? 'ring-2 ring-amber-500'
                      : 'ring-1 ring-stone-300 dark:ring-stone-600',
                )}
              >
                {i < index ? <Check className="size-3.5" aria-hidden /> : i + 1}
              </span>
              {STEP_TITLES[s]}
            </li>
          ))}
        </ol>
      )}

      <section className="space-y-5 rounded-2xl bg-white p-6 shadow-sm dark:bg-stone-900">
        <h2 className="text-lg font-semibold">{blank ? 'Blank character' : STEP_TITLES[step]}</h2>
        {step === 'class' && (
          <ClassStep
            state={state}
            set={set}
            onSkip={() => {
              setBlank(true);
              setStep('details');
            }}
          />
        )}
        {step === 'background' && <BackgroundStep state={state} set={set} />}
        {step === 'species' && <SpeciesStep state={state} set={set} />}
        {step === 'abilities' && <AbilitiesStep state={state} set={set} />}
        {step === 'skills' && <SkillsStep state={state} set={set} />}
        {step === 'details' && <DetailsStep state={state} set={set} blank={blank} />}
      </section>

      {isLast && notice}
      {error && (
        <p role="alert" className="font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={goBack}>
          <ChevronLeft className="size-5" aria-hidden />
          {index === 0 ? backLabel : 'Back'}
        </Button>
        <Button type="submit" variant="primary" disabled={!valid || busy}>
          {isLast ? (
            submitLabel
          ) : (
            <>
              Next
              <ChevronRight className="size-5" aria-hidden />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// ─── Shared bits ─────────────────────────────────────────────────────────────

function OptionCard({
  checked,
  onSelect,
  title,
  children,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cx(
        'h-full w-full rounded-xl border-2 p-3 text-left transition-colors',
        checked
          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
          : 'border-stone-200 hover:border-stone-300 dark:border-stone-700',
      )}
    >
      <span className="block font-semibold">{title}</span>
      {children && <span className="block text-sm text-stone-500">{children}</span>}
    </button>
  );
}

const abilityList = (abilities: readonly Ability[]) =>
  abilities.map((a) => ABILITY_ABBR[a]).join(', ');
const skillList = (skills: readonly Skill[]) => skills.map((s) => SKILL_INFO[s].name).join(', ');

// ─── Steps ───────────────────────────────────────────────────────────────────

function ClassStep({
  state,
  set,
  onSkip,
}: {
  state: WizardState;
  set: Setter;
  onSkip: () => void;
}) {
  const listId = useId();
  const cls = selectedClass(state);
  const pick = (classKey: string) => set({ classKey, classSkills: [], subclass: '' });
  return (
    <>
      <div
        role="radiogroup"
        aria-label="Class"
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
      >
        {CLASS_NAMES.map((name) => {
          const c = CLASSES[name];
          return (
            <OptionCard
              key={name}
              checked={state.classKey === name}
              onSelect={() => pick(name)}
              title={name}
            >
              d{c.hitDie} · {c.primaryAbility.map((a) => ABILITY_ABBR[a]).join(' & ')}
            </OptionCard>
          );
        })}
        <OptionCard
          checked={state.classKey === CUSTOM}
          onSelect={() => pick(CUSTOM)}
          title="Other class"
        >
          Homebrew or not in the SRD
        </OptionCard>
      </div>

      {state.classKey === CUSTOM && (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Class name"
            value={state.customClassName}
            onChange={(e) => set({ customClassName: e.target.value })}
            autoComplete="off"
          />
          <SelectField
            label="Hit die"
            value={state.customHitDie}
            onChange={(e) => set({ customHitDie: Number(e.target.value) })}
          >
            {[6, 8, 10, 12].map((d) => (
              <option key={d} value={d}>
                d{d}
              </option>
            ))}
          </SelectField>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-6">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Starting level</p>
          <Stepper
            label="Level"
            value={state.level}
            min={1}
            max={20}
            onChange={(level) => set({ level })}
          />
        </div>
        {state.level >= SUBCLASS_LEVEL && (
          <div className="min-w-56 flex-1">
            <TextField
              label="Subclass"
              hint={`Every class chooses a subclass at level ${SUBCLASS_LEVEL}.`}
              value={state.subclass}
              list={listId}
              autoComplete="off"
              onChange={(e) => set({ subclass: e.target.value })}
            />
            <datalist id={listId}>{cls?.data && <option value={cls.data.srdSubclass} />}</datalist>
          </div>
        )}
      </div>

      <p className="border-t border-stone-200 pt-4 text-sm text-stone-500 dark:border-stone-800">
        Prefer to fill in the sheet yourself?{' '}
        <button
          type="button"
          onClick={onSkip}
          className="font-semibold text-amber-700 underline dark:text-amber-400"
        >
          Skip and start with a blank sheet
        </button>
      </p>
    </>
  );
}

function BackgroundStep({ state, set }: { state: WizardState; set: Setter }) {
  const featListId = useId();
  const bg = selectedBackground(state);
  const pick = (backgroundKey: string) => {
    const data = BACKGROUNDS.find((b) => b.name === backgroundKey);
    set({
      backgroundKey,
      plusTwo: undefined,
      plusOne: undefined,
      originFeat: data?.originFeat ?? '',
      tool: data?.tool ?? '',
    });
  };
  const toggleCustomAbility = (a: Ability) => {
    const has = state.customBackgroundAbilities.includes(a);
    const next = has
      ? state.customBackgroundAbilities.filter((x) => x !== a)
      : [...state.customBackgroundAbilities, a].slice(-3);
    set({
      customBackgroundAbilities: ABILITIES.filter((x) => next.includes(x)),
      plusTwo: undefined,
      plusOne: undefined,
    });
  };

  return (
    <>
      <div role="radiogroup" aria-label="Background" className="grid gap-2 sm:grid-cols-2">
        {BACKGROUNDS.map((b) => (
          <OptionCard
            key={b.name}
            checked={state.backgroundKey === b.name}
            onSelect={() => pick(b.name)}
            title={b.name}
          >
            {abilityList(b.abilities)} · {b.originFeat} · {skillList(b.skills)}
          </OptionCard>
        ))}
        <OptionCard
          checked={state.backgroundKey === CUSTOM}
          onSelect={() => pick(CUSTOM)}
          title="Other background"
        >
          Choose its abilities, feat and skills
        </OptionCard>
      </div>

      {state.backgroundKey === CUSTOM && (
        <div className="space-y-4">
          <TextField
            label="Background name"
            value={state.customBackgroundName}
            onChange={(e) => set({ customBackgroundName: e.target.value })}
            autoComplete="off"
          />
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-stone-700 dark:text-stone-300">
              Its three abilities
            </legend>
            <div className="flex flex-wrap gap-2">
              {ABILITIES.map((a) => (
                <Chip
                  key={a}
                  pressed={state.customBackgroundAbilities.includes(a)}
                  onToggle={() => toggleCustomAbility(a)}
                >
                  {ABILITY_NAMES[a]}
                </Chip>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <SelectField
                key={i}
                label={`Skill proficiency ${i + 1}`}
                value={state.customBackgroundSkills[i] ?? ''}
                onChange={(e) => {
                  const skills = [...state.customBackgroundSkills];
                  skills[i] = e.target.value as Skill;
                  set({ customBackgroundSkills: skills.filter(Boolean), classSkills: [] });
                }}
              >
                <option value="">Choose…</option>
                {SKILLS.map((s) => (
                  <option key={s} value={s}>
                    {SKILL_INFO[s].name}
                  </option>
                ))}
              </SelectField>
            ))}
          </div>
        </div>
      )}

      {bg && bg.abilities.length === 3 && (
        <fieldset className="space-y-3">
          <legend className="mb-2 font-medium">Ability score increases</legend>
          <div
            role="radiogroup"
            aria-label="Increase pattern"
            className="grid gap-2 sm:grid-cols-2"
          >
            <OptionCard
              checked={state.increaseMode === 'two-one'}
              onSelect={() => set({ increaseMode: 'two-one' })}
              title="+2 and +1"
            >
              Two of {abilityList(bg.abilities)}
            </OptionCard>
            <OptionCard
              checked={state.increaseMode === 'three-ones'}
              onSelect={() =>
                set({ increaseMode: 'three-ones', plusTwo: undefined, plusOne: undefined })
              }
              title="+1 to all three"
            >
              {abilityList(bg.abilities)}
            </OptionCard>
          </div>
          {state.increaseMode === 'two-one' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium text-stone-700 dark:text-stone-300">+2 to</p>
                <div className="flex flex-wrap gap-2">
                  {bg.abilities.map((a) => (
                    <Chip
                      key={a}
                      pressed={state.plusTwo === a}
                      onToggle={() =>
                        set({
                          plusTwo: a,
                          plusOne: state.plusOne === a ? undefined : state.plusOne,
                        })
                      }
                    >
                      <span className="sr-only">+2 to </span>
                      {ABILITY_NAMES[a]}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-stone-700 dark:text-stone-300">+1 to</p>
                <div className="flex flex-wrap gap-2">
                  {bg.abilities
                    .filter((a) => a !== state.plusTwo)
                    .map((a) => (
                      <Chip
                        key={a}
                        pressed={state.plusOne === a}
                        onToggle={() => set({ plusOne: a })}
                      >
                        <span className="sr-only">+1 to </span>
                        {ABILITY_NAMES[a]}
                      </Chip>
                    ))}
                </div>
              </div>
            </div>
          )}
        </fieldset>
      )}

      {bg && (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Origin feat"
            value={state.originFeat}
            list={featListId}
            autoComplete="off"
            onChange={(e) => set({ originFeat: e.target.value })}
          />
          <datalist id={featListId}>
            {ORIGIN_FEATS.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
          <TextField
            label="Tool proficiency"
            value={state.tool}
            autoComplete="off"
            onChange={(e) => set({ tool: e.target.value })}
          />
        </div>
      )}
    </>
  );
}

function SpeciesStep({ state, set }: { state: WizardState; set: Setter }) {
  const species = selectedSpecies(state);
  const pick = (speciesKey: string) => {
    const data = SPECIES.find((s) => s.name === speciesKey);
    set({ speciesKey, size: data?.sizes[0] ?? 'Medium', speed: data?.speed ?? 30 });
  };
  return (
    <>
      <div
        role="radiogroup"
        aria-label="Species"
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
      >
        {SPECIES.map((s) => (
          <OptionCard
            key={s.name}
            checked={state.speciesKey === s.name}
            onSelect={() => pick(s.name)}
            title={s.name}
          >
            {s.sizes.join(' or ')} · {s.speed} ft
            {s.darkvision ? ` · Darkvision ${s.darkvision} ft` : ''}
          </OptionCard>
        ))}
        <OptionCard
          checked={state.speciesKey === CUSTOM}
          onSelect={() => pick(CUSTOM)}
          title="Other species"
        >
          Homebrew or not in the SRD
        </OptionCard>
      </div>
      <p className="text-sm text-stone-500">
        In the 2024 rules your species gives size, speed and traits. Ability increases come from
        your background.
      </p>
      {species && (
        <div className="grid gap-3 sm:grid-cols-3">
          {state.speciesKey === CUSTOM && (
            <TextField
              label="Species name"
              value={state.customSpeciesName}
              autoComplete="off"
              onChange={(e) => set({ customSpeciesName: e.target.value })}
            />
          )}
          {(!species.sizes || species.sizes.length > 1) && (
            <SelectField
              label="Size"
              value={state.size}
              onChange={(e) => set({ size: e.target.value as WizardState['size'] })}
            >
              {(species.sizes ?? ['Small', 'Medium']).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </SelectField>
          )}
          <NumberField
            label="Speed (ft)"
            value={state.speed}
            min={0}
            onChange={(speed) => set({ speed: speed ?? 0 })}
          />
        </div>
      )}
    </>
  );
}

function AbilitiesStep({ state, set }: { state: WizardState; set: Setter }) {
  const increases = backgroundIncreases(state);
  const cost = pointBuyCost(state.pointBuy) ?? 0;
  const used = new Map<number, number>();
  for (const a of ABILITIES) {
    const v = state.standard[a];
    if (v !== undefined) used.set(v, (used.get(v) ?? 0) + 1);
  }
  const base = (a: Ability) =>
    state.method === 'pointBuy'
      ? state.pointBuy[a]
      : state.method === 'standard'
        ? state.standard[a]
        : state.manual[a];

  return (
    <>
      <div role="radiogroup" aria-label="Method" className="grid gap-2 sm:grid-cols-3">
        <OptionCard
          checked={state.method === 'standard'}
          onSelect={() => set({ method: 'standard' })}
          title="Standard array"
        >
          {STANDARD_ARRAY.join(', ')}
        </OptionCard>
        <OptionCard
          checked={state.method === 'pointBuy'}
          onSelect={() => set({ method: 'pointBuy' })}
          title="Point buy"
        >
          {POINT_BUY_BUDGET} points, scores 8–15
        </OptionCard>
        <OptionCard
          checked={state.method === 'manual'}
          onSelect={() => set({ method: 'manual' })}
          title="Rolled / manual"
        >
          Enter your own scores
        </OptionCard>
      </div>
      {state.method === 'pointBuy' && (
        <p className={cx('font-medium', cost > POINT_BUY_BUDGET && 'text-red-600')} role="status">
          Points spent: {cost} / {POINT_BUY_BUDGET}
        </p>
      )}

      <table className="w-full text-left">
        <thead className="text-xs tracking-wide text-stone-500 uppercase">
          <tr>
            <th className="py-2 font-semibold">Ability</th>
            <th className="py-2 font-semibold">Base</th>
            <th className="py-2 text-center font-semibold">Background</th>
            <th className="py-2 text-center font-semibold">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
          {ABILITIES.map((a) => {
            const b = base(a);
            const inc = increases[a] ?? 0;
            const final = b !== undefined ? b + inc : undefined;
            return (
              <tr key={a}>
                <th scope="row" className="py-2 pr-2 font-medium">
                  {ABILITY_NAMES[a]}
                </th>
                <td className="py-2 pr-2">
                  {state.method === 'standard' && (
                    <select
                      aria-label={`${ABILITY_NAMES[a]} score`}
                      className={cx(inputClass, 'min-h-11 w-28')}
                      value={state.standard[a] ?? ''}
                      onChange={(e) =>
                        set({
                          standard: {
                            ...state.standard,
                            [a]: e.target.value ? Number(e.target.value) : undefined,
                          },
                        })
                      }
                    >
                      <option value="">—</option>
                      {STANDARD_ARRAY.map((v) => (
                        <option key={v} value={v}>
                          {v}
                          {state.standard[a] !== v && used.has(v) ? ' (used)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  {state.method === 'pointBuy' && (
                    <Stepper
                      label={`${ABILITY_NAMES[a]} score`}
                      value={state.pointBuy[a]}
                      min={8}
                      max={15}
                      onChange={(v) => set({ pointBuy: { ...state.pointBuy, [a]: v } })}
                    />
                  )}
                  {state.method === 'manual' && (
                    <div className="w-24">
                      <NumberInput
                        label={`${ABILITY_NAMES[a]} score`}
                        value={state.manual[a]}
                        min={1}
                        max={20}
                        onChange={(v) => set({ manual: { ...state.manual, [a]: v } })}
                      />
                    </div>
                  )}
                </td>
                <td className="py-2 text-center text-stone-500">{inc ? `+${inc}` : '—'}</td>
                <td className="py-2 text-center">
                  {final !== undefined ? (
                    <>
                      <span className="text-lg font-bold" data-testid={`wizard-score-${a}`}>
                        {final}
                      </span>{' '}
                      <span className="text-sm text-stone-500">
                        ({formatModifier(abilityMod(final))})
                      </span>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {state.method === 'standard' && baseScores(state) === undefined && (
        <p className="text-sm text-stone-500">Use each number of the standard array once.</p>
      )}
    </>
  );
}

function SkillsStep({ state, set }: { state: WizardState; set: Setter }) {
  const { count, from } = classSkillOptions(state);
  const cls = selectedClass(state);
  const bgSkills = selectedBackground(state)?.skills ?? [];
  const chosen = state.classSkills.filter((s) => from.includes(s));
  const limited = !!cls?.data;
  const toggle = (s: Skill) =>
    set({
      classSkills: chosen.includes(s) ? chosen.filter((x) => x !== s) : [...chosen, s],
    });
  return (
    <>
      <p>
        From your background: <strong>{skillList(bgSkills) || 'none'}</strong>.
      </p>
      <p role="status">
        {limited
          ? `Choose ${count} ${cls.name} skill${count === 1 ? '' : 's'} (${chosen.length}/${count}).`
          : 'Choose your class skill proficiencies.'}
      </p>
      <div className="flex flex-wrap gap-2">
        {from.map((s) => {
          const on = chosen.includes(s);
          const disabled = limited && !on && chosen.length >= count;
          return (
            <Chip
              key={s}
              pressed={on}
              onToggle={() => !disabled && toggle(s)}
              className={disabled ? 'opacity-40' : undefined}
            >
              {SKILL_INFO[s].name}
            </Chip>
          );
        })}
      </div>
    </>
  );
}

function DetailsStep({ state, set, blank }: { state: WizardState; set: Setter; blank: boolean }) {
  const core = blank ? undefined : wizardCoreData(state);
  const derived = core ? deriveCharacter(core) : undefined;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Character name"
          value={state.name}
          onChange={(e) => set({ name: e.target.value })}
          required
          autoFocus
          autoComplete="off"
        />
        {!blank && (
          <SelectField
            label="Alignment"
            hint="Optional"
            value={state.alignment}
            onChange={(e) => set({ alignment: e.target.value })}
          >
            <option value="">—</option>
            {ALIGNMENTS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </SelectField>
        )}
      </div>
      {blank && (
        <p className="text-stone-500">
          The character starts with empty sheets. You can fill in class, background and scores on
          the Core sheet.
        </p>
      )}
      {core && derived && (
        <dl className="grid gap-x-6 gap-y-2 rounded-xl bg-stone-100 p-4 sm:grid-cols-2 dark:bg-stone-800">
          <Summary term="Class">
            {core.classes.map((c) => `${c.name} ${c.level}${c.subclass ? ` (${c.subclass})` : ''}`)}
          </Summary>
          <Summary term="Background">
            {core.background.name}
            {core.background.originFeat ? ` · ${core.background.originFeat}` : ''}
          </Summary>
          <Summary term="Species">
            {core.species} ({core.size}, {core.baseSpeed} ft)
          </Summary>
          <Summary term="Hit points">{derived.hpMax.total}</Summary>
          <Summary term="Abilities">
            {ABILITIES.map((a) => `${ABILITY_ABBR[a]} ${derived.scores[a].total}`).join(' · ')}
          </Summary>
          <Summary term="Skills">
            {skillList(
              Object.entries(core.skills)
                .filter(([, p]) => p !== 'none')
                .map(([s]) => s as Skill),
            )}
          </Summary>
        </dl>
      )}
    </>
  );
}

function Summary({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-stone-500 uppercase">{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}
