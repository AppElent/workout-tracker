# Workout Tracker — Part 3: Active Session, Dashboard, Routines, Progress, Deletes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the live workout logging view (`/log/:sessionId`), all 1RM Convex mutations, the dashboard, routines management, progress charts, and complete cascade-delete flows.

**Architecture:** The active session page is the most complex UI — it shows per-exercise sections with set rows (desktop table) or set cards (mobile), an add-exercise modal, and live 1RM feedback after each completed set. All state lives in Convex (reactive, survives refresh). The `sets.add` mutation calls `oneRepMaxes.calculateAndStore` internally — the UI never does 1RM math directly.

**Tech Stack:** Convex mutations/queries, Recharts, shadcn/ui Sonner (toasts), TanStack Router, date-fns

**Prerequisite:** Parts 1 and 2 complete.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `convex/oneRepMaxes.ts` | Create | listForExercise, getCurrentForExercise, calculateAndStore, addManual |
| `convex/sets.ts` | Create | add, complete, remove mutations |
| `src/routes/log/$sessionId.tsx` | Create | Active session: exercises + set rows, add exercise modal, finish |
| `src/components/session/AddExerciseModal.tsx` | Create | Searchable modal to pick exercises |
| `src/components/session/ExerciseSection.tsx` | Create | Per-exercise section with set rows/cards |
| `src/components/session/SetRow.tsx` | Create | Desktop table row for a set |
| `src/components/session/SetCard.tsx` | Create | Mobile card for a set |
| `src/routes/dashboard/index.tsx` | Create | Recent sessions + top 1RMs + quick-log CTA |
| `convex/routines.ts` | Create | list, create, update, remove, startSession |
| `src/routes/routines/index.tsx` | Create | Routines list + CreateRoutineForm |
| `src/components/routines/RoutineCard.tsx` | Create | Routine card with start button |
| `src/components/routines/CreateRoutineForm.tsx` | Create | Form to build a routine |
| `convex/progress.ts` | Create | weeklyVolume query |
| `src/routes/progress/index.tsx` | Create | 1RM timeline + weekly volume charts |
| `convex/workoutSessions.ts` | Modify | Replace `remove` with cascade + 1RM recalc version |

---

### Task 9: Convex 1RM Mutations

**Files:**
- Create: `convex/oneRepMaxes.ts`

This is a pure data-layer task. All 1RM logic lives here; the UI just calls these functions.

- [ ] **Step 1: Create `convex/oneRepMaxes.ts`**

```ts
import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { calculateOneRepMax } from './lib/oneRepMax';

// All 1RM records for an exercise, ordered newest first
export const listForExercise = query({
  args: { exerciseId: v.id('exercises') },
  handler: async (ctx, { exerciseId }) => {
    return ctx.db
      .query('oneRepMaxes')
      .withIndex('by_exercise', (q) => q.eq('exerciseId', exerciseId))
      .order('desc')
      .collect();
  },
});

// "Current 1RM" rule: most recent manual > highest calculated/actual
export const getCurrentForExercise = query({
  args: { exerciseId: v.id('exercises') },
  handler: async (ctx, { exerciseId }) => {
    const records = await ctx.db
      .query('oneRepMaxes')
      .withIndex('by_exercise', (q) => q.eq('exerciseId', exerciseId))
      .collect();

    if (records.length === 0) return null;

    const manuals = records.filter((r) => r.source === 'manual');
    if (manuals.length > 0) {
      // Most recent manual entry wins
      return manuals.reduce((a, b) => (b.date > a.date ? b : a));
    }
    // Highest value across calculated + actual
    return records.reduce((a, b) => (b.value > a.value ? b : a));
  },
});

// Manual 1RM entry (always takes precedence over calculated)
export const addManual = mutation({
  args: {
    exerciseId: v.id('exercises'),
    value: v.number(),
    unit: v.union(v.literal('kg'), v.literal('lbs')),
    date: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('oneRepMaxes', {
      exerciseId: args.exerciseId,
      value: args.value,
      unit: args.unit,
      date: args.date ?? Date.now(),
      source: 'manual',
    });
  },
});

// Called internally by sets.add — stores a new 1RM only if it beats the current best
export const calculateAndStore = mutation({
  args: {
    exerciseId: v.id('exercises'),
    weight: v.number(),
    reps: v.number(),
    unit: v.union(v.literal('kg'), v.literal('lbs')),
  },
  handler: async (ctx, { exerciseId, weight, reps, unit }) => {
    const { value, source, formula } = calculateOneRepMax(weight, reps);

    // Don't overwrite manual entries
    const existing = await ctx.db
      .query('oneRepMaxes')
      .withIndex('by_exercise', (q) => q.eq('exerciseId', exerciseId))
      .collect();

    const hasManual = existing.some((r) => r.source === 'manual');
    if (hasManual) return null; // manual entries are never overwritten by calculations

    const nonManual = existing.filter((r) => r.source !== 'manual');
    const currentBest = nonManual.length > 0 ? Math.max(...nonManual.map((r) => r.value)) : 0;

    if (value > currentBest) {
      return ctx.db.insert('oneRepMaxes', {
        exerciseId,
        value,
        unit,
        date: Date.now(),
        source,
        formula,
      });
    }
    return null;
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add convex/oneRepMaxes.ts
git commit -m "feat: convex 1RM queries and mutations with manual/calculated priority logic"
```

---

### Task 10: Convex Sets Mutations

