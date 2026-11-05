# RollFor — Implementation Plan

A D&D character sheet Progressive Web App (PWA) for the **2024 rules** (2024 Player's Handbook), built mainly for iPad (Safari, installed to the Home Screen). It is for **personal use by a single player**. Everything is organised by **campaign**. Each campaign has **one main character** (with multiple sheets, including alternate forms such as Wild Shape and companion stat blocks) and multiple session notes that mix typed text with Apple Pencil drawing on an HTML canvas.

```
Campaign ─┬─ Character (one active) ── Sheets (Core, Combat, Spells, …, Forms & Companions)
          └─ Session Note (many) ── Pages ── Strokes + Text blocks
```

---

## 1. Goals & Non-Goals

**Goals (v1)**

- Create, edit, archive, and delete multiple **campaigns**.
- Each campaign has **one active main character**. If that character dies or retires, it can be archived and replaced; archived characters stay readable in the campaign. A character can be copied into a new campaign.
- Each character has several sheets: Core, Combat, Spells, Inventory, Features & Traits, Backstory, Custom, and **Forms & Companions** (Wild Shape, Polymorph, familiars, animal companions, and so on). Companions exist only as stat blocks under their character.
- Derived values are calculated automatically using 2024 rules (modifiers, proficiency, skills, saves, spell DC, and so on), and the user can override any of them.
- Multiple session notes per campaign, with:
  - a canvas for Apple Pencil handwriting and drawing (pressure, palm rejection, undo/redo, eraser)
  - typed text blocks alongside the ink
- Works fully offline and stores data locally on the device.
- Export and import a full backup (JSON).
- Layout tuned for iPad in landscape and portrait, including Split View and Slide Over.

**Non-goals (v1)**

- Accounts, cloud sync, or multiplayer (the data layer leaves room for sync later; see §10).
- DM or party features (party overview, other players' characters, several active characters per campaign).
- Rules other than D&D 2024 (no 2014 5e mode, no other game systems).
- Dice rolling. The app is a sheet and notebook only.
- Importing official content (SRD 5.2 data only, if any).

---

## 2. Tech Stack

| Concern    | Choice                                                                     | Why                                                           |
| ---------- | -------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Build      | **Vite**                                                                   | Fast dev server, first-class PWA plugin                       |
| UI         | **React 19 + TypeScript**                                                  | Large ecosystem, strong typing for the sheet model            |
| Routing    | **React Router** (hash or memory-safe config)                              | Simple; works under the PWA `start_url`                       |
| State      | **Zustand** for UI state, **Dexie live queries** for persisted data        | Little boilerplate; IndexedDB is the single source of truth   |
| Storage    | **IndexedDB via Dexie.js**                                                 | Structured data, binary blobs (thumbnails), schema migrations |
| PWA        | **vite-plugin-pwa** (Workbox)                                              | Generates the manifest and a precaching service worker        |
| Ink        | **Pointer Events + Canvas 2D** with **perfect-freehand** for stroke shapes | Pressure-sensitive, smooth strokes, small library             |
| Styling    | **Tailwind CSS** (or CSS Modules)                                          | Fast work on touch-sized layouts                              |
| Validation | **Zod**                                                                    | Schemas for import/export and migrations                      |
| Tests      | **Vitest** (unit), **Playwright with WebKit** (end-to-end)                 | WebKit is the closest match to iPad Safari                    |

---

## 3. iPad / iOS PWA Considerations (read first)

These limits shape the design, so handle them from day one:

1. **HTTPS is required** for the service worker. For device testing, run `vite --host` with a trusted local certificate (`mkcert`), or use a tunnel such as Cloudflare Tunnel or ngrok.
2. **Installation:** iOS has no `beforeinstallprompt` event. Show a one-time "Share → Add to Home Screen" hint when `navigator.standalone !== true`.
3. **Storage persistence:**
   - Safari can evict script-writable storage for sites that haven't been used for 7 days. Installed Home Screen apps are exempt, so **encourage installing**.
   - Call `navigator.storage.persist()` and show the result in Settings.
   - Storage for the Home Screen app is **separate** from Safari's. Say so in the onboarding screen.
   - Because of all this, **export/backup is a core feature**, not an extra. Add a "last backup" reminder.
4. **Manifest and meta tags:** `display: standalone`, `orientation: any`, `apple-touch-icon` (180×180), `apple-mobile-web-app-status-bar-style`, `viewport-fit=cover`, and `env(safe-area-inset-*)` padding.
5. **Turn off unwanted iOS gestures** on the canvas and on interactive chrome:
   `touch-action: none`, `-webkit-user-select: none`, `-webkit-touch-callout: none`. Also prevent double-tap zoom and the edge-swipe "back" gesture where the browser allows it.
6. **Apple Pencil on the web:**
   - `PointerEvent.pointerType === 'pen'` identifies the Pencil. `pressure`, `tiltX`, `tiltY`, and `altitudeAngle`/`azimuthAngle` are available.
   - Pencil **hover** (M2 and later iPads) sends `pointermove` events with `buttons === 0`. Ignore these for drawing, or use them to show a cursor preview.
   - The Pencil's double-tap and squeeze gestures **are not exposed** to web apps. Provide an on-screen tool switcher instead.
   - Use `getCoalescedEvents()` when available for high-frequency input, and fall back to plain events otherwise.
7. **Canvas memory limits:** iOS Safari caps total canvas memory. Use a moderate backing-store size (cap the canvas DPR scale), release offscreen canvases, and don't keep one huge canvas per note page.
8. **Scribble:** iPadOS Scribble (handwriting turned into text) works in standard `<input>` and `<textarea>` elements. Use real form controls on the sheets so this works for free.

---

## 4. Data Model

All entities have `id: string` (UUID), `createdAt`, `updatedAt`, and `schemaVersion`.

```ts
// Campaigns are the top-level container; every character and note belongs to one
interface Campaign {
  id; name; description?; dmName?;
  coverBlobId?: string;
  archived: boolean;
}

// At most one non-archived character per campaign (enforced in CharacterRepo).
// Archived characters are earlier PCs (dead or retired) kept for reference.
interface Character {
  id; campaignId: string;        // required
  name; portraitBlobId?: string;
  archived: boolean;
  sheetOrder: string[];          // ordered Sheet ids
  activeFormSheetId?: string;    // set while the character is in an alternate form
}

type SheetKind = 'core' | 'combat' | 'spells' | 'inventory' | 'features' | 'backstory' | 'custom' | 'form';

interface Sheet {
  id; characterId; kind: SheetKind; title: string;
  data: CoreSheetData | SpellsSheetData | InventorySheetData | CustomSheetData | FormSheetData | ...; // discriminated by kind
}

interface CoreSheetData {
  classes: { name: string; subclass?: string; level: number; hitDie: number }[]; // multiclass support
  species; size; alignment; xp;
  background: {
    name: string;
    abilityIncreases: Partial<Record<Ability, 1 | 2>>; // 2024: +2/+1 or +1/+1/+1 across the background's three abilities
    originFeat: string;
    skillProficiencies: [Skill, Skill];
    toolProficiency?: string;
  };
  baseAbilities: Record<Ability, number>;             // scores before background increases and feats
  abilityAdjustments: { source: string; ability: Ability; amount: number }[]; // feats, ASIs, epic boons, items
  saveProficiencies: Ability[];
  skills: Record<Skill, 'none' | 'proficient' | 'expertise'>;
  weaponMasteries: string[];                          // 2024 Weapon Mastery choices
  feats: { name: string; category: 'origin' | 'general' | 'fighting-style' | 'epic-boon'; notes?: string }[];
  heroicInspiration: boolean;
  exhaustion: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  overrides: Partial<Record<DerivedKey, number>>;     // manual override of any computed value
  // hp, ac, speed, initiative, conditions, death saves, hit dice...
}

// Alternate forms (Wild Shape beasts, Polymorph targets) and companions (familiars, animal companions, steeds).
// Companions are never top-level entities; they only exist as these sheets under their character.
interface FormSheetData {
  source: 'wild-shape' | 'polymorph' | 'true-polymorph' | 'companion' | 'other';
  creature: string; cr?: string; size; creatureType;
  ac: number; speeds: Partial<Record<'walk' | 'climb' | 'swim' | 'fly' | 'burrow', number>>;
  hp: { max: number; current: number };
  abilities: Record<Ability, number>;
  senses?: string; skills?: Partial<Record<Skill, number>>;
  traits: { name: string; text: string }[];
  actions: { name: string; attackBonus?: number; damage?: string; text: string }[];
  // How the form combines with the character's own sheet (defaults depend on source; see §6.3)
  rules: {
    keepsMentalScores: boolean;       // Wild Shape keeps INT, WIS and CHA
    keepsProficiencies: boolean;      // Wild Shape keeps skill and save proficiencies and uses the character's proficiency bonus
    hpMode: 'own' | 'form';           // Wild Shape: own HP; Polymorph: the form's HP pool
    tempHpOnAssume?: number | 'druid-level' | 'form-hp'; // Wild Shape: druid level; Polymorph: form's HP
  };
}

interface CustomSheetData {      // free-form sheet built from typed fields
  fields: { id; label; type: 'text' | 'number' | 'checkbox' | 'counter' | 'longtext'; value }[];
}

interface SessionNote {
  id; campaignId: string;            // required; a campaign holds many notes
  title; sessionDate: string; sessionNumber?: number;
  pageIds: string[];
  thumbnailBlobId?: string;
  tags: string[];
}

interface NotePage {
  id; noteId; width: number; height: number;   // logical units, height can grow
  background: 'blank' | 'lined' | 'grid' | 'dot';
  textBlocks: { id; x; y; w; html: string }[];  // typed text positioned on the page
}

// Strokes live in their own table so edits stay small and pages load lazily
interface Stroke {
  id; pageId; tool: 'pen' | 'highlighter';
  color: string; size: number; opacity: number;
  points: Float32Array;     // packed [x, y, pressure, x, y, pressure, ...]
  bbox: [minX, minY, maxX, maxY];  // for hit-testing and dirty-rect redraw
  z: number;
}

interface Blob { id; mime; data: Blob; }      // portraits, thumbnails, pasted images
```

**Dexie schema (v1)**

```ts
db.version(1).stores({
  campaigns: 'id, name, archived, updatedAt',
  characters: 'id, campaignId, archived, updatedAt',
  sheets: 'id, characterId, kind',
  sessionNotes: 'id, campaignId, [campaignId+sessionDate], *tags',
  notePages: 'id, noteId',
  strokes: 'id, pageId, [pageId+z]',
  blobs: 'id',
});
```

Deleting a campaign cascades to its characters, sheets, notes, pages, strokes, and blobs inside one Dexie transaction. Ask for confirmation, and offer "Export first".

Make every later schema change an explicit `db.version(n).upgrade(...)` migration. Also version the export format separately so older backups can still be imported.

---

## 5. App Structure

```
src/
  app/            routes, layout shell, providers
  db/             Dexie schema, migrations, repositories (CharacterRepo, NoteRepo, ...)
  domain/         pure 2024 rules: modifiers, proficiency, skills, spell slots, (multi)class tables, form overlays
  features/
    campaigns/    campaign list, campaign home (character + notes)
    characters/   create wizard, replace/archive flow
    sheets/       one component per SheetKind + shared field components
    forms/        alternate-form sheets, form picker, "assume / end form" flow
    notes/        note list, note editor, page view
    ink/          canvas engine (framework-agnostic), tools, toolbar
    settings/     backup/restore, storage status, preferences
  ui/             design-system primitives (Stepper, NumberPad, Toggle, Sheet tabs)
  pwa/            service worker registration, update toast, install hint
```

**Routes**
Because each campaign has one character, the campaign _is_ the main navigation unit. There's no separate character picker.

- `/` — campaign list (cards with cover or character portrait, campaign name, character name, class/level, date of last session)
- `/campaign/:campaignId` — opens straight to the character's sheets, with a tab bar (Core, Combat, Spells, …, Forms) and a **Notes** tab
- `/campaign/:campaignId/s/:sheetId` — a specific sheet
- `/campaign/:campaignId/notes` — session note list
- `/campaign/:campaignId/notes/:noteId` — note editor (full screen)
- `/campaign/:campaignId/history` — archived (earlier) characters, read-only
- `/settings`

Remember the last campaign opened and reopen it on launch.

**Split layout:** in landscape on wide screens, offer a **"Sheet + Notes" two-pane mode** so the player can look at their sheet while writing in the current session note.

---

## 6. Character Sheets

### 6.1 Rules layer (`domain/`, pure functions, fully unit-tested, 2024 rules only)

- **Ability scores:** `score = base + background increases + adjustments` (feats, ASIs, epic boons, items), capped at 20 unless a source allows higher (epic boons go to 30). `abilityMod(score) = floor((score - 10) / 2)`.
- **Background (2024):** the background, not the species, gives the ability increases (+2/+1 or +1/+1/+1 across its three listed abilities), an Origin feat, two skill proficiencies, and a tool proficiency. The character wizard enforces this.
- **Species:** size, speed, and traits only (no ability increases).
- `proficiencyBonus(totalLevel) = 2 + floor((totalLevel - 1) / 4)`
- Skill and save bonuses: ability modifier + proficiency × (0, 1, or 2 for Expertise). Jack of All Trades (Bard) is a feature flag that adds half proficiency to non-proficient checks.
- **Exhaustion (2024):** each level gives −2 to all d20 tests and −5 ft speed; level 6 is death. Show the penalty on affected values.
- **Heroic Inspiration** toggle (replaces 2014 Inspiration).
- **Weapon Mastery:** number of masteries known per class and level; show the mastery property on each attack.
- Subclasses are chosen at level 3 for every class (wizard prompts at level 3).
- Passive Perception and Insight; initiative; spell save DC and spell attack bonus.
- Spell slots by class and level, including the multiclass caster table; Warlock Pact Magic tracked separately.
- HP maximum helper (fixed average or rolled values entered by hand), hit dice pool per die size.
- Every derived value goes through `resolve(key) = overrides[key] ?? computed[key]`.
- Keep class and level tables in data files (`domain/data/*.ts`), not in code, so errata are easy to apply.

### 6.2 Sheet UIs

- **Core:** identity, abilities (big tap targets, with a stepper or number pad), saves, skills (tap to cycle proficiency level), proficiencies, languages.
- **Combat:** HP (current, maximum, temporary) with fast **damage/heal** buttons, AC, speed, initiative, death saves, 2024 conditions (toggle chips) and an exhaustion stepper, attacks list with weapon mastery, hit dice, short/long rest buttons that reset resources. When a form is active, show a banner with the form's name and an "End form" button, and show the form's values (see §6.3).
- **Spells:** slots per level with tap-to-spend pips, prepared spells, concentration flag, a spell list with notes.
- **Inventory:** items (quantity, weight, attuned, equipped), currency, carrying capacity.
- **Features & Traits:** list with limited-use counters (resets on short or long rest).
- **Backstory:** long text fields (Scribble works here).
- **Custom:** user-defined fields.
- **Alternate Forms:** one sheet per form, displayed as a compact stat block (see §6.3).

### 6.3 Alternate forms

A character can have any number of `form` sheets. They are grouped under a single "Forms & Companions" tab (with "Forms" and "Companions" sections), so a druid with eight beasts doesn't get eight top-level tabs.

**Assume a form:** pick a form. The app sets `character.activeFormSheetId`, applies any temporary HP, and switches the Combat view to a **combined view**:

| Value                        | Wild Shape (2024 defaults)                           | Polymorph / True Polymorph                                      | Companion / other        |
| ---------------------------- | ---------------------------------------------------- | --------------------------------------------------------------- | ------------------------ |
| STR, DEX, CON                | Form                                                 | Form                                                            | Form (separate creature) |
| INT, WIS, CHA                | Character                                            | Form                                                            | Form                     |
| AC, speeds, senses, actions  | Form                                                 | Form                                                            | Form                     |
| HP                           | Character's own HP                                   | Form's HP (as temp HP; character's HP returns when it runs out) | Form's own HP pool       |
| Temp HP on assume            | Druid level                                          | Form's HP                                                       | —                        |
| Skill and save proficiencies | Character's, using the character's proficiency bonus | Form's                                                          | Form's                   |
| Class features, feats        | Kept                                                 | Lost                                                            | n/a                      |

- Each row's defaults come from `rules` in `FormSheetData`. Users can change them (house rules) and override any single value.
- Track Wild Shape uses (from the druid level table) as a resource with short/long rest reset.
- **End form:** clears the active form and keeps the character's current HP (and removes leftover temporary HP if the user chooses).
- Companions and familiars are never "assumed". They live only as stat blocks under their character, each with its own HP tracker. The Combat sheet shows a compact card (name, HP, AC) for each companion marked "active".
- Forms and companions can be duplicated, and the character-only export includes them.

### 6.4 UX rules

- Touch targets at least 44×44 pt. Use a numeric keypad (`inputmode="numeric"`) for numbers.
- Autosave: debounce writes (about 300 ms) and show a subtle "Saved" indicator. No save button.
- Undo the last change on a sheet (a small per-sheet history stack).
- Users can reorder, rename, add, and remove sheets per character. Offer templates when creating a character.

---

## 7. Session Notes & Ink Engine

### 7.1 Note list and editor layout

- Notes live under the campaign's Notes tab, listed newest first. Each entry shows a thumbnail, session number, date, and title.
- "New session note" fills in the next session number and today's date.
- Search by title or filter by free-form tags (for example "npc", "loot", "map"). A note can be moved to another campaign.
- Top toolbar in the editor: tool (pen, highlighter, eraser, lasso [v1.1], text, hand/pan), color swatches, size slider, undo/redo, page background, **"Pencil only" toggle** (on by default).
- The page is a fixed-width, vertically growing sheet: it adds height automatically when ink gets near the bottom. Optionally add multiple pages per note.
- Text blocks are positioned `contenteditable` / `<textarea>` overlays above the canvas. Tap with the text tool to create one; drag a block's handle to move it.

### 7.2 Input model (palm rejection)

- If `pointerType === 'pen'`, **draw**.
- If `pointerType === 'touch'` and "Pencil only" is on, **pan or scroll** (one finger), **pinch-zoom** (two fingers). Never draw.
- If `pointerType === 'touch'` and "Pencil only" is off, draw with a finger.
- `pointerType === 'mouse'` draws (for desktop testing).
- Track an active pen `pointerId`. While a pen stroke is active, ignore all touch pointers (palm resting).
- Call `setPointerCapture` on `pointerdown`. Finish the stroke on `pointerup`, `pointercancel`, or `lostpointercapture`.

### 7.3 Rendering pipeline (`features/ink/engine.ts`, independent of React)

Use two stacked canvases per visible page:

1. **Committed layer:** every saved stroke, drawn as filled paths from `perfect-freehand`. Redraw only the dirty rectangle (using stroke bboxes) when something is added or erased.
2. **Live layer:** the stroke currently being drawn, redrawn every `requestAnimationFrame` from buffered points. On `pointerup`, draw it onto the committed layer, clear the live layer, and save the stroke.

Other details:

- Scale the backing store by `min(devicePixelRatio, 2)` and convert pointer coordinates to logical page coordinates (accounting for zoom and pan).
- Map pressure to width through `perfect-freehand` (`thinning`, `smoothing`, `streamline`). The highlighter uses constant width, `globalCompositeOperation = 'multiply'`, and low opacity.
- Zoom and pan: apply a CSS transform while gesturing for 60 fps, then re-render sharply at the new scale when the gesture ends.
- **Only render visible pages**, using virtualization with IntersectionObserver.

### 7.4 Eraser

- **Stroke eraser** (v1): hit-test the eraser path against stroke bboxes, then against point-to-segment distance. Remove whole strokes.
- **Pixel eraser** (v1.1): split strokes at the erased segments.

### 7.5 Undo/redo

- A command stack per note: `AddStroke`, `RemoveStrokes`, `MoveStrokes`, `AddText`, `EditText`, `DeleteText`. Each command has `do` and `undo` methods and writes to Dexie.
- Keep history in memory for the current editing session only.

### 7.6 Persistence

- Save each stroke as its own row when the pen lifts. That's cheap, and nothing is lost if the app is killed.
- Pack points as `Float32Array`, quantized to 0.1 units, to keep IndexedDB rows small.
- When the editor closes or goes idle, render a page thumbnail with `OffscreenCanvas` (or a hidden canvas) and store it as a WebP or PNG blob for the notes list.
- Optional: export a page as PNG or the whole note as PDF (render each page to an image, then use `jsPDF`) in v1.1.

### 7.7 Performance targets

- Under 16 ms from input to visible ink on an iPad Air/Pro (check with Safari Web Inspector over USB).
- A note with 5,000 strokes opens in under 1 s (load strokes per page lazily and draw in chunks).

---

## 8. PWA & Offline

- `vite-plugin-pwa` with `registerType: 'prompt'`: when a new service worker is waiting, show a "Update available — Reload" toast. **Never** reload by itself in the middle of a session.
- Precache the app shell and all static assets. The app makes no runtime network calls in v1.
- Manifest: name "RollFor", icons at 192, 512, and maskable 512, plus a 180 apple-touch-icon and theme/background colors. Also add iPad splash screens (`apple-touch-startup-image`) for common resolutions. These can be generated with `pwa-asset-generator`.
- Settings page shows the storage estimate (`navigator.storage.estimate()`), persistence status, app version, and the export and import buttons.

### Backup / Restore

- **Export:** one `.rollfor.json` file (or a `.zip` that includes blobs) containing all tables, a format version, and the export date. Save it with the Share Sheet (`navigator.share({ files })`) so it can go to the Files app or iCloud Drive, and fall back to a download link.
- **Import:** validate with Zod, migrate older formats, then **merge** (keep the newer `updatedAt`) or **replace**. Show a summary before applying.
- **Per-campaign export** (character, sheets, forms, companions, and notes with ink) for moving a whole campaign between devices.
- **Character-only export** (sheets, forms, and companions, no notes) for bringing a character into a new campaign. On import it creates a new campaign, or replaces the active character in an existing one (the old character is archived).

---

## 9. Milestones

### M0 — Project setup (½–1 day) — ✅ done except the on-device check

- [x] Vite 8 + React 19 + TS 6 + Tailwind 4 + ESLint 10/Prettier + Vitest 4 + Playwright (WebKit).
- [x] vite-plugin-pwa: manifest, generated icons, apple-touch-icon, and iPad splash screens; prompt-based update toast.
- [x] HTTPS dev/preview server via vite-plugin-mkcert (`npm run dev:https`, `npm run preview:https`).
- [x] App shell with safe-area padding, install hint, persistent-storage request, device status panel.
- [x] E2E tests (WebKit, iPad Pro 11 portrait and landscape): shell, manifest, icons and splash screens, offline reload.
- [ ] Install on a real iPad and confirm it launches standalone and works offline (steps in README.md).

### M1 — Data layer, campaigns, and characters (2–3 days)

- Dexie schema, repositories, and `useLiveQuery` hooks.
- Campaign list and campaign home: create, rename, archive, delete (with cascade).
- Creating a campaign starts the character wizard; enforce one active character per campaign; archive-and-replace flow; copy a character into a new campaign.
- `navigator.storage.persist()` and the install hint.

### M2 — Core and Combat sheets, 2024 rules (5–7 days)

- `domain/` 2024 rules and data tables with unit tests.
- Character creation wizard in 2024 order: class → background (ability increases, Origin feat) → species → ability scores.
- Core and Combat sheet UIs, autosave, overrides, sheet tab bar.
- Damage/heal, conditions, exhaustion, Heroic Inspiration, and rest flows.

### M3 — Ink engine prototype (4–6 days) ⚠️ highest risk, so start a spike in parallel with M2

- Standalone canvas page: pen input, pressure, palm rejection, live and committed layers.
- Test on a real iPad with an Apple Pencil: latency, hover, and fast-scribble behavior.
- Undo/redo and the stroke eraser.

### M4 — Session notes (3–5 days)

- Note list under the campaign's Notes tab, with thumbnails, session numbers, dates, tags, and search.
- Note editor that combines the ink engine with text blocks, page backgrounds, auto-growing pages, zoom and pan.
- Save strokes and thumbnails.

### M5 — Remaining sheets and alternate forms (5–7 days)

- Spells (slots, multiclass, Pact Magic), Inventory, Features (with resource counters), Backstory, Custom sheets.
- Alternate Forms: stat block sheet, Forms tab, assume/end flow, combined Combat view, Wild Shape uses, companion HP trackers.
- Reorder, add, and remove sheets per character.

### M6 — Backup, polish, and release (3–4 days)

- Export/import (all data, per campaign, character only), backup reminder.
- Split "Sheet + Notes" mode, safe areas, dark mode, splash screens, update toast.
- Accessibility pass (labels, Dynamic Type-friendly sizes, contrast).
- Deploy as static files to Cloudflare Pages, Netlify, or Vercel (HTTPS).

### v1.1+ candidates

Lasso select/move, pixel eraser, PDF/PNG export, image insert on note pages, SRD 5.2 spell/item/beast lookup (to fill in forms quickly), optional sync (see below).

---

## 10. Future Sync (design now, build later)

- Every row already has a UUID, an `updatedAt`, and a soft-delete flag (add `deletedAt`). That's enough for last-write-wins sync per row.
- Strokes are append-mostly, immutable rows, so they merge cleanly across devices.
- Possible backends: a simple REST API with Postgres, CouchDB/PouchDB, or a CRDT layer (Yjs) if real-time collaboration is ever needed.

---

## 11. Testing Strategy

- **Unit (Vitest):** all of `domain/` (aim for full coverage), including 2024 background increases, exhaustion penalties, multiclass slots, and the form overlay for each source type; repositories (with `fake-indexeddb`), import/export migrations, ink math (hit-testing, coordinate transforms, point packing).
- **Component:** sheet field components and autosave behavior.
- **End-to-end (Playwright WebKit, iPad viewport):** create a campaign → complete the character wizard → edit stats → check derived values; assume Wild Shape → check combined values → end form; create a session note → draw synthetic pen pointer events → reload → strokes are still there; offline reload works.
- **Manual device checklist** (each milestone): installed PWA on iPad, Pencil pressure and hover, palm resting while drawing, rotation, Split View, offline mode, app killed in the middle of a stroke, storage still there after a week.

---

## 12. Key Risks & Mitigations

| Risk                                                 | Mitigation                                                                                               |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| iOS evicts or loses local data                       | Encourage install, call `persist()`, make export easy, show backup reminders                             |
| Ink latency or jank on Safari                        | Live/committed layer split, rAF batching, dirty-rect redraws, capped DPR, early spike on a device (M3)   |
| Canvas memory crashes on long notes                  | Virtualize pages, cap the backing-store size, release offscreen canvases                                 |
| Unwanted gestures (zoom, text selection, back swipe) | CSS `touch-action` / `user-select` rules, `preventDefault` on pointer and gesture events, device testing |
| Service worker update breaks a game in progress      | Prompt-based updates only, never auto-reload                                                             |
| Schema changes break existing data                   | Versioned Dexie migrations, versioned export format, migration tests                                     |

---

## 13. Decisions

1. **Personal, single-player app.** Each campaign has one main character and many session notes. Earlier characters can be archived and replaced.
2. **Multiple sheets includes alternate forms** (Wild Shape, Polymorph) as a `form` SheetKind with a combined Combat view (§6.3).
3. **Companions** exist only as stat blocks under the character they belong to.
4. **No party overview** or other DM/party features.
5. **2024 rules only** (2024 Player's Handbook / SRD 5.2).
6. **No dice roller.**
