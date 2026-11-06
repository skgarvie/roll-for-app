import { Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { useId, useState } from 'react';
import type {
  AbilityAdjustment,
  ClassEntry,
  Feat,
  FeatCategory,
  Proficiency,
} from '@/domain/character';
import {
  ABILITIES,
  ABILITY_ABBR,
  ABILITY_NAMES,
  ALIGNMENTS,
  SIZES,
  SKILL_INFO,
  SKILLS,
  type Ability,
  type Size,
  type Skill,
} from '@/domain/data/abilities';
import { CLASS_NAMES, classData, SUBCLASS_LEVEL } from '@/domain/data/classes';
import { WEAPONS } from '@/domain/data/equipment';
import { BACKGROUNDS, ORIGIN_FEATS, SPECIES } from '@/domain/data/origins';
import { classSummary, formatModifier } from '@/domain/derive';
import { newId } from '@/domain/ids';
import { Button, IconButton } from '@/ui/Button';
import { cx } from '@/ui/cx';
import { Dialog } from '@/ui/Dialog';
import { Chip, inputClass, NumberField, Section, SelectField, Stepper } from '@/ui/fields';
import { TextField } from '@/ui/TextField';
import { DerivedStat, SheetHeader } from './components';
import type { CoreEditor } from './coreEditor';

export function CoreSheet({ editor, title }: { editor: CoreEditor; title: string }) {
  const { data, derived } = editor;
  return (
    <div className="space-y-4">
      <SheetHeader
        title={title}
        subtitle={
          [classSummary(data.classes), data.species, data.background.name]
            .filter(Boolean)
            .join(' · ') || undefined
        }
        editor={editor}
      />
      <IdentitySection editor={editor} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <DerivedStat
          label="Proficiency"
          value={derived.proficiencyBonus}
          overrideKey="proficiencyBonus"
          editor={editor}
        />
        <DerivedStat
          label="Passive Perception"
          value={derived.passivePerception}
          overrideKey="passivePerception"
          editor={editor}
          format="number"
        />
        <DerivedStat
          label="Passive Insight"
          value={derived.passiveInsight}
          overrideKey="passiveInsight"
          editor={editor}
          format="number"
        />
        <DerivedStat
          label="Passive Investigation"
          value={derived.passiveInvestigation}
          overrideKey="passiveInvestigation"
          editor={editor}
          format="number"
        />
        <HeroicInspiration editor={editor} />
      </div>

      <AbilitiesSection editor={editor} />

      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        <div className="space-y-4">
          <SavesSection editor={editor} />
          <SpellcastingSection editor={editor} />
        </div>
        <SkillsSection editor={editor} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FeatsSection editor={editor} />
        <WeaponMasterySection editor={editor} />
      </div>
      <ProficienciesSection editor={editor} />
    </div>
  );
}

export function HeroicInspiration({ editor }: { editor: CoreEditor }) {
  const on = editor.data.heroicInspiration;
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => editor.update((d) => ({ ...d, heroicInspiration: !d.heroicInspiration }))}
      className={cx(
        'flex min-h-20 w-full flex-col items-center justify-center gap-1 rounded-xl border px-3 py-2 transition-colors',
        on
          ? 'border-amber-500 bg-amber-100 text-amber-950 dark:bg-amber-500/20 dark:text-amber-100'
          : 'border-stone-200 text-stone-500 dark:border-stone-700',
      )}
    >
      <span className="text-xs font-semibold tracking-wide uppercase">Heroic Inspiration</span>
      <Sparkles className={cx('size-6', on ? 'fill-amber-400 text-amber-600' : '')} aria-hidden />
    </button>
  );
}

// ─── Identity ────────────────────────────────────────────────────────────────