**Files:**
- Create: `convex/sets.ts`

- [ ] **Step 1: Create `convex/sets.ts`**

```ts
import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const listForSession = query({
  args: { sessionId: v.id('workoutSessions') },
  handler: async (ctx, { sessionId }) => {
    return ctx.db
      .query('sets')
      .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
      .order('asc')
      .collect();
  },
});

// Add a set and immediately calculate/store 1RM
export const add = mutation({
  args: {
    sessionId: v.id('workoutSessions'),
    exerciseId: v.id('exercises'),
    setNumber: v.number(),
    reps: v.number(),
    weight: v.number(),
    unit: v.union(v.literal('kg'), v.literal('lbs')),
    rpe: v.optional(v.number()),
    setType: v.union(
      v.literal('warmup'),
      v.literal('working'),
      v.literal('drop'),
      v.literal('failure'),
    ),
  },
  handler: async (ctx, args) => {
    const setId = await ctx.db.insert('sets', {
      ...args,
      loggedAt: Date.now(),
    });

    // Trigger 1RM calculation inline (mutations can call other mutations via ctx.runMutation)
    // We inline the logic here to avoid a separate round-trip
    const { calculateOneRepMax } = await import('./lib/oneRepMax');
    const { value, source, formula } = calculateOneRepMax(args.weight, args.reps);

    const existing = await ctx.db
      .query('oneRepMaxes')
      .withIndex('by_exercise', (q) => q.eq('exerciseId', args.exerciseId))
      .collect();

    const hasManual = existing.some((r) => r.source === 'manual');
    if (!hasManual) {
      const nonManual = existing.filter((r) => r.source !== 'manual');
      const currentBest = nonManual.length > 0 ? Math.max(...nonManual.map((r) => r.value)) : 0;
      if (value > currentBest) {
        await ctx.db.insert('oneRepMaxes', {
          exerciseId: args.exerciseId,
          value,
          unit: args.unit,
          date: Date.now(),
          source,
          formula,
        });
      }
    }

    return setId;
  },
});

// Remove a set and recalculate 1RM from remaining sets
export const remove = mutation({
  args: { id: v.id('sets') },
  handler: async (ctx, { id }) => {
    const set = await ctx.db.get(id);
    if (!set) return;

    await ctx.db.delete(id);

    // Recalculate 1RM for this exercise from remaining sets
    const { calculateOneRepMax } = await import('./lib/oneRepMax');

    const orms = await ctx.db
      .query('oneRepMaxes')
      .withIndex('by_exercise', (q) => q.eq('exerciseId', set.exerciseId))
      .collect();

    // Delete all non-manual 1RMs for this exercise
    for (const orm of orms) {
      if (orm.source !== 'manual') await ctx.db.delete(orm._id);
    }

    // Rescan all remaining sets and find best
    const remainingSets = await ctx.db
      .query('sets')
      .withIndex('by_exercise', (q) => q.eq('exerciseId', set.exerciseId))
      .collect();

    let bestValue = 0;
    let bestOrm: {
      value: number;
      source: 'actual' | 'calculated';
      formula?: 'epley';
      unit: 'kg' | 'lbs';
      date: number;
    } | null = null;

    for (const s of remainingSets) {
      if (s.reps < 1 || s.weight <= 0) continue;
      const { value, source, formula } = calculateOneRepMax(s.weight, s.reps);
      if (value > bestValue) {
        bestValue = value;
        bestOrm = { value, source, formula, unit: s.unit, date: s.loggedAt };
      }
    }

    if (bestOrm) {
      await ctx.db.insert('oneRepMaxes', { exerciseId: set.exerciseId, ...bestOrm });
    }
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add convex/sets.ts
git commit -m "feat: sets add/remove mutations with inline 1RM calculation and recalc on delete"
```

---

### Task 11: Active Session Page

**Files:**
- Create: `src/components/session/AddExerciseModal.tsx`
- Create: `src/components/session/SetRow.tsx`
- Create: `src/components/session/SetCard.tsx`
- Create: `src/components/session/ExerciseSection.tsx`
- Create: `src/routes/log/$sessionId.tsx`

- [ ] **Step 1: Create `src/components/session/AddExerciseModal.tsx`**

```tsx
import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { X } from 'lucide-react';

interface Props {
  onSelect: (exerciseId: Id<'exercises'>) => void;
  onClose: () => void;
}

export function AddExerciseModal({ onSelect, onClose }: Props) {
  const exercises = useQuery(api.exercises.list) ?? [];
  const [search, setSearch] = useState('');

  const filtered = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-md rounded-xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-white">Add Exercise</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--text-muted)] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[var(--border)]">
          <input
            autoFocus
            type="search"
            placeholder="Search exercises…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>

        {/* Exercise list */}
        <div className="max-h-72 overflow-y-auto divide-y divide-[var(--border)]">
          {filtered.map((ex) => (
            <button
              key={ex._id}
              type="button"
              onClick={() => onSelect(ex._id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
            >
              <span className="text-sm text-white">{ex.name}</span>
              <span className="text-xs text-[var(--text-muted)] capitalize ml-2">
                {ex.equipment}
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-sm text-[var(--text-muted)] text-center">
              No exercises found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/session/SetRow.tsx`**

Desktop table row for a set. Shows inline 1RM estimate after completing.

