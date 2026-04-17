Design a detailed implementation plan for a full-featured workout tracker SPA. I've already explored the codebase — here's the full context.

## Spec Summary
Full spec at: D:\Dev\workout-tracker\docs\superpowers\specs\2026-04-16-workout-tracker-design.md

Key requirements:
- TanStack Router SPA (file-based routing, router-only)
- Convex real-time DB (NO Convex yet — needs installing)
- shadcn/ui (NOT installed yet)
- TanStack Form + Zod (frontend validation only; Convex validators for DB)
- TanStack Table (exercise library)
- Recharts (1RM timeline, volume charts)
- Biome (NOT configured yet)
- Spotify dark aesthetic: bg #000, surface #1a1a1a, accent #1DB954, text #fff/#b3b3b3

### Routes needed:
- / — Standalone intro page (no shell), Spotify dark, green glow blobs
- /dashboard — Recent sessions, quick-log CTA, top 1RMs
- /log — Start new session (free-form or from routine)
- /log/:sessionId — Active session (exercises + inline set rows / mobile cards)
- /exercises — TanStack Table with filters
- /exercises/:id — Exercise detail, 1RM chart, set history
- /routines — Create/edit/start routines
- /progress — 1RM timeline + weekly volume charts

### Data model:

exercises: { name, muscleGroups[], category, equipment, notes?, isDefault, userId? }
workoutSessions: { date, startTime, name?, routineId?, notes?, status, completedAt?, userId? }
sets: { sessionId, exerciseId, setNumber, reps, weight, unit, rpe?, setType, loggedAt }
oneRepMaxes: { exerciseId, value, unit, date, source, formula?, userId? }
routines: { name, exercises[{ exerciseId, defaultSets, defaultReps, defaultWeight? }], userId? }
### 1RM Logic:
- reps==1 → source:"actual", use weight directly
- reps>1 → Epley: weight * (1 + reps/30), source:"calculated"
- Only store if > current max
- Manual entries never overwritten by calculations
- "Current 1RM" query: most recent manual > highest calculated/actual

### Navigation shell (all pages except /):
- Desktop: collapsible left sidebar with nav links
- Mobile: fixed bottom tab bar
- Both contain links to: /dashboard, /log, /exercises, /routines, /progress

## Current Codebase State
The TanStack CLI scaffold was run but the add-ons (Convex, shadcn/ui, Biome, TanStack Form, Table, Recharts) were NOT actually installed. Existing files:

src/
  routes/__root.tsx      ← needs full rewrite (add ConvexProvider + AppShell)
  routes/index.tsx       ← needs full rewrite (Spotify intro page)
  routes/about.tsx       ← can be deleted
  main.tsx               ← minimal change (may need ConvexProvider wrapper here)
  router.tsx             ← no change needed
  routeTree.gen.ts       ← auto-generated, never edit
  styles.css             ← needs dark theme CSS vars added
  components/
    Header.tsx           ← delete (replaced by Sidebar/BottomTabBar)
    Footer.tsx           ← delete
    ThemeToggle.tsx      ← delete
No convex/ directory. No shadcn/ui (no components.json). No Biome config.

## Design the plan with these specifics:

1. **Task 0: Install deps** — exact npm commands for convex, shadcn/ui init, biome, @tanstack/react-form, @tanstack/react-table, recharts, zod. Include npx convex dev init step. Include npx shadcn@latest init for Tailwind v4. Include adding Biome config.

2. **Task 1: Convex schema** — full schema.ts code with all 5 tables and indexes. Include .env.example entry for VITE_CONVEX_URL.

3. **Task 2: Seed data** — full seed.ts with 60-80 exercises across: Powerlifting (Squat, Bench, Deadlift, RDL, Front Squat), Olympic (Clean & Jerk, Snatch, Power Clean), Upper Push (OHP, DB Press, Dips, Push-ups, Incline Bench), Upper Pull (Pull-ups, Barbell Row, Cable Row, Face Pull, Lat Pulldown), Legs (Leg Press, Lunges, Leg Curl, Leg Extension, Calf Raises), Arms (Bicep Curl, Tricep Pushdown, Hammer Curl, Skull Crushers), Core (Plank, Ab Wheel, Cable Crunch, Hanging Leg Raise).