function IdentitySection({ editor }: { editor: CoreEditor }) {
  const { data, derived } = editor;
  const [editingClasses, setEditingClasses] = useState(false);
  const listId = useId();
  const needsSubclass = data.classes.filter(
    (c) => c.level >= SUBCLASS_LEVEL && !c.subclass?.trim(),
  );

  const setText = (field: 'species' | 'alignment', value: string) =>
    editor.update((d) => ({ ...d, [field]: value }), { coalesce: field });

  return (
    <Section
      title="Character"
      actions={
        <Button variant="ghost" className="min-h-9" onClick={() => setEditingClasses(true)}>
          <Pencil className="size-4" aria-hidden />
          Classes
        </Button>
      }
    >
      <p className="text-lg font-semibold">
        {classSummary(data.classes) || 'No class yet'}
        <span className="ml-2 text-base font-normal text-stone-500">
          Level {derived.totalLevel}
        </span>
      </p>
      {needsSubclass.length > 0 && (
        <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-950 dark:bg-amber-500/20 dark:text-amber-100">
          Choose a subclass for {needsSubclass.map((c) => c.name).join(' and ')} (level{' '}
          {SUBCLASS_LEVEL}).{' '}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => setEditingClasses(true)}
          >
            Choose subclass
          </button>
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextField
          label="Species"
          value={data.species}
          list={`${listId}-species`}
          autoComplete="off"
          onChange={(e) => setText('species', e.target.value)}
        />
        <datalist id={`${listId}-species`}>
          {SPECIES.map((s) => (
            <option key={s.name} value={s.name} />
          ))}
        </datalist>
        <SelectField
          label="Size"
          value={data.size}
          onChange={(e) => editor.update((d) => ({ ...d, size: e.target.value as Size }))}
        >
          {SIZES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </SelectField>
        <SelectField
          label="Alignment"
          value={data.alignment}
          onChange={(e) => setText('alignment', e.target.value)}
        >
          <option value="">—</option>
          {ALIGNMENTS.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </SelectField>
        <NumberField
          label="Experience points"
          value={data.xp}
          min={0}
          onChange={(xp) => editor.update((d) => ({ ...d, xp: xp ?? 0 }), { coalesce: 'xp' })}
        />
      </div>

      <BackgroundSummary editor={editor} />

      {editingClasses && <ClassesDialog editor={editor} onClose={() => setEditingClasses(false)} />}
    </Section>
  );
}

function BackgroundSummary({ editor }: { editor: CoreEditor }) {
  const { background } = editor.data;
  const listId = useId();
  const increases = ABILITIES.filter((a) => background.abilityIncreases[a])
    .map((a) => `${ABILITY_ABBR[a]} +${background.abilityIncreases[a]}`)
    .join(', ');
  const setBg = (patch: Partial<typeof background>, key: string) =>
    editor.update((d) => ({ ...d, background: { ...d.background, ...patch } }), {
      coalesce: key,
    });

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <TextField
        label="Background"
        value={background.name}
        list={`${listId}-bg`}
        autoComplete="off"
        onChange={(e) => setBg({ name: e.target.value }, 'bg-name')}
      />
      <datalist id={`${listId}-bg`}>
        {BACKGROUNDS.map((b) => (
          <option key={b.name} value={b.name} />
        ))}
      </datalist>
      <TextField
        label="Origin feat"
        value={background.originFeat}
        list={`${listId}-feat`}
        autoComplete="off"
        onChange={(e) => setBg({ originFeat: e.target.value }, 'bg-feat')}
      />
      <datalist id={`${listId}-feat`}>
        {ORIGIN_FEATS.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
          Background increases
        </p>
        <p className="min-h-11 py-2.5">{increases || '—'}</p>
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Background skills</p>
        <p className="min-h-11 py-2.5">
          {background.skillProficiencies.map((s) => SKILL_INFO[s].name).join(', ') || '—'}
        </p>
      </div>
    </div>
  );
}

function ClassesDialog({ editor, onClose }: { editor: CoreEditor; onClose: () => void }) {
  const [classes, setClasses] = useState<ClassEntry[]>(() =>
    editor.data.classes.length ? editor.data.classes : [{ name: '', level: 1, hitDie: 8 }],
  );
  const listId = useId();
  const set = (i: number, patch: Partial<ClassEntry>) =>
    setClasses((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const total = classes.reduce((s, c) => s + c.level, 0);

  return (
    <Dialog open onClose={onClose} title="Classes">
      <datalist id={`${listId}-classes`}>
        {CLASS_NAMES.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <ul className="space-y-4">
        {classes.map((c, i) => {
          const known = classData(c.name);
          return (
            <li
              key={i}
              className="space-y-3 rounded-xl border border-stone-200 p-3 dark:border-stone-700"
            >
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <TextField
                    label={i === 0 ? 'Class' : `Class ${i + 1}`}
                    value={c.name}
                    list={`${listId}-classes`}
                    autoComplete="off"
                    onChange={(e) => {
                      const cd = classData(e.target.value);
                      set(i, { name: e.target.value, ...(cd ? { hitDie: cd.hitDie } : {}) });
                    }}
                  />
                </div>
                {classes.length > 1 && (
                  <IconButton
                    label={`Remove ${c.name || 'class'}`}
                    onClick={() => setClasses((cs) => cs.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="size-5" aria-hidden />
                  </IconButton>
                )}
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Level</p>
                  <Stepper
                    label={`${c.name || 'Class'} level`}
                    value={c.level}
                    min={1}
                    max={20}
                    onChange={(level) => set(i, { level })}
                  />
                </div>
                <SelectField
                  label="Hit die"
                  value={c.hitDie}
                  disabled={!!known}
                  onChange={(e) => set(i, { hitDie: Number(e.target.value) })}
                >
                  {[6, 8, 10, 12].map((d) => (
                    <option key={d} value={d}>
                      d{d}
                    </option>
                  ))}
                </SelectField>
              </div>
              {c.level >= SUBCLASS_LEVEL && (
                <>
                  <TextField
                    label="Subclass"
                    value={c.subclass ?? ''}
                    list={`${listId}-sub-${i}`}
                    autoComplete="off"
                    onChange={(e) => set(i, { subclass: e.target.value })}
                  />
                  <datalist id={`${listId}-sub-${i}`}>
                    {known && <option value={known.srdSubclass} />}
                  </datalist>
                </>
              )}
            </li>
          );
        })}
      </ul>
      <Button
        onClick={() => setClasses((cs) => [...cs, { name: '', level: 1, hitDie: 8 }])}
        disabled={total >= 20}
      >
        <Plus className="size-5" aria-hidden />
        Add class (multiclass)
      </Button>
      <p className="text-sm text-stone-500">
        Total level {total}. Saving throw proficiencies come from your first class only.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={total > 20 || classes.some((c) => !c.name.trim())}
          onClick={() => {
            const cleaned = classes.map((c) => ({
              ...c,
              name: classData(c.name)?.name ?? c.name.trim(),
              subclass: c.level >= SUBCLASS_LEVEL ? c.subclass?.trim() || undefined : undefined,
            }));
            editor.update((d) => ({ ...d, classes: cleaned }));
            onClose();
          }}
        >
          Save
        </Button>
      </div>
    </Dialog>
  );
}

// ─── Abilities ───────────────────────────────────────────────────────────────

function AbilitiesSection({ editor }: { editor: CoreEditor }) {
  const [open, setOpen] = useState<Ability | null>(null);
  const { derived } = editor;
  return (
    <Section title="Ability scores">
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {ABILITIES.map((a) => {
          const score = derived.scores[a];
          return (
            <li key={a}>
              <button
                type="button"
                onClick={() => setOpen(a)}
                aria-label={`${ABILITY_NAMES[a]} ${score.total}, modifier ${formatModifier(derived.mods[a])}. Edit`}
                className="flex w-full flex-col items-center rounded-xl border border-stone-200 py-3 hover:border-amber-400 dark:border-stone-700"
              >
                <span className="text-xs font-semibold tracking-wide text-stone-500">
                  {ABILITY_ABBR[a]}
                </span>
                <span className="text-3xl font-bold tabular-nums" data-testid={`mod-${a}`}>
                  {formatModifier(derived.mods[a])}
                </span>
                <span
                  className="mt-1 rounded-full bg-stone-100 px-3 text-sm font-semibold tabular-nums dark:bg-stone-800"
                  data-testid={`score-${a}`}
                >
                  {score.total}
                  {score.overridden && <span className="text-amber-600"> ✎</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {open && <AbilityDialog ability={open} editor={editor} onClose={() => setOpen(null)} />}
    </Section>
  );
}

function AbilityDialog({
  ability,
  editor,
  onClose,
}: {
  ability: Ability;
  editor: CoreEditor;
  onClose: () => void;
}) {
  const { data, derived } = editor;
  const score = derived.scores[ability];
  const adjustments = data.abilityAdjustments.filter((a) => a.ability === ability);
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState<number | undefined>(1);
  const [raisesCap, setRaisesCap] = useState(false);
  const bgIncrease = data.background.abilityIncreases[ability] ?? 0;

  const addAdjustment = () => {
    if (!amount) return;
    const adj: AbilityAdjustment = {
      id: newId(),
      source: source.trim() || 'Adjustment',
      ability,
      amount,
      ...(raisesCap ? { maxScore: 30 } : {}),
    };
    editor.update((d) => ({ ...d, abilityAdjustments: [...d.abilityAdjustments, adj] }));
    setSource('');
    setAmount(1);
    setRaisesCap(false);
  };

  const setOverride = (v: number | undefined) =>
    editor.update(
      (d) => {
        const overrides = { ...d.overrides };
        if (v === undefined) delete overrides[`score.${ability}`];
        else overrides[`score.${ability}`] = v;
        return { ...d, overrides };
      },
      { coalesce: `override-${ability}` },
    );

  return (
    <Dialog open onClose={onClose} title={ABILITY_NAMES[ability]}>
      <div className="flex items-center justify-between gap-4">
        <p className="font-medium">Base score</p>
        <Stepper
          label={`${ABILITY_NAMES[ability]} base score`}
          value={data.baseAbilities[ability]}
          min={1}
          max={30}
          onChange={(v) =>
            editor.update((d) => ({ ...d, baseAbilities: { ...d.baseAbilities, [ability]: v } }), {
              coalesce: `base-${ability}`,
            })
          }
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <p className="font-medium">Background increase</p>
        <select
          aria-label="Background increase"
          className={cx(inputClass, 'min-h-11 w-24')}
          value={bgIncrease}
          onChange={(e) => {
            const v = Number(e.target.value) as 0 | 1 | 2;
            editor.update((d) => {
              const abilityIncreases = { ...d.background.abilityIncreases };
              if (v) abilityIncreases[ability] = v;
              else delete abilityIncreases[ability];
              return { ...d, background: { ...d.background, abilityIncreases } };
            });
          }}
        >
          <option value={0}>—</option>
          <option value={1}>+1</option>
          <option value={2}>+2</option>
        </select>
      </div>

      <div className="space-y-2">
        <p className="font-medium">Feats, ASIs, boons and items</p>
        {adjustments.length === 0 && <p className="text-sm text-stone-500">None.</p>}
        <ul className="space-y-1">
          {adjustments.map((adj) => (
            <li key={adj.id} className="flex items-center gap-2">
              <span className="flex-1">
                {adj.source} <strong>{formatModifier(adj.amount)}</strong>
                {adj.maxScore && (
                  <span className="text-sm text-stone-500"> (max {adj.maxScore})</span>
                )}
              </span>
              <IconButton
                label={`Remove ${adj.source}`}
                onClick={() =>
                  editor.update((d) => ({
                    ...d,
                    abilityAdjustments: d.abilityAdjustments.filter((x) => x.id !== adj.id),
                  }))
                }
              >
                <X className="size-5" aria-hidden />
              </IconButton>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-40 flex-1">
            <TextField
              label="Source"
              placeholder="e.g. Ability Score Improvement"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </div>
          <div className="w-20">
            <NumberField label="Amount" value={amount} onChange={setAmount} min={-10} max={10} />
          </div>
          <Button onClick={addAdjustment} disabled={!amount}>
            Add
          </Button>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-5 accent-amber-500"
            checked={raisesCap}
            onChange={(e) => setRaisesCap(e.target.checked)}
          />
          Can raise the score above 20 (up to 30, e.g. an Epic Boon)
        </label>
      </div>

      <div className="flex items-end justify-between gap-4 rounded-xl bg-stone-100 p-3 dark:bg-stone-800">
        <div>
          <p className="text-sm text-stone-500">Score</p>
          <p className="text-2xl font-bold">
            {score.total}{' '}
            <span className="text-base font-medium text-stone-500">
              ({formatModifier(derived.mods[ability])})
            </span>
          </p>
          {score.overridden && (
            <p className="text-sm text-stone-500">Calculated {score.computed}</p>
          )}
        </div>
        <div className="w-28">
          <NumberField
            label="Override"
            value={score.overridden ? score.value : undefined}
            placeholder={String(score.computed)}
            min={1}
            max={30}
            onChange={setOverride}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </div>
    </Dialog>
  );
}

// ─── Saves & skills ──────────────────────────────────────────────────────────

const NEXT_PROFICIENCY: Record<Proficiency, Proficiency> = {
  none: 'proficient',
  proficient: 'expertise',
  expertise: 'none',
};

function ProficiencyMark({ level }: { level: Proficiency }) {
  return (
    <span
      aria-hidden
      className={cx(
        'inline-flex size-5 items-center justify-center rounded-full border-2',
        level === 'none' ? 'border-stone-300 dark:border-stone-600' : 'border-amber-500',
      )}
    >
      {level !== 'none' && (
        <span
          className={cx(
            'rounded-full bg-amber-500',
            level === 'expertise' ? 'size-3 ring-2 ring-amber-500 ring-offset-1' : 'size-2.5',
          )}
        />
      )}
    </span>
  );
}

const PROFICIENCY_LABEL: Record<Proficiency, string> = {
  none: 'not proficient',
  proficient: 'proficient',
  expertise: 'expertise',
};

function SavesSection({ editor }: { editor: CoreEditor }) {
  const { data, derived } = editor;
  return (
    <Section title="Saving throws">
      <ul className="divide-y divide-stone-100 dark:divide-stone-800">
        {ABILITIES.map((a) => {
          const proficient = data.saveProficiencies.includes(a);
          return (
            <li key={a} className="flex items-center gap-2">
              <button
                type="button"
                aria-pressed={proficient}
                aria-label={`${ABILITY_NAMES[a]} save proficiency`}
                onClick={() =>
                  editor.update((d) => ({
                    ...d,
                    saveProficiencies: proficient
                      ? d.saveProficiencies.filter((x) => x !== a)
                      : ABILITIES.filter((x) => x === a || d.saveProficiencies.includes(x)),
                  }))
                }
                className="flex min-h-11 flex-1 items-center gap-3 rounded-lg px-1 text-left hover:bg-stone-50 dark:hover:bg-stone-800/50"
              >
                <ProficiencyMark level={proficient ? 'proficient' : 'none'} />
                {ABILITY_NAMES[a]}
              </button>
              <DerivedStat
                variant="inline"
                label={`${ABILITY_NAMES[a]} save`}
                value={derived.saves[a]}
                overrideKey={`save.${a}`}
                editor={editor}
              />
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function SkillsSection({ editor }: { editor: CoreEditor }) {
  const { data, derived } = editor;
  return (
    <Section
      title="Skills"
      actions={
        derived.jackOfAllTrades ? (
          <span className="text-xs text-stone-500">Jack of All Trades</span>
        ) : undefined
      }
    >
      <ul className="divide-y divide-stone-100 dark:divide-stone-800">
        {SKILLS.map((s: Skill) => {
          const level = data.skills[s];
          const info = SKILL_INFO[s];
          return (
            <li key={s} className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`${info.name}: ${PROFICIENCY_LABEL[level]}. Change proficiency`}
                onClick={() =>
                  editor.update((d) => ({
                    ...d,
                    skills: { ...d.skills, [s]: NEXT_PROFICIENCY[d.skills[s]] },
                  }))
                }
                className="flex min-h-11 flex-1 items-center gap-3 rounded-lg px-1 text-left hover:bg-stone-50 dark:hover:bg-stone-800/50"
              >
                <ProficiencyMark level={level} />
                <span>
                  {info.name}{' '}
                  <span className="text-xs text-stone-400">{ABILITY_ABBR[info.ability]}</span>
                </span>
              </button>
              <DerivedStat
                variant="inline"
                label={info.name}
                value={derived.skills[s]}
                overrideKey={`skill.${s}`}
                editor={editor}
              />
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-stone-500">
        Tap a skill to cycle: not proficient → proficient → expertise.
      </p>
    </Section>
  );
}

function SpellcastingSection({ editor }: { editor: CoreEditor }) {
  const { derived } = editor;
  if (derived.spellcasting.length === 0) return null;
  return (
    <Section title="Spellcasting">
      <ul className="space-y-3">
        {derived.spellcasting.map((s) => (
          <li key={s.ability}>
            <p className="mb-2 text-sm text-stone-500">
              {s.classes.join(', ')} · {ABILITY_NAMES[s.ability]}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <DerivedStat
                label="Spell save DC"
                value={s.saveDc}
                overrideKey={`spellDc.${s.ability}`}
                editor={editor}
                format="number"
              />
              <DerivedStat
                label="Spell attack"
                value={s.attack}
                overrideKey={`spellAttack.${s.ability}`}
                editor={editor}
              />
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ─── Feats, masteries, proficiencies ─────────────────────────────────────────

const FEAT_CATEGORIES: Record<FeatCategory, string> = {
  origin: 'Origin',
  general: 'General',
  'fighting-style': 'Fighting Style',
  'epic-boon': 'Epic Boon',
};

function FeatsSection({ editor }: { editor: CoreEditor }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<FeatCategory>('general');
  const listId = useId();
  const add = () => {
    if (!name.trim()) return;
    const feat: Feat = { id: newId(), name: name.trim(), category };
    editor.update((d) => ({ ...d, feats: [...d.feats, feat] }));
    setName('');
  };
  return (
    <Section title="Feats">
      {editor.data.feats.length === 0 && <p className="text-sm text-stone-500">No feats yet.</p>}
      <ul className="mb-3 divide-y divide-stone-100 dark:divide-stone-800">
        {editor.data.feats.map((f) => (
          <li key={f.id} className="flex min-h-11 items-center gap-2">
            <span className="flex-1">
              {f.name} <span className="text-xs text-stone-500">{FEAT_CATEGORIES[f.category]}</span>
            </span>
            <IconButton
              label={`Remove ${f.name}`}
              onClick={() =>
                editor.update((d) => ({ ...d, feats: d.feats.filter((x) => x.id !== f.id) }))
              }
            >
              <X className="size-5" aria-hidden />
            </IconButton>
          </li>
        ))}
      </ul>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <div className="min-w-40 flex-1">
          <TextField
            label="New feat"
            value={name}
            list={listId}
            autoComplete="off"
            onChange={(e) => setName(e.target.value)}
          />
          <datalist id={listId}>
            {ORIGIN_FEATS.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>
        <SelectField
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as FeatCategory)}
        >
          {Object.entries(FEAT_CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </SelectField>
        <Button type="submit" disabled={!name.trim()}>
          Add feat
        </Button>
      </form>
    </Section>
  );
}

function WeaponMasterySection({ editor }: { editor: CoreEditor }) {
  const { data, derived } = editor;
  const limit = derived.weaponMasteryLimit;
  const known = data.weaponMasteries;
  if (limit === 0 && known.length === 0) return null;
  const available = WEAPONS.filter((w) => !known.includes(w.name));
  return (
    <Section title={`Weapon Mastery (${known.length}/${limit})`}>
      <ul className="mb-3 flex flex-wrap gap-2">
        {known.map((name) => (
          <li key={name}>
            <Chip
              pressed
              onToggle={() =>
                editor.update((d) => ({
                  ...d,
                  weaponMasteries: d.weaponMasteries.filter((m) => m !== name),
                }))
              }
            >
              {name}{' '}
              <span className="text-xs">{WEAPONS.find((w) => w.name === name)?.mastery}</span>
              <X className="size-4" aria-label={`Remove ${name}`} />
            </Chip>
          </li>
        ))}
      </ul>
      <select
        aria-label="Add weapon mastery"
        className={cx(inputClass, 'min-h-11')}
        value=""
        disabled={known.length >= limit && limit > 0}
        onChange={(e) => {
          const name = e.target.value;
          if (name) editor.update((d) => ({ ...d, weaponMasteries: [...d.weaponMasteries, name] }));
        }}
      >
        <option value="">
          {known.length >= limit ? 'All masteries chosen' : 'Add a weapon mastery…'}
        </option>
        {available.map((w) => (
          <option key={w.name} value={w.name}>
            {w.name} ({w.mastery})
          </option>
        ))}
      </select>
    </Section>
  );
}

function ProficienciesSection({ editor }: { editor: CoreEditor }) {
  const { proficiencies } = editor.data;
  const fields = [
    ['armor', 'Armor training'],
    ['weapons', 'Weapons'],
    ['tools', 'Tools'],
    ['languages', 'Languages'],
  ] as const;
  return (
    <Section title="Proficiencies & languages">
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(([key, label]) => (
          <TextField
            key={key}
            label={label}
            multiline
            rows={2}
            value={proficiencies[key]}
            onChange={(e) =>
              editor.update(
                (d) => ({ ...d, proficiencies: { ...d.proficiencies, [key]: e.target.value } }),
                { coalesce: `prof-${key}` },
              )
            }
          />
        ))}
      </div>
    </Section>
  );
}