```tsx
import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { Doc } from '@convex/_generated/dataModel';
import { Check, Trash2 } from 'lucide-react';
import { calculateOneRepMax } from '#/lib/oneRepMax';

interface Props {
  set: Doc<'sets'>;
  completed: boolean;
  onComplete: (setId: string) => void;
}

const SET_TYPES = ['warmup', 'working', 'drop', 'failure'] as const;

export function SetRow({ set, completed, onComplete }: Props) {
  const removeSet = useMutation(api.sets.remove);
  const orm = calculateOneRepMax(set.weight, set.reps);

  return (
    <tr className={['border-b border-[var(--border)] last:border-0 text-sm', completed ? 'opacity-60' : ''].join(' ')}>
      <td className="py-2 pl-2 pr-3 text-[var(--text-muted)] w-8">{set.setNumber}</td>
      <td className="py-2 pr-3 w-24">
        <span className="text-xs capitalize text-[var(--text-muted)]">{set.setType}</span>
      </td>
      <td className="py-2 pr-3 w-24">
        <span className="text-white font-medium">{set.weight}</span>
        <span className="text-xs text-[var(--text-muted)] ml-0.5">{set.unit}</span>
      </td>
      <td className="py-2 pr-3 w-16">
        <span className="text-white">{set.reps}</span>
      </td>
      <td className="py-2 pr-3 w-16">
        <span className="text-[var(--text-muted)]">{set.rpe ?? '—'}</span>
      </td>
      <td className="py-2 pr-3 w-24">
        {completed ? (
          <span className="text-xs text-[var(--text-muted)]">
            {orm.value} {orm.source === 'calculated' ? 'est.' : 'actual'}
          </span>
        ) : null}
      </td>
      <td className="py-2 pr-2 w-16 flex items-center gap-2 justify-end">
        {!completed && (
          <button
            type="button"
            onClick={() => onComplete(set._id)}
            className="w-7 h-7 rounded-full border border-[var(--accent)]/40 flex items-center justify-center text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black transition-colors"
            aria-label="Complete set"
          >
            <Check size={13} />
          </button>
        )}
        {completed && (
          <Check size={14} className="text-[var(--accent)]" />
        )}
        <button
          type="button"
          onClick={() => void removeSet({ id: set._id })}
          className="p-1 text-[var(--text-muted)] hover:text-red-400 transition-colors"
          aria-label="Delete set"
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );
}
```

- [ ] **Step 3: Create `src/components/session/SetCard.tsx`**

Mobile card for a set (same data as SetRow but stacked).

```tsx
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { Doc } from '@convex/_generated/dataModel';
import { Check, Trash2 } from 'lucide-react';
import { calculateOneRepMax } from '#/lib/oneRepMax';

interface Props {
  set: Doc<'sets'>;
  completed: boolean;
  onComplete: (setId: string) => void;
}

export function SetCard({ set, completed, onComplete }: Props) {
  const removeSet = useMutation(api.sets.remove);
  const orm = calculateOneRepMax(set.weight, set.reps);

  return (
    <div
      className={[
        'rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 flex items-center justify-between gap-3',
        completed ? 'opacity-60' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <span className="text-xs text-[var(--text-muted)] w-5">#{set.setNumber}</span>
        <span className="text-xs text-[var(--text-muted)] capitalize">{set.setType}</span>
        <span className="text-sm text-white font-medium">
          {set.weight}
          <span className="text-xs text-[var(--text-muted)] ml-0.5">{set.unit}</span>
        </span>
        <span className="text-sm text-white">×{set.reps}</span>
        {set.rpe && (
          <span className="text-xs text-[var(--text-muted)]">RPE {set.rpe}</span>
        )}
        {completed && (
          <span className="text-xs text-[var(--text-muted)]">
            {orm.value}{orm.source === 'calculated' ? ' est.' : ''}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {!completed && (
          <button
            type="button"
            onClick={() => onComplete(set._id)}
            className="w-7 h-7 rounded-full border border-[var(--accent)]/40 flex items-center justify-center text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black transition-colors"
            aria-label="Complete set"
          >
            <Check size={13} />
          </button>
        )}
        {completed && <Check size={14} className="text-[var(--accent)]" />}
        <button
          type="button"
          onClick={() => void removeSet({ id: set._id })}
          className="p-1 text-[var(--text-muted)] hover:text-red-400 transition-colors"
          aria-label="Delete set"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/session/ExerciseSection.tsx`**

