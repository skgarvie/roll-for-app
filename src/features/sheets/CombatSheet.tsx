import { BedDouble, Coffee, HeartPulse, Pencil, Shield, Skull, Swords } from 'lucide-react';
import { useState } from 'react';
import type { ArmorState, Attack } from '@/domain/character';
import {
  applyDamage,
  applyHealing,
  attackFromWeapon,
  attackStats,
  longRest,
  setCurrentHp,
  setExhaustion,
  setTempHp,
  spendHitDie,
} from '@/domain/combat';
import { ABILITIES, ABILITY_ABBR, type Ability } from '@/domain/data/abilities';
import { ARMOR, CONDITIONS, WEAPONS, weaponData } from '@/domain/data/equipment';
import { formatModifier } from '@/domain/derive';
import { newId } from '@/domain/ids';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';
import { Dialog } from '@/ui/Dialog';
import {
  Chip,
  inputClass,
  NumberField,
  NumberInput,
  Section,
  SelectField,
  Stepper,
} from '@/ui/fields';
import { TextField } from '@/ui/TextField';
import { DerivedStat, SheetHeader } from './components';
import type { CoreEditor } from './coreEditor';
import { HeroicInspiration } from './CoreSheet';

export function CombatSheet({ editor, title }: { editor: CoreEditor; title: string }) {
  const { derived } = editor;
  return (
    <div className="space-y-4">
      <SheetHeader title={title} editor={editor} />
      {derived.exhaustion.dead && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-red-100 px-4 py-3 font-medium text-red-900 dark:bg-red-950/60 dark:text-red-100"
        >
          <Skull className="size-5" aria-hidden />
          Exhaustion level 6: the character dies.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <HitPointsSection editor={editor} />
        <div className="grid grid-cols-2 gap-3 self-start">
          <DerivedStat
            label="Armor Class"
            value={derived.ac}
            overrideKey="ac"
            editor={editor}
            format="number"
          />
          <DerivedStat
            label="Initiative"
            value={derived.initiative}
            overrideKey="initiative"
            editor={editor}
          />
          <DerivedStat
            label="Speed"
            value={derived.speed}
            overrideKey="speed"
            editor={editor}
            format="feet"
            hint="Walking speed before exhaustion. Override for class features such as Fast Movement or Unarmored Movement."
          />
          <DerivedStat
            label="Proficiency"
            value={derived.proficiencyBonus}
            overrideKey="proficiencyBonus"
            editor={editor}
          />
          <div className="col-span-2">
            <HeroicInspiration editor={editor} />
          </div>
        </div>
      </div>

      <ConditionsSection editor={editor} />
      <AttacksSection editor={editor} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ArmorSection editor={editor} />
        <RestSection editor={editor} />
      </div>
    </div>
  );
}

// ─── Hit points ──────────────────────────────────────────────────────────────

function HitPointsSection({ editor }: { editor: CoreEditor }) {
  const { data, derived } = editor;
  const [amount, setAmount] = useState<number | undefined>();
  const [editingCurrent, setEditingCurrent] = useState(false);
  const max = derived.hpMax.value;
  const current = derived.hpCurrent;
  const atZero = max > 0 && current === 0;
  const pct = max > 0 ? Math.round((current / max) * 100) : 0;

  const act = (fn: (n: number) => void) => {
    if (!amount) return;
    fn(amount);
    setAmount(undefined);
  };

  return (
    <Section title="Hit points">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <button
          type="button"
          onClick={() => setEditingCurrent(true)}
          aria-label={`Current hit points ${current}. Edit`}
          className="rounded-xl px-1 text-left hover:bg-stone-100 dark:hover:bg-stone-800"
        >
          <span className="block text-xs font-semibold tracking-wide text-stone-500 uppercase">
            Current
          </span>
          <span
            data-testid="hp-current"
            className={cx('text-5xl font-bold tabular-nums', atZero && 'text-red-600')}
          >
            {current}
          </span>
        </button>
        <div className="pb-1">
          <DerivedStat
            variant="inline"
            label="Max HP"
            value={derived.hpMax}
            overrideKey="hpMax"
            editor={editor}
            format="number"
            hint="Uses fixed averages: the full hit die at level 1, then half the die + 1, plus your CON modifier each level. Enter rolled totals here instead."
          />
          <span className="block text-xs text-stone-500">max</span>
        </div>
        <div className="pb-1">
          <span
            data-testid="hp-temp"
            className="block text-2xl font-semibold text-sky-600 tabular-nums"
          >
            {data.hp.temp > 0 ? `+${data.hp.temp}` : '0'}
          </span>
          <span className="block text-xs text-stone-500">temp</span>
        </div>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800"
        aria-hidden
      >
        <div
          className={cx(
            'h-full rounded-full transition-all',
            pct > 50 ? 'bg-emerald-500' : pct > 25 ? 'bg-amber-500' : 'bg-red-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <form className="mt-4 flex flex-wrap items-center gap-2" onSubmit={(e) => e.preventDefault()}>
        <div className="w-24">
          <NumberInput
            label="Amount"
            placeholder="Amount"
            value={amount}
            onChange={setAmount}
            min={0}
          />
        </div>
        <Button
          variant="danger"
          disabled={!amount}
          onClick={() => act((n) => editor.update((d) => applyDamage(d, n, max)))}
        >
          Damage
        </Button>
        <Button
          className="bg-emerald-600 text-white hover:bg-emerald-500"
          disabled={!amount}
          onClick={() => act((n) => editor.update((d) => applyHealing(d, n, max)))}
        >
          Heal
        </Button>
        <Button
          disabled={!amount}
          onClick={() => act((n) => editor.update((d) => setTempHp(d, n)))}
        >
          Set temp HP
        </Button>
        {data.hp.temp > 0 && (
          <Button variant="ghost" onClick={() => editor.update((d) => setTempHp(d, 0))}>
            Clear temp
          </Button>
        )}
      </form>

      {(atZero || data.deathSaves.successes > 0 || data.deathSaves.failures > 0) && (
        <DeathSaves editor={editor} />
      )}

      {editingCurrent && (
        <CurrentHpDialog editor={editor} onClose={() => setEditingCurrent(false)} />
      )}
    </Section>
  );
}

function CurrentHpDialog({ editor, onClose }: { editor: CoreEditor; onClose: () => void }) {
  const max = editor.derived.hpMax.value;
  const [value, setValue] = useState<number | undefined>(editor.derived.hpCurrent);
  return (
    <Dialog open onClose={onClose} title="Current hit points">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (value !== undefined) editor.update((d) => setCurrentHp(d, value, max));
          onClose();
        }}
      >
        <NumberField
          label="Current HP"
          hint={`Maximum ${max}`}
          value={value}
          onChange={setValue}
          min={0}
          max={max}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function DeathSaves({ editor }: { editor: CoreEditor }) {
  const { successes, failures } = editor.data.deathSaves;
  const set = (key: 'successes' | 'failures', n: number) =>
    editor.update((d) => ({ ...d, deathSaves: { ...d.deathSaves, [key]: n } }));
  const status = failures >= 3 ? 'Dead' : successes >= 3 ? 'Stable' : 'Dying';

  const pips = (key: 'successes' | 'failures', count: number, color: string) =>
    [1, 2, 3].map((i) => (
      <button
        key={i}
        type="button"
        aria-label={`${key === 'successes' ? 'Success' : 'Failure'} ${i}`}
        aria-pressed={count >= i}
        onClick={() => set(key, count >= i ? i - 1 : i)}
        className="inline-flex size-11 items-center justify-center"
      >
        <span
          className={cx(
            'size-6 rounded-full border-2',
            count >= i ? `${color} border-transparent` : 'border-stone-300 dark:border-stone-600',
          )}
        />
      </button>
    ));

  return (
    <div className="mt-4 rounded-xl border border-red-200 p-3 dark:border-red-900">
      <p className="flex items-center gap-2 font-semibold">
        <HeartPulse className="size-5 text-red-600" aria-hidden />
        Death saving throws · <span data-testid="death-status">{status}</span>
      </p>
      <div className="mt-1 flex flex-wrap gap-x-6">
        <div className="flex items-center gap-1">
          <span className="w-20 text-sm text-stone-500">Successes</span>
          {pips('successes', successes, 'bg-emerald-500')}
        </div>
        <div className="flex items-center gap-1">
          <span className="w-20 text-sm text-stone-500">Failures</span>
          {pips('failures', failures, 'bg-red-500')}
        </div>
      </div>
    </div>
  );
}

// ─── Conditions & exhaustion ─────────────────────────────────────────────────

function ConditionsSection({ editor }: { editor: CoreEditor }) {
  const { data, derived } = editor;
  return (
    <Section title="Conditions">
      <ul className="flex flex-wrap gap-2">
        {CONDITIONS.map((c) => {
          const on = data.conditions.includes(c);
          return (
            <li key={c}>
              <Chip
                pressed={on}
                onToggle={() =>
                  editor.update((d) => ({
                    ...d,
                    conditions: on
                      ? d.conditions.filter((x) => x !== c)
                      : CONDITIONS.filter((x) => x === c || d.conditions.includes(x)),
                  }))
                }
              >
                {c}
              </Chip>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-medium">Exhaustion</span>
        <Stepper
          label="Exhaustion level"
          value={data.exhaustion}
          min={0}
          max={6}
          onChange={(n) => editor.update((d) => setExhaustion(d, n))}
        />
        <span className="text-sm text-stone-500">
          {data.exhaustion === 0
            ? 'None'
            : derived.exhaustion.dead
              ? 'Death'
              : `−${derived.exhaustion.d20Penalty} to d20 tests, −${derived.exhaustion.speedPenalty} ft speed`}
        </span>
      </div>
    </Section>
  );
}

// ─── Attacks ─────────────────────────────────────────────────────────────────

function AttacksSection({ editor }: { editor: CoreEditor }) {
  const { data, derived } = editor;
  const [editing, setEditing] = useState<Attack | null>(null);

  const add = (weapon: string) => {
    const attack =
      weapon === 'custom'
        ? {
            id: newId(),
            name: 'Attack',
            ability: 'str' as const,
            proficient: true,
            bonus: 0,
            damage: '',
          }
        : attackFromWeapon(newId(), weapon);
    editor.update((d) => ({ ...d, attacks: [...d.attacks, attack] }));
    if (weapon === 'custom') setEditing(attack);
  };

  return (
    <Section title="Attacks">
      {data.attacks.length === 0 && (
        <p className="mb-3 text-sm text-stone-500">Add your weapons and other attacks.</p>
      )}
      <ul className="mb-3 divide-y divide-stone-100 dark:divide-stone-800">
        {data.attacks.map((attack) => {
          const stats = attackStats(data, derived, attack);
          return (
            <li key={attack.id} className="flex items-center gap-3 py-2">
              <Swords className="size-5 shrink-0 text-stone-400" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{attack.name}</p>
                <p className="text-sm text-stone-500">
                  {stats.damage || 'No damage set'}
                  {attack.notes ? ` · ${attack.notes}` : ''}
                </p>
                {stats.mastery && (
                  <p
                    className={cx(
                      'mt-0.5 text-xs',
                      stats.mastery.known ? 'text-amber-700 dark:text-amber-400' : 'text-stone-400',
                    )}
                    title={stats.mastery.description}
                  >
                    Mastery: {stats.mastery.name}
                    {stats.mastery.known ? ` — ${stats.mastery.description}` : ' (not mastered)'}
                  </p>
                )}
              </div>
              <span
                className="text-xl font-bold tabular-nums"
                aria-label={`${attack.name} to hit ${formatModifier(stats.toHit)}`}
              >
                {formatModifier(stats.toHit)}
              </span>
              <Button
                variant="ghost"
                className="px-3"
                aria-label={`Edit ${attack.name}`}
                onClick={() => setEditing(attack)}
              >
                <Pencil className="size-4" aria-hidden />
              </Button>
            </li>
          );
        })}
      </ul>
      <select
        aria-label="Add attack"
        className={cx(inputClass, 'min-h-11')}
        value=""
        onChange={(e) => e.target.value && add(e.target.value)}
      >
        <option value="">Add an attack…</option>
        <option value="custom">Custom attack</option>
        <optgroup label="Simple weapons">
          {WEAPONS.filter((w) => w.category === 'simple').map((w) => (
            <option key={w.name} value={w.name}>
              {w.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="Martial weapons">
          {WEAPONS.filter((w) => w.category === 'martial').map((w) => (
            <option key={w.name} value={w.name}>
              {w.name}
            </option>
          ))}
        </optgroup>
      </select>
      {editing && (
        <AttackDialog attack={editing} editor={editor} onClose={() => setEditing(null)} />
      )}
    </Section>
  );
}

function AttackDialog({
  attack: initial,
  editor,
  onClose,
}: {
  attack: Attack;
  editor: CoreEditor;
  onClose: () => void;
}) {
  const [a, setA] = useState(initial);
  const set = (patch: Partial<Attack>) => setA((x) => ({ ...x, ...patch }));
  return (
    <Dialog open onClose={onClose} title={`Edit ${initial.name}`}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          editor.update((d) => ({
            ...d,
            attacks: d.attacks.map((x) =>
              x.id === a.id ? { ...a, name: a.name.trim() || 'Attack' } : x,
            ),
          }));
          onClose();
        }}
      >
        <TextField label="Name" value={a.name} onChange={(e) => set({ name: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Weapon (for Mastery)"
            value={a.weapon ?? ''}
            onChange={(e) => set({ weapon: weaponData(e.target.value)?.name })}
          >
            <option value="">None</option>
            {WEAPONS.map((w) => (
              <option key={w.name}>{w.name}</option>
            ))}
          </SelectField>
          <SelectField
            label="Ability"
            value={a.ability}
            onChange={(e) => set({ ability: e.target.value as Ability | 'finesse' })}
          >
            <option value="finesse">STR or DEX (Finesse)</option>
            {ABILITIES.map((ab) => (
              <option key={ab} value={ab}>
                {ABILITY_ABBR[ab]}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Damage dice"
            placeholder="e.g. 1d8"
            value={a.damage}
            onChange={(e) => set({ damage: e.target.value })}
          />
          <TextField
            label="Damage type"
            value={a.damageType ?? ''}
            onChange={(e) => set({ damageType: e.target.value || undefined })}
          />
          <NumberField
            label="Bonus (magic, etc.)"
            value={a.bonus}
            onChange={(n) => set({ bonus: n ?? 0 })}
          />
          <label className="flex min-h-11 items-center gap-2 self-end">
            <input
              type="checkbox"
              className="size-5 accent-amber-500"
              checked={a.proficient}
              onChange={(e) => set({ proficient: e.target.checked })}
            />
            Proficient
          </label>
        </div>
        <TextField
          label="Notes"
          value={a.notes ?? ''}
          onChange={(e) => set({ notes: e.target.value || undefined })}
        />
        <div className="flex flex-wrap justify-between gap-2">
          <Button
            variant="ghost"
            className="text-red-600"
            onClick={() => {
              editor.update((d) => ({ ...d, attacks: d.attacks.filter((x) => x.id !== a.id) }));
              onClose();
            }}
          >
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

// ─── Armor ───────────────────────────────────────────────────────────────────

function ArmorSection({ editor }: { editor: CoreEditor }) {
  const { armor } = editor.data;
  const setArmor = (patch: Partial<ArmorState>, coalesce?: string) =>
    editor.update((d) => ({ ...d, armor: { ...d.armor, ...patch } }), { coalesce });
  const preset =
    armor.type === 'none'
      ? 'none'
      : ARMOR.find((x) => x.name === armor.name)
        ? armor.name
        : 'custom';

  return (
    <Section title="Armor">
      <div className="space-y-3">
        <SelectField
          label="Armor worn"
          value={preset}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'none') setArmor({ name: '', type: 'none', baseAc: 10 });
            else if (v === 'custom') setArmor({ name: 'Custom armor', type: 'light', baseAc: 11 });
            else {
              const found = ARMOR.find((x) => x.name === v)!;
              setArmor({ name: found.name, type: found.type, baseAc: found.baseAc });
            }
          }}
        >
          <option value="none">No armor</option>
          {(['light', 'medium', 'heavy'] as const).map((type) => (
            <optgroup key={type} label={`${type[0]!.toUpperCase()}${type.slice(1)} armor`}>
              {ARMOR.filter((x) => x.type === type).map((x) => (
                <option key={x.name} value={x.name}>
                  {x.name} (AC {x.baseAc})
                </option>
              ))}
            </optgroup>
          ))}
          <option value="custom">Other…</option>
        </SelectField>
        {preset === 'custom' && (
          <div className="grid grid-cols-3 gap-3">
            <TextField
              label="Name"
              value={armor.name}
              onChange={(e) => setArmor({ name: e.target.value }, 'armor-name')}
            />
            <SelectField
              label="Type"
              value={armor.type}
              onChange={(e) => setArmor({ type: e.target.value as ArmorState['type'] })}
            >
              <option value="light">Light</option>
              <option value="medium">Medium</option>
              <option value="heavy">Heavy</option>
            </SelectField>
            <NumberField
              label="Base AC"
              value={armor.baseAc}
              min={0}
              onChange={(n) => setArmor({ baseAc: n ?? 10 }, 'armor-ac')}
            />
          </div>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <Chip pressed={armor.shield} onToggle={() => setArmor({ shield: !armor.shield })}>
            <Shield className="size-4" aria-hidden />
            Shield (+2)
          </Chip>
          <div className="w-32">
            <NumberField
              label="Other AC bonus"
              value={armor.bonus}
              onChange={(n) => setArmor({ bonus: n ?? 0 }, 'armor-bonus')}
            />
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── Rests ───────────────────────────────────────────────────────────────────

function RestSection({ editor }: { editor: CoreEditor }) {
  const { derived } = editor;
  const [dialog, setDialog] = useState<'short' | 'long' | null>(null);
  return (
    <Section title="Hit dice & rests">
      {derived.hitDice.length === 0 ? (
        <p className="text-sm text-stone-500">Add a class to get hit dice.</p>
      ) : (
        <ul className="mb-3 flex flex-wrap gap-4">
          {derived.hitDice.map((p) => (
            <li key={p.die} data-testid={`hit-dice-d${p.die}`}>
              <span className="text-2xl font-bold tabular-nums">{p.total - p.spent}</span>
              <span className="text-stone-500">
                {' '}
                / {p.total} d{p.die}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setDialog('short')}>
          <Coffee className="size-5" aria-hidden />
          Short rest
        </Button>
        <Button onClick={() => setDialog('long')}>
          <BedDouble className="size-5" aria-hidden />
          Long rest
        </Button>
      </div>
      {dialog === 'short' && <ShortRestDialog editor={editor} onClose={() => setDialog(null)} />}
      {dialog === 'long' && (
        <Dialog open onClose={() => setDialog(null)} title="Long rest">
          <p>After a Long Rest you:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>regain all lost hit points and lose any temporary hit points,</li>
            <li>regain all spent hit dice,</li>
            <li>reduce your Exhaustion level by 1,</li>
            <li>reset death saving throws.</li>
          </ul>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                editor.update(longRest);
                setDialog(null);
              }}
            >
              Take long rest
            </Button>
          </div>
        </Dialog>
      )}
    </Section>
  );
}

function ShortRestDialog({ editor, onClose }: { editor: CoreEditor; onClose: () => void }) {
  const { derived } = editor;
  const [rolls, setRolls] = useState<Record<number, number | undefined>>({});
  const con = derived.mods.con;
  return (
    <Dialog open onClose={onClose} title="Short rest">
      <p>
        HP <strong data-testid="short-rest-hp">{derived.hpCurrent}</strong> / {derived.hpMax.value}.
        Spend hit dice to heal: roll the die and enter the result. Your CON modifier (
        {formatModifier(con)}) is added.
      </p>
      <ul className="space-y-3">
        {derived.hitDice.map((p) => {
          const left = p.total - p.spent;
          const roll = rolls[p.die];
          return (
            <li key={p.die} className="flex flex-wrap items-end gap-2">
              <p className="min-w-28 flex-1 font-medium">
                d{p.die}: {left} of {p.total} left
              </p>
              <div className="w-24">
                <NumberInput
                  label={`d${p.die} roll`}
                  placeholder="Roll"
                  value={roll}
                  min={1}
                  max={p.die}
                  onChange={(n) => setRolls((r) => ({ ...r, [p.die]: n }))}
                />
              </div>
              <Button
                disabled={!roll || left === 0}
                onClick={() => {
                  editor.update((d) => spendHitDie(d, derived, p.die, roll!));
                  setRolls((r) => ({ ...r, [p.die]: undefined }));
                }}
              >
                Spend d{p.die}
              </Button>
            </li>
          );
        })}
      </ul>
      <div className="flex justify-end">
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </div>
    </Dialog>
  );
}