4. **Task 3: 1RM utility** (TDD) — src/lib/oneRepMax.ts pure functions + src/lib/oneRepMax.test.ts with vitest tests. Tests: reps=1 returns weight, reps=10 at 100kg = 133.3kg Epley.

5. **Task 4: Root layout rewrite** — src/routes/__root.tsx with: import ConvexProvider from 'convex/react', connect to VITE_CONVEX_URL, AppShell component that shows sidebar on desktop / bottom tabs on mobile. Active session redirect logic (query for any active workoutSession, redirect to /log/:sessionId). Offline connectivity banner.

6. **Task 5: Intro page** — standalone layout (no AppShell), full-screen black bg, two green glow blobs (CSS), inline top nav, hero content anchored to bottom. Include npx getdesign@latest add spotify step for DESIGN.md.

7. **Task 6: Exercise Library** — Convex queries (listExercises, createExercise), TanStack Table with columns, client-side filters (muscleGroup, category, equipment), search by name, AddExerciseForm with TanStack Form + Zod.

8. **Task 7: Exercise Detail** — Convex query for exercise history (sets by exerciseId across sessions), current 1RM display with source label, Recharts LineChart of 1RM over time.

9. **Task 8: Workout Logging — Session Start** — /log page: shows "Resume active session" banner if session exists, otherwise form to start free-form or from routine. Convex mutation createSession (enforces only-one-active constraint).

10. **Task 9: Active Session** — /log/:sessionId page: AddExerciseModal (searchable), ExerciseSection per exercise, SetRow (desktop table) / SetCard (mobile), "+ Add set" button, set completion with ✓ button that triggers 1RM calculation mutation, "Finish Workout" button.

11. **Task 10: Convex 1RM mutations** — convex/oneRepMaxes.ts with: calculateAndStore(sessionId, exerciseId, weight, reps, unit) mutation. getCurrentOneRepMax(exerciseId) query using the "manual → highest calculated/actual" rule.

12. **Task 11: Dashboard** — Recent sessions (last 5), top 1RMs per exercise (from oneRepMaxes), quick-log CTA button → /log.

13. **Task 12: Routines** — List routines, RoutineCard with "Start Workout" button (creates session pre-populated with exercises), CreateRoutineForm (add exercises from library, set defaults). Convex mutations: createRoutine, deleteRoutine, startRoutineSession.

14. **Task 13: Progress** — Exercise selector dropdown, OneRepMaxChart (Recharts LineChart: date x-axis, 1RM y-axis), VolumeChart (BarChart: week x-axis, total kg y-axis, computed from sets).

15. **Task 14: Delete flows** — deleteSet mutation (recalculate 1RM after), deleteSession mutation (cascade delete sets, recalculate 1RMs), deleteExercise mutation (isDefault check, cascade sets + 1RMs).

For EACH task provide:
- Exact files to create/modify
- Complete code (no placeholders, no TBD)
- Commands to run with expected output
- git commit message

The plan should assume the developer knows React but not Convex or TanStack ecosystem specifically. Include enough inline code that they don't need to guess at API shapes.


Read 15 files, ran 8 commands
Used ToolSearch
query: select:Write
max_results: 1

No matching deferred tools found
convex/oneRepMaxes.ts (continued)
import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { calculateOneRepMax } from './lib/oneRepMax';

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

export const getCurrentForExercise = query({
  args: { exerciseId: v.id('exercises') },
  handler: async (ctx, { exerciseId }) => {
    const records = await ctx.db
      .query('oneRepMaxes')
      .withIndex('by_exercise', (q) => q.eq('exerciseId', exerciseId))
      .collect();

    if (records.length === 0) return null;

    // Manual priority rule
    const manuals = records.filter((r) => r.source === 'manual');
    if (manuals.length > 0) {
      return manuals.reduce((a, b) => (b.date > a.date ? b : a));
    }
    return records.reduce((a, b) => (b.value > a.value ? b : a));
  },
});

export const addManual = mutation({
  args: {
    exerciseId: v.id('exercises'),
    value: v.number(),
    unit: v.union(v.literal('kg'), v.literal('lbs')),
    date: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('oneRepMaxes', {
      exerciseId: args.exerciseId,
      value: args.value,
      unit: args.unit,
      date: args.date ?? Date.now(),
      source: 'manual',
    });
  },
});