```tsx
import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { Doc, Id } from '@convex/_generated/dataModel';
import { Plus } from 'lucide-react';
import { SetRow } from './SetRow';
import { SetCard } from './SetCard';

interface Props {
  exerciseId: Id<'exercises'>;
  exerciseName: string;
  sessionId: Id<'workoutSessions'>;
  sets: Doc<'sets'>[];
}

const SET_TYPES = ['warmup', 'working', 'drop', 'failure'] as const;

export function ExerciseSection({ exerciseId, exerciseName, sessionId, sets }: Props) {
  const addSet = useMutation(api.sets.add);

  // Track which sets the user has "completed" (checked off) this session
  // Convex doesn't store completed state — we track it locally per session render
  // In a future version, a `completedAt` field on sets would persist this.
  const [completedSetIds, setCompletedSetIds] = useState<Set<string>>(new Set());

  const [newWeight, setNewWeight] = useState('');
  const [newReps, setNewReps] = useState('');
  const [newRpe, setNewRpe] = useState('');
  const [newSetType, setNewSetType] = useState<'warmup' | 'working' | 'drop' | 'failure'>('working');

  function handleComplete(setId: string) {
    setCompletedSetIds((prev) => new Set([...prev, setId]));
  }

  async function handleAddSet(e: React.FormEvent) {
    e.preventDefault();
    const weight = parseFloat(newWeight);
    const reps = parseInt(newReps, 10);
    if (!weight || !reps) return;

    await addSet({
      sessionId,
      exerciseId,
      setNumber: sets.length + 1,
      reps,
      weight,
      unit: 'kg',
      rpe: newRpe ? parseFloat(newRpe) : undefined,
      setType: newSetType,
    });
    setNewWeight('');
    setNewReps('');
    setNewRpe('');
  }

  return (
    <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-5">
      <h3 className="text-base font-semibold text-white mb-4">{exerciseName}</h3>

      {/* Desktop table */}
      {sets.length > 0 && (
        <div className="hidden sm:block mb-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {['#', 'Type', 'Weight', 'Reps', 'RPE', 'Est. 1RM', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left pb-2 text-xs text-[var(--text-muted)] font-medium pr-3 first:pl-2 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sets.map((set) => (
                <SetRow
                  key={set._id}
                  set={set}
                  completed={completedSetIds.has(set._id)}
                  onComplete={handleComplete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile cards */}
      {sets.length > 0 && (
        <div className="flex sm:hidden flex-col gap-2 mb-4">
          {sets.map((set) => (
            <SetCard
              key={set._id}
              set={set}
              completed={completedSetIds.has(set._id)}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}

      {/* Add set form */}
      <form
        onSubmit={(e) => void handleAddSet(e)}
        className="flex flex-wrap items-end gap-2"
      >
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-[var(--text-muted)] uppercase">Type</label>
          <select
            value={newSetType}
            onChange={(e) => setNewSetType(e.target.value as typeof newSetType)}
            className="h-8 rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          >
            {SET_TYPES.map((t) => (
              <option key={t} value={t} className="capitalize">
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-[var(--text-muted)] uppercase">kg</label>
          <input
            type="number"
            min="0"
            step="0.5"
            placeholder="0"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            className="w-16 h-8 rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-[var(--text-muted)] uppercase">Reps</label>
          <input
            type="number"
            min="1"
            placeholder="0"
            value={newReps}
            onChange={(e) => setNewReps(e.target.value)}
            className="w-14 h-8 rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-[var(--text-muted)] uppercase">RPE</label>
          <input
            type="number"
            min="1"
            max="10"
            step="0.5"
            placeholder="—"
            value={newRpe}
            onChange={(e) => setNewRpe(e.target.value)}
            className="w-14 h-8 rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>
        <button
          type="submit"
          className="h-8 flex items-center gap-1 px-3 rounded border border-[var(--accent)]/40 text-[var(--accent)] text-xs font-medium hover:bg-[var(--accent-dim)] transition-colors"
        >
          <Plus size={13} />
          Add set
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/routes/log/$sessionId.tsx`**

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { useState } from 'react';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { format } from 'date-fns';
import { Plus, CheckCircle, XCircle } from 'lucide-react';
import { AddExerciseModal } from '#/components/session/AddExerciseModal';
import { ExerciseSection } from '#/components/session/ExerciseSection';

export const Route = createFileRoute('/log/$sessionId')({
  component: ActiveSessionPage,
});

function ActiveSessionPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();

  const session = useQuery(api.workoutSessions.getById, {
    id: sessionId as Id<'workoutSessions'>,
  });
  const sets = useQuery(api.sets.listForSession, {
    sessionId: sessionId as Id<'workoutSessions'>,
  }) ?? [];

  const finishSession = useMutation(api.workoutSessions.finish);
  const cancelSession = useMutation(api.workoutSessions.cancel);

  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseOrder, setExerciseOrder] = useState<Id<'exercises'>[]>([]);

  // Derive unique exercise IDs in the order they were first added
  const exerciseIds: Id<'exercises'>[] = [];
  for (const set of sets) {
    if (!exerciseIds.includes(set.exerciseId)) {
      exerciseIds.push(set.exerciseId);
    }
  }
  // Also include any locally-added exercises that have no sets yet
  for (const id of exerciseOrder) {
    if (!exerciseIds.includes(id)) exerciseIds.push(id);
  }

  const exercises = useQuery(api.exercises.list) ?? [];
  const exerciseMap = new Map(exercises.map((ex) => [ex._id as string, ex]));

  function handleExerciseSelect(exerciseId: Id<'exercises'>) {
    setExerciseOrder((prev) => [...prev, exerciseId]);
    setShowAddExercise(false);
  }

  async function handleFinish() {
    await finishSession({ id: sessionId as Id<'workoutSessions'> });
    void navigate({ to: '/dashboard' });
  }

  async function handleCancel() {
    if (!confirm('Cancel this workout? All logged sets will be kept.')) return;
    await cancelSession({ id: sessionId as Id<'workoutSessions'> });
    void navigate({ to: '/log' });
  }

  if (session === undefined) {
    return <div className="p-6 text-[var(--text-muted)] text-sm">Loading…</div>;
  }
  if (session === null) {
    return <div className="p-6 text-red-400 text-sm">Session not found.</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Session header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">
            {session.name ?? 'Workout Session'}
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Started {format(new Date(session.startTime), 'h:mm a · MMM d')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void handleCancel()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] text-xs hover:text-red-400 hover:border-red-400/30 transition-colors"
          >
            <XCircle size={14} />
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleFinish()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent)] text-black text-xs font-bold hover:bg-[var(--accent-hover)] transition-colors"
          >
            <CheckCircle size={14} />
            Finish Workout
          </button>
        </div>
      </div>

      {/* Exercise sections */}
      <div className="flex flex-col gap-4 mb-6">
        {exerciseIds.map((exerciseId) => {
          const exercise = exerciseMap.get(exerciseId as string);
          if (!exercise) return null;
          const exerciseSets = sets.filter((s) => s.exerciseId === exerciseId);
          return (
            <ExerciseSection
              key={exerciseId}
              exerciseId={exerciseId}
              exerciseName={exercise.name}
              sessionId={sessionId as Id<'workoutSessions'>}
              sets={exerciseSets}
            />
          );
        })}
      </div>

      {/* Add exercise button */}
      <button
        type="button"
        onClick={() => setShowAddExercise(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-[var(--border)] text-[var(--text-muted)] text-sm hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition-colors"
      >
        <Plus size={16} />
        Add Exercise
      </button>

      {/* Add exercise modal */}
      {showAddExercise && (
        <AddExerciseModal
          onSelect={handleExerciseSelect}
          onClose={() => setShowAddExercise(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 6: Verify in browser**

Start a free-form session from `/log`. You should be redirected to `/log/:sessionId`. Click "Add Exercise", search for "Squat", select it. The ExerciseSection should appear. Fill in weight/reps and click "Add set". The set should appear as a row (desktop) or card (mobile). Click the ✓ button to complete it. Click "Finish Workout" — should navigate to `/dashboard`.

- [ ] **Step 7: Commit**

```bash
git add convex/sets.ts src/routes/log/ src/components/session/
git commit -m "feat: active session page with exercise sections, set logging, and 1RM completion"
```

---

### Task 12: Dashboard

**Files:**
- Create: `src/routes/dashboard/index.tsx`

- [ ] **Step 1: Create `src/routes/dashboard/index.tsx`**

```tsx
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { Dumbbell } from 'lucide-react';
import { format } from 'date-fns';

export const Route = createFileRoute('/dashboard/')({
  component: DashboardPage,
});

function DashboardPage() {
  const recentSessions = useQuery(api.workoutSessions.listRecent, { limit: 5 }) ?? [];
  const activeSession = useQuery(api.workoutSessions.getActive);
  const exercises = useQuery(api.exercises.list) ?? [];

  // Only show exercises that likely have 1RM data (limit query load — show first 10)
  const topExercises = exercises.slice(0, 10);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* Active session resume banner */}
      {activeSession && (
        <div className="mb-6 rounded-xl bg-[var(--accent-dim)] border border-[var(--accent)]/20 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">
              Active session in progress
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {activeSession.name ?? 'Untitled'} · started{' '}
              {format(new Date(activeSession.startTime), 'h:mm a')}
            </p>
          </div>
          <Link
            to="/log/$sessionId"
            params={{ sessionId: activeSession._id }}
            className="shrink-0 px-4 py-2 rounded-lg bg-[var(--accent)] text-black text-sm font-bold hover:bg-[var(--accent-hover)] transition-colors"
          >
            Resume
          </Link>
        </div>
      )}

      {/* Quick-log CTA */}
      {!activeSession && (
        <div className="mb-8">
          <Link
            to="/log"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--accent)] text-black font-bold text-sm hover:bg-[var(--accent-hover)] transition-colors"
          >
            <Dumbbell size={16} />
            Start Workout
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent sessions */}
        <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Recent Sessions</h2>
          {recentSessions.length > 0 ? (
            <div className="flex flex-col divide-y divide-[var(--border)]">
              {recentSessions.map((session) => (
                <div key={session._id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {session.name ?? 'Untitled Session'}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {format(new Date(session.date), 'EEE, MMM d · h:mm a')}
                    </p>
                  </div>
                  <span
                    className={[
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize',
                      session.status === 'completed'
                        ? 'bg-green-500/10 text-green-400'
                        : session.status === 'active'
                          ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                          : 'bg-white/5 text-[var(--text-muted)]',
                    ].join(' ')}
                  >
                    {session.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              No sessions yet.{' '}
              <Link to="/log" className="text-[var(--accent)]">
                Log your first workout →
              </Link>
            </p>
          )}
        </div>

        {/* Top 1RMs */}
        <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Top 1RMs</h2>
          <div className="flex flex-col divide-y divide-[var(--border)]">
            {topExercises.map((ex) => (
              <ExerciseOrmRow
                key={ex._id}
                exerciseId={ex._id as Id<'exercises'>}
                exerciseName={ex.name}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExerciseOrmRow({
  exerciseId,
  exerciseName,
}: {
  exerciseId: Id<'exercises'>;
  exerciseName: string;
}) {
  const orm = useQuery(api.oneRepMaxes.getCurrentForExercise, { exerciseId });
  if (!orm) return null; // hide exercises with no 1RM data

  return (
    <div className="py-2.5 flex items-center justify-between">
      <Link
        to="/exercises/$id"
        params={{ id: exerciseId }}
        className="text-sm text-white hover:text-[var(--accent)] transition-colors"
      >
        {exerciseName}
      </Link>
      <div className="flex items-center gap-1.5">
        <span className="text-base font-bold text-white">{orm.value}</span>
        <span className="text-xs text-[var(--text-muted)]">{orm.unit}</span>
        <span className="text-[10px] text-[var(--text-muted)] ml-1 capitalize">
          {orm.source === 'calculated' ? 'est.' : orm.source}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/dashboard/
git commit -m "feat: dashboard with recent sessions, top 1RMs, and quick-log CTA"
```

---

### Task 13: Routines

**Files:**
- Create: `convex/routines.ts`
- Create: `src/components/routines/RoutineCard.tsx`
- Create: `src/components/routines/CreateRoutineForm.tsx`
- Create: `src/routes/routines/index.tsx`

- [ ] **Step 1: Create `convex/routines.ts`**

```ts
import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query('routines').order('desc').collect();
  },
});

export const getById = query({
  args: { id: v.id('routines') },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const create = mutation({
  args: {
    name: v.string(),
    exercises: v.array(
      v.object({
        exerciseId: v.id('exercises'),
        defaultSets: v.number(),
        defaultReps: v.number(),
        defaultWeight: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => ctx.db.insert('routines', args),
});

export const remove = mutation({
  args: { id: v.id('routines') },
  handler: async (ctx, { id }) => ctx.db.delete(id),
});

// Create a session pre-populated from a routine template
export const startSession = mutation({
  args: { routineId: v.id('routines') },
  handler: async (ctx, { routineId }) => {
    const routine = await ctx.db.get(routineId);
    if (!routine) throw new Error('Routine not found.');

    const existing = await ctx.db
      .query('workoutSessions')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .first();
    if (existing) throw new Error('A session is already active.');

    const now = Date.now();
    const sessionId = await ctx.db.insert('workoutSessions', {
      date: now,
      startTime: now,
      name: routine.name,
      routineId,
      status: 'active',
    });

    // Pre-populate placeholder sets (weight=0 until user fills them in)
    for (const ex of routine.exercises) {
      for (let s = 1; s <= ex.defaultSets; s++) {
        await ctx.db.insert('sets', {
          sessionId,
          exerciseId: ex.exerciseId,
          setNumber: s,
          reps: ex.defaultReps,
          weight: ex.defaultWeight ?? 0,
          unit: 'kg',
          setType: 'working',
          loggedAt: now,
        });
      }
    }

    return sessionId;
  },
});
```

- [ ] **Step 2: Create `src/components/routines/RoutineCard.tsx`**

```tsx
import { useMutation } from 'convex/react';
import { useNavigate } from '@tanstack/react-router';
import { api } from '@convex/_generated/api';
import type { Doc } from '@convex/_generated/dataModel';
import { Play, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
  routine: Doc<'routines'>;
}

export function RoutineCard({ routine }: Props) {
  const navigate = useNavigate();
  const startSession = useMutation(api.routines.startSession);
  const removeRoutine = useMutation(api.routines.remove);
  const [starting, setStarting] = useState(false);

  async function handleStart() {
    if (starting) return;
    setStarting(true);
    try {
      const sessionId = await startSession({ routineId: routine._id });
      void navigate({ to: '/log/$sessionId', params: { sessionId } });
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-white">{routine.name}</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {routine.exercises.length} exercise{routine.exercises.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void removeRoutine({ id: routine._id })}
          className="p-1.5 text-[var(--text-muted)] hover:text-red-400 transition-colors"
          aria-label="Delete routine"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {routine.exercises.slice(0, 4).map((ex, i) => (
          <span
            key={i}
            className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)]"
          >
            {ex.defaultSets}×{ex.defaultReps}
          </span>
        ))}
        {routine.exercises.length > 4 && (
          <span className="text-[10px] text-[var(--text-muted)]">
            +{routine.exercises.length - 4} more
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => void handleStart()}
        disabled={starting}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[var(--accent)] text-black text-sm font-bold hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
      >
        <Play size={14} />
        {starting ? 'Starting…' : 'Start Workout'}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/routines/CreateRoutineForm.tsx`**

```tsx
import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { Plus, X } from 'lucide-react';

interface ExerciseEntry {
  exerciseId: Id<'exercises'>;
  name: string;
  defaultSets: number;
  defaultReps: number;
  defaultWeight: number | undefined;
}

export function CreateRoutineForm() {
  const createRoutine = useMutation(api.routines.create);
  const exercises = useQuery(api.exercises.list) ?? [];

  const [name, setName] = useState('');
  const [entries, setEntries] = useState<ExerciseEntry[]>([]);
  const [search, setSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const filteredExercises = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(search.toLowerCase()),
  );

  function addExercise(exId: Id<'exercises'>, exName: string) {
    setEntries((prev) => [
      ...prev,
      { exerciseId: exId, name: exName, defaultSets: 3, defaultReps: 8, defaultWeight: undefined },
    ]);
    setShowPicker(false);
    setSearch('');
  }

  function removeEntry(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function updateEntry(index: number, patch: Partial<ExerciseEntry>) {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || entries.length === 0) return;
    await createRoutine({
      name: name.trim(),
      exercises: entries.map(({ exerciseId, defaultSets, defaultReps, defaultWeight }) => ({
        exerciseId,
        defaultSets,
        defaultReps,
        defaultWeight,
      })),
    });
    setName('');
    setEntries([]);
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5 flex flex-col gap-4"
    >
      <h2 className="text-sm font-semibold text-white">Create Routine</h2>

      <input
        type="text"
        placeholder="Routine name (e.g. Push Day A)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        required
      />

      {entries.length > 0 && (
        <div className="flex flex-col gap-2">
          {entries.map((entry, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]"
            >
              <span className="text-sm font-medium text-white flex-1 min-w-[120px]">
                {entry.name}
              </span>
              <label className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                Sets
                <input
                  type="number"
                  min={1}
                  value={entry.defaultSets}
                  onChange={(e) => updateEntry(i, { defaultSets: Number(e.target.value) })}
                  className="w-12 h-7 rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 text-xs text-white text-center"
                />
              </label>
              <label className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                Reps
                <input
                  type="number"
                  min={1}
                  value={entry.defaultReps}
                  onChange={(e) => updateEntry(i, { defaultReps: Number(e.target.value) })}
                  className="w-12 h-7 rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 text-xs text-white text-center"
                />
              </label>
              <label className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                kg
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={entry.defaultWeight ?? ''}
                  onChange={(e) =>
                    updateEntry(i, {
                      defaultWeight: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-14 h-7 rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 text-xs text-white text-center"
                />
              </label>
              <button
                type="button"
                onClick={() => removeEntry(i)}
                className="p-1 text-[var(--text-muted)] hover:text-red-400 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showPicker ? (
        <div className="rounded-lg border border-[var(--border)] overflow-hidden">
          <input
            autoFocus
            type="search"
            placeholder="Search exercises…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 border-b border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none"
          />
          <div className="max-h-48 overflow-y-auto divide-y divide-[var(--border)]">
            {filteredExercises.map((ex) => (
              <button
                key={ex._id}
                type="button"
                onClick={() => addExercise(ex._id, ex.name)}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 transition-colors"
              >
                {ex.name}
                <span className="text-xs text-[var(--text-muted)] ml-2 capitalize">
                  {ex.equipment}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-2 text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
        >
          <Plus size={14} />
          Add Exercise
        </button>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!name.trim() || entries.length === 0}
          className="px-5 py-2 rounded-full bg-[var(--accent)] text-black text-sm font-bold disabled:opacity-40 hover:bg-[var(--accent-hover)] transition-colors"
        >
          Save Routine
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Create `src/routes/routines/index.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { RoutineCard } from '#/components/routines/RoutineCard';
import { CreateRoutineForm } from '#/components/routines/CreateRoutineForm';

export const Route = createFileRoute('/routines/')({
  component: RoutinesPage,
});

function RoutinesPage() {
  const routines = useQuery(api.routines.list) ?? [];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Routines</h1>

      {routines.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {routines.map((routine) => (
            <RoutineCard key={routine._id} routine={routine} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-8 text-center mb-8">
          <p className="text-[var(--text-muted)] text-sm">
            No routines yet. Create your first template below.
          </p>
        </div>
      )}

      <CreateRoutineForm />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add convex/routines.ts src/routes/routines/ src/components/routines/
git commit -m "feat: routines page with create form, RoutineCard, and startSession mutation"
```

---

### Task 14: Progress Charts

**Files:**
- Create: `convex/progress.ts`
- Create: `src/routes/progress/index.tsx`

- [ ] **Step 1: Create `convex/progress.ts`**

```ts
import { query } from './_generated/server';
import { v } from 'convex/values';

// Weekly volume: total kg lifted per calendar week for a specific exercise
export const weeklyVolume = query({
  args: { exerciseId: v.id('exercises') },
  handler: async (ctx, { exerciseId }) => {
    const sets = await ctx.db
      .query('sets')
      .withIndex('by_exercise', (q) => q.eq('exerciseId', exerciseId))
      .collect();

    const weekMap = new Map<string, number>();

    for (const set of sets) {
      const date = new Date(set.loggedAt);
      const year = date.getFullYear();
      const startOfYear = new Date(year, 0, 1);
      const week = Math.ceil(
        ((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7,
      );
      const key = `${year}-W${String(week).padStart(2, '0')}`;
      weekMap.set(key, (weekMap.get(key) ?? 0) + set.weight * set.reps);
    }

    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, volume]) => ({ week, volume: Math.round(volume) }));
  },
});
```

- [ ] **Step 2: Create `src/routes/progress/index.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';

export const Route = createFileRoute('/progress/')({
  component: ProgressPage,
});

function ProgressPage() {
  const exercises = useQuery(api.exercises.list) ?? [];
  const [selectedId, setSelectedId] = useState<Id<'exercises'> | ''>('');

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Progress</h1>

      <div className="mb-6">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value as Id<'exercises'>)}
          className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-white min-w-[240px] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        >
          <option value="">Select an exercise…</option>
          {exercises.map((ex) => (
            <option key={ex._id} value={ex._id}>
              {ex.name}
            </option>
          ))}
        </select>
      </div>

      {selectedId ? (
        <ExerciseCharts exerciseId={selectedId as Id<'exercises'>} />
      ) : (
        <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-10 text-center">
          <p className="text-[var(--text-muted)] text-sm">
            Select an exercise to view your progress charts.
          </p>
        </div>
      )}
    </div>
  );
}

function ExerciseCharts({ exerciseId }: { exerciseId: Id<'exercises'> }) {
  const ormRecords = useQuery(api.oneRepMaxes.listForExercise, { exerciseId }) ?? [];
  const volumeData = useQuery(api.progress.weeklyVolume, { exerciseId }) ?? [];

  const ormChartData = [...ormRecords]
    .sort((a, b) => a.date - b.date)
    .map((r) => ({
      date: format(new Date(r.date), 'MMM d'),
      value: r.value,
      source: r.source,
    }));

  const tooltipStyle = {
    contentStyle: {
      background: '#1a1a1a',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8,
      color: '#fff',
      fontSize: 12,
    },
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1RM timeline */}
      <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5">
        <h2 className="text-sm font-semibold text-white mb-1">1RM Over Time</h2>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Actual + estimated (Epley) records
        </p>
        {ormChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={ormChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#b3b3b3', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#b3b3b3', fontSize: 11 }}
                unit="kg"
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number, _: string, entry: { payload: { source: string } }) => [
                  `${value} kg (${entry.payload.source})`,
                  '1RM',
                ]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#1DB954"
                strokeWidth={2}
                dot={{ fill: '#1DB954', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#1ed760' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-[var(--text-muted)] py-8 text-center">
            No 1RM data yet. Log some sets!
          </p>
        )}
      </div>

      {/* Weekly volume */}
      <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5">
        <h2 className="text-sm font-semibold text-white mb-1">Weekly Volume</h2>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Total kg lifted per week (weight × reps)
        </p>
        {volumeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="week"
                tick={{ fill: '#b3b3b3', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#b3b3b3', fontSize: 11 }}
                unit="kg"
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number) => [`${value} kg`, 'Volume']}
              />
              <Bar dataKey="volume" fill="#1DB954" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-[var(--text-muted)] py-8 text-center">
            No volume data yet.
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add convex/progress.ts src/routes/progress/
git commit -m "feat: progress page with 1RM timeline and weekly volume bar chart"
```

---

### Task 15: Complete Delete Flows

**Files:**
- Modify: `convex/workoutSessions.ts` (replace `remove` mutation with full cascade + 1RM recalc)

The `sets.remove` already does per-set recalc (Task 10). The `exercises.remove` already cascades (Task 6). Only `workoutSessions.remove` needs upgrading to recalculate 1RMs after cascade deleting all sets.

- [ ] **Step 1: Replace the `remove` mutation in `convex/workoutSessions.ts`**

Find the existing `remove` export and replace it entirely:

```ts
export const remove = mutation({
  args: { id: v.id('workoutSessions') },
  handler: async (ctx, { id }) => {
    const { calculateOneRepMax } = await import('./lib/oneRepMax');

    // Collect sets before deleting — need exercise IDs for 1RM recalc
    const sets = await ctx.db
      .query('sets')
      .withIndex('by_session', (q) => q.eq('sessionId', id))
      .collect();

    const exerciseIds = [...new Set(sets.map((s) => s.exerciseId))];

    // Delete all sets
    for (const set of sets) {
      await ctx.db.delete(set._id);
    }

    // Delete session
    await ctx.db.delete(id);

    // For each affected exercise: delete non-manual 1RMs and recompute from remaining sets
    for (const exerciseId of exerciseIds) {
      const orms = await ctx.db
        .query('oneRepMaxes')
        .withIndex('by_exercise', (q) => q.eq('exerciseId', exerciseId))
        .collect();
      for (const orm of orms) {
        if (orm.source !== 'manual') await ctx.db.delete(orm._id);
      }

      const remainingSets = await ctx.db
        .query('sets')
        .withIndex('by_exercise', (q) => q.eq('exerciseId', exerciseId))
        .collect();

      let bestValue = 0;
      let bestOrm: {
        value: number;
        source: 'actual' | 'calculated';
        formula?: 'epley';
        unit: 'kg' | 'lbs';
        date: number;
      } | null = null;

      for (const set of remainingSets) {
        if (set.reps < 1 || set.weight <= 0) continue;
        const { value, source, formula } = calculateOneRepMax(set.weight, set.reps);
        if (value > bestValue) {
          bestValue = value;
          bestOrm = { value, source, formula, unit: set.unit, date: set.loggedAt };
        }
      }

      if (bestOrm) {
        await ctx.db.insert('oneRepMaxes', { exerciseId, ...bestOrm });
      }
    }
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add convex/workoutSessions.ts
git commit -m "feat: session delete with cascade set deletion and 1RM recalculation"
```

---

## Delete Flow Summary

| Entity deleted | Cascade | 1RM effect |
|---|---|---|
| Single set (`sets.remove`) | None | Recalculate 1RM for that exercise from remaining sets |
| Session (`workoutSessions.remove`) | All sets for that session | Recalculate 1RM for every affected exercise |
| Custom exercise (`exercises.remove`) | All sets + all 1RM records | N/A (all records gone) |
| Default exercise | Blocked — throws error | N/A |

---

## Part 3 Complete

All features are now implemented:

- `convex/oneRepMaxes.ts` — 1RM queries and mutations with manual/calculated priority
- `convex/sets.ts` — add/remove with inline 1RM calculation and recalc on delete
- `convex/routines.ts` — list, create, remove, startSession
- `convex/progress.ts` — weekly volume query
- Active session page at `/log/:sessionId` — exercises, set rows/cards, add-exercise modal, finish/cancel
- Dashboard at `/dashboard` — recent sessions, top 1RMs, quick-log CTA
- Routines at `/routines` — RoutineCard with start button, CreateRoutineForm
- Progress at `/progress` — 1RM timeline LineChart + weekly volume BarChart
- Complete delete flows with cascade and 1RM recalculation

**The full workout tracker is now feature-complete for v1.**