// Called by sets.add internally — exported for direct use if needed
export const calculateAndStore = mutation({
  args: {
    exerciseId: v.id('exercises'),
    weight: v.number(),
    reps: v.number(),
    unit: v.union(v.literal('kg'), v.literal('lbs')),
  },
  handler: async (ctx, { exerciseId, weight, reps, unit }) => {
    const { value, source, formula } = calculateOneRepMax(weight, reps);

    const existingNonManual = await ctx.db
      .query('oneRepMaxes')
      .withIndex('by_exercise', (q) => q.eq('exerciseId', exerciseId))
      .collect()
      .then((records) => records.filter((r) => r.source !== 'manual'));

    const currentBest =
      existingNonManual.length > 0
        ? Math.max(...existingNonManual.map((r) => r.value))
        : 0;

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
Git commit:

git add convex/oneRepMaxes.ts convex/lib/oneRepMax.ts
git commit -m "feat: convex 1RM queries and mutations with manual/calculated priority logic"
Task 11 — Dashboard
Files to create
src/routes/dashboard/index.tsx
src/routes/dashboard/index.tsx
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { Dumbbell } from 'lucide-react';
import { format } from 'date-fns';

export const Route = createFileRoute('/dashboard/')({
  component: DashboardPage,
});

function DashboardPage() {
  const recentSessions = useQuery(api.workoutSessions.listRecent, { limit: 5 }) ?? [];
  const activeSession = useQuery(api.workoutSessions.getActive);
  const exercises = useQuery(api.exercises.list) ?? [];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      {/* Active session resume banner */}
      {activeSession && (
        <div className="mb-6 rounded-xl bg-[var(--accent-dim)] border border-[var(--accent)]/20 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">Active session in progress</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {activeSession.name ?? 'Untitled'} · started{' '}
              {format(new Date(activeSession.startTime), 'h:mm a')}
            </p>
          </div>
          <Link
            to="/log/$sessionId"
            params={{ sessionId: activeSession._id }}
            className="px-4 py-2 rounded-lg bg-[var(--accent)] text-black text-sm font-bold"
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

        {/* Top 1RMs — one per exercise, sampled from first 10 exercises for dashboard */}
        <TopOneRepMaxes exercises={exercises.slice(0, 10)} />
      </div>
    </div>
  );
}

function TopOneRepMaxes({ exercises }: { exercises: Array<{ _id: any; name: string }> }) {
  // We use individual queries per exercise; Convex batches these efficiently
  return (
    <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5">
      <h2 className="text-sm font-semibold text-white mb-4">Top 1RMs</h2>
      <div className="flex flex-col divide-y divide-[var(--border)]">
        {exercises.map((ex) => (
          <ExerciseOrmRow key={ex._id} exerciseId={ex._id} exerciseName={ex.name} />
        ))}
      </div>
    </div>
  );
}

function ExerciseOrmRow({
  exerciseId,
  exerciseName,
}: {
  exerciseId: any;
  exerciseName: string;
}) {
  const orm = useQuery(api.oneRepMaxes.getCurrentForExercise, { exerciseId });
  if (!orm) return null; // hide exercises with no 1RM

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
        <span className="text-xs text-[var(--text-muted)]">kg</span>
        <span className="text-[10px] text-[var(--text-muted)] ml-1 capitalize">
          {orm.source === 'calculated' ? 'est.' : orm.source}
        </span>
      </div>
    </div>
  );
}
Git commit:

git add src/routes/dashboard/
git commit -m "feat: dashboard with recent sessions, top 1RMs, and quick-log CTA"
Task 12 — Routines
Files to create
convex/routines.ts
src/routes/routines/index.tsx
src/components/routines/CreateRoutineForm.tsx
src/components/routines/RoutineCard.tsx
convex/routines.ts
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
  handler: async (ctx, args) => {
    return ctx.db.insert('routines', args);
  },
});

export const update = mutation({
  args: {
    id: v.id('routines'),
    name: v.optional(v.string()),
    exercises: v.optional(
      v.array(
        v.object({
          exerciseId: v.id('exercises'),
          defaultSets: v.number(),
          defaultReps: v.number(),
          defaultWeight: v.optional(v.number()),
        }),
      ),
    ),
  },
  handler: async (ctx, { id, ...patch }) => {
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id('routines') },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// Start a session pre-populated from a routine
export const startSession = mutation({
  args: { routineId: v.id('routines') },
  handler: async (ctx, { routineId }) => {
    const routine = await ctx.db.get(routineId);
    if (!routine) throw new Error('Routine not found.');

    // Enforce single active session
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

    // Pre-populate: insert placeholder sets (weight=0, reps=defaultReps) for each exercise
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
src/components/routines/RoutineCard.tsx
import { useMutation } from 'convex/react';
import { useNavigate } from '@tanstack/react-router';
import { api } from '@convex/_generated/api';
import type { Doc } from '@convex/_generated/dataModel';
import { Play, Trash2 } from 'lucide-react';

interface Props {
  routine: Doc<'routines'>;
}

export function RoutineCard({ routine }: Props) {
  const navigate = useNavigate();
  const startSession = useMutation(api.routines.startSession);
  const removeRoutine = useMutation(api.routines.remove);

  async function handleStart() {
    const sessionId = await startSession({ routineId: routine._id });
    void navigate({ to: '/log/$sessionId', params: { sessionId } });
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
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[var(--accent)] text-black text-sm font-bold hover:bg-[var(--accent-hover)] transition-colors"
      >
        <Play size={14} />
        Start Workout
      </button>
    </div>
  );
}
src/components/routines/CreateRoutineForm.tsx
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
        className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-white placeholder:text-[var(--text-muted)]"
        required
      />

      {/* Exercise entries */}
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

      {/* Exercise picker */}
      {showPicker ? (
        <div className="rounded-lg border border-[var(--border)] overflow-hidden">
          <input
            autoFocus
            type="search"
            placeholder="Search exercises…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 border-b border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-white placeholder:text-[var(--text-muted)]"
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
src/routes/routines/index.tsx
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
Git commit:

git add convex/routines.ts src/routes/routines/ src/components/routines/
git commit -m "feat: routines page with create form, RoutineCard, and startSession mutation"
Task 13 — Progress Charts
Files to create
src/routes/progress/index.tsx
convex/progress.ts
convex/progress.ts
import { query } from './_generated/server';
import { v } from 'convex/values';

// Weekly volume: total kg lifted per calendar week, for a specific exercise
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
      // ISO week key: YYYY-Www
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
src/routes/progress/index.tsx
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

      {/* Exercise selector */}
      <div className="mb-6">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value as Id<'exercises'>)}
          className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-white min-w-[240px]"
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

  const ormChartData = ormRecords
    .sort((a, b) => a.date - b.date)
    .map((r) => ({
      date: format(new Date(r.date), 'MMM d'),
      value: r.value,
      source: r.source,
    }));

  const tooltipStyle = {
    contentStyle: {
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      color: 'var(--text)',
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
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                unit="kg"
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number, _: string, entry: any) => [
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
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
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
Git commit:

git add convex/progress.ts src/routes/progress/
git commit -m "feat: progress page with 1RM timeline and weekly volume bar chart"
Task 14 — Delete Flows
The delete mutations are already woven into the earlier tasks. Here is the complete audit and the one remaining piece — the recalculateOrmsForExercise internal helper that workoutSessions.remove needs to call after cascading set deletion.

Addition to convex/workoutSessions.ts
Replace the remove mutation with this complete version:

export const remove = mutation({
  args: { id: v.id('workoutSessions') },
  handler: async (ctx, { id }) => {
    // Gather sets before deletion to know which exercises need 1RM recalc
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

    // Recalculate 1RM for each affected exercise across ALL remaining sessions
    for (const exerciseId of exerciseIds) {
      // Delete all non-manual 1RMs for this exercise
      const orms = await ctx.db
        .query('oneRepMaxes')
        .withIndex('by_exercise', (q) => q.eq('exerciseId', exerciseId))
        .collect();
      for (const orm of orms) {
        if (orm.source !== 'manual') await ctx.db.delete(orm._id);
      }

      // Re-scan all remaining sets for this exercise and find best 1RM
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
        const reps = set.reps;
        const weight = set.weight;
        if (reps < 1 || weight <= 0) continue;
        const value =
          reps === 1
            ? weight
            : Math.round(weight * (1 + reps / 30) * 10) / 10;
        const source: 'actual' | 'calculated' = reps === 1 ? 'actual' : 'calculated';
        if (value > bestValue) {
          bestValue = value;
          bestOrm = {
            value,
            source,
            formula: source === 'calculated' ? 'epley' : undefined,
            unit: set.unit,
            date: set.loggedAt,
          };
        }
      }

      if (bestOrm) {
        await ctx.db.insert('oneRepMaxes', { exerciseId, ...bestOrm });
      }
    }
  },
});
Delete flow summary for reference:

Entity deleted	Cascade	1RM effect
Single set	None	Recalculate 1RM for that exercise from remaining sets
Session	All sets for that session	Recalculate 1RM for every exercise that had sets in session
Custom exercise	All sets + all 1RM records for that exercise	N/A (all records gone)
Default exercise	Blocked — throws error	N/A
Git commit:

git add convex/workoutSessions.ts
git commit -m "feat: complete session delete with cascade set deletion and 1RM recalculation"
Final Checklist — File Structure After All Tasks
convex/
  _generated/          ← auto-generated, never edit
  lib/
    oneRepMax.ts       ← pure 1RM functions (Convex-safe copy)
  schema.ts            ← Task 1
  seed.ts              ← Task 2
  exercises.ts         ← Tasks 6, 7
  workoutSessions.ts   ← Tasks 8, 14
  sets.ts              ← Task 9
  oneRepMaxes.ts       ← Task 10
  routines.ts          ← Task 12
  progress.ts          ← Task 13
src/
  lib/
    oneRepMax.ts       ← Task 3 (source of truth for tests)
    oneRepMax.test.ts  ← Task 3
  components/
    AppShell.tsx       ← Task 4
    Sidebar.tsx        ← Task 4
    BottomTabBar.tsx   ← Task 4
    OfflineBanner.tsx  ← Task 4
    exercises/
      AddExerciseForm.tsx   ← Task 6
    session/
      AddExerciseModal.tsx  ← Task 9
      ExerciseSection.tsx   ← Task 9
      SetRow.tsx            ← Task 9
      SetCard.tsx           ← Task 9
    routines/
      RoutineCard.tsx        ← Task 12
      CreateRoutineForm.tsx  ← Task 12
    ui/                ← auto-added by shadcn CLI
  routes/
    __root.tsx         ← Task 4
    index.tsx          ← Task 5
    dashboard/
      index.tsx        ← Task 11
    log/
      index.tsx        ← Task 8
      $sessionId.tsx   ← Task 9
    exercises/
      index.tsx        ← Task 6
      $id.tsx          ← Task 7
    routines/
      index.tsx        ← Task 12
    progress/
      index.tsx        ← Task 13
  main.tsx             ← Task 4
  styles.css           ← Task 4
  routeTree.gen.ts     ← auto-generated
biome.json             ← Task 0
components.json        ← Task 0 (shadcn)
DESIGN.md              ← Task 5 (getdesign output)
.env.local             ← Task 0 (convex dev)
.env.example           ← Task 1
Key Implementation Notes for Convex Newcomers
Convex query reactivity: Every useQuery(api.x.y, args) call in React is a live subscription. When data changes in Convex (from any mutation), all components using that query automatically re-render with fresh data — no polling, no manual refetch needed. This is why the active session redirect in AppShell works automatically.

Convex undefined vs null: Convex validators use v.optional(...) for fields that may not exist. When writing mutations, pass undefined (not null) for optional fields. TypeScript enforces this.

The _generated/ directory: Running npx convex dev watches your convex/ directory and regenerates convex/_generated/api.ts and convex/_generated/dataModel.ts every time you save a schema or function file. These typed files give you full autocomplete on api.tableName.functionName and Id<"tableName"> throughout the app. Never edit them.

Tailwind v4 + shadcn: With Tailwind v4, shadcn components use CSS variables rather than Tailwind config object keys. After shadcn init, the variables in components.json refer to CSS custom properties. Our Spotify dark styles.css redefines those variables to match the design — this is correct and intentional.

router.tsx vs main.tsx: The scaffold generated both. The router.tsx getRouter() factory is unused by main.tsx as rewritten in Task 4. You can safely delete router.tsx or leave it — the router registered in main.tsx is the authoritative one. The declare module augmentation in both files is idempotent and harmless.

Critical Files for Implementation
D:\Dev\workout-tracker\convex\schema.ts
D:\Dev\workout-tracker\src\routes\__root.tsx
D:\Dev\workout-tracker\src\main.tsx
D:\Dev\workout-tracker\convex\sets.ts
D:\Dev\workout-tracker\src\components\AppShell.tsx