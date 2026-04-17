# Workout Tracker — Part 2: Pages (Intro, Exercises, Session Start)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the intro landing page (standalone Spotify dark layout), all Convex data-layer functions for exercises and sessions, the Exercise Library and Detail pages, and the session-start flow at `/log`.

**Architecture:** Convex functions are the data layer — no REST, no fetch. Exercise library uses TanStack Table for client-side sorting/filtering. Exercise detail shows 1RM history via a Recharts LineChart. Session start enforces the single-active-session rule in a Convex mutation.

**Tech Stack:** TanStack Router file-based routing, Convex queries/mutations, TanStack Table, TanStack Form + Zod, Recharts, shadcn/ui, Tailwind v4

**Prerequisite:** Part 1 complete — all deps installed, schema deployed, 1RM utility tested.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/routes/index.tsx` | Replace | Spotify dark intro page (standalone, no AppShell) |
| `convex/exercises.ts` | Create | list, getById, create, remove queries/mutations |
| `src/routes/exercises/index.tsx` | Create | Exercise Library: TanStack Table + filters + AddExerciseForm |
| `src/components/exercises/AddExerciseForm.tsx` | Create | TanStack Form + Zod form for custom exercises |
| `src/routes/exercises/$id.tsx` | Create | Exercise Detail: 1RM chart + set history |
| `convex/workoutSessions.ts` | Create | getActive, listRecent, create, finish, cancel mutations |
| `src/routes/log/index.tsx` | Create | Session Start: free-form or from routine, active session banner |

---

### Task 5: Intro Page

**Files:**
- Replace: `src/routes/index.tsx`

The intro page is a full-screen standalone layout (no sidebar, no bottom tabs — the `__root.tsx` renders a raw `<Outlet />` when `pathname === '/'`). It has inline top navigation, two CSS green glow blobs, and hero content anchored to the bottom of the viewport.

- [ ] **Step 1: Replace `src/routes/index.tsx`**

```tsx
import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: IntroPage,
});

function IntroPage() {
  return (
    <div
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: '#000' }}
    >
      {/* Green glow blobs — CSS only, no JS */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(29,185,84,0.12), transparent 65%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: 300,
          height: 300,
          background: 'radial-gradient(circle, rgba(29,185,84,0.06), transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top navigation */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        {/* Logo + wordmark */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-[30px] h-[30px] rounded-[6px] flex items-center justify-center font-black text-black text-[15px]"
            style={{ background: '#1DB954' }}
          >
            W
          </div>
          <span className="text-white font-bold text-sm">Workout Tracker</span>
        </div>

        {/* Nav links — hidden on mobile */}
        <nav className="hidden sm:flex items-center gap-6">
          {[
            { to: '/exercises', label: 'Exercises' },
            { to: '/progress', label: 'Progress' },
            { to: '/routines', label: 'Routines' },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="text-[#b3b3b3] hover:text-white transition-colors"
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1.2px',
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Hero — anchored to bottom */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-6 pb-12 sm:px-12">
        {/* Eyebrow */}
        <p
          className="mb-3"
          style={{
            color: '#1DB954',
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '2px',
          }}
        >
          Your gym. Your data.
        </p>

        {/* Headline */}
        <h1 className="mb-4" style={{ lineHeight: 1.05, letterSpacing: '-1.5px' }}>
          <span className="block text-white" style={{ fontSize: 52, fontWeight: 900 }}>
            Track every lift.
          </span>
          <span className="block" style={{ fontSize: 52, fontWeight: 900, color: '#1DB954' }}>
            Own every PR.
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="mb-8 max-w-[420px]"
          style={{ color: '#b3b3b3', fontSize: 15, lineHeight: 1.6 }}
        >
          Log sets, track 1RMs, and watch your strength compound — session by session.
        </p>

        {/* CTA row */}
        <div className="flex items-center gap-6 flex-wrap">
          <Link
            to="/log"
            className="px-8 py-3 font-bold text-black text-sm transition-colors"
            style={{
              background: '#1DB954',
              borderRadius: 50,
              fontWeight: 700,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#1ed760';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#1DB954';
            }}
          >
            Start Workout
          </Link>
          <Link
            to="/exercises"
            className="text-sm transition-colors"
            style={{ color: '#b3b3b3' }}
          >
            Browse exercises{' '}
            <span style={{ color: '#1DB954' }}>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

Navigate to `http://localhost:3000/`. You should see: black full-screen page, top nav with logo + links (hidden on mobile), hero content at the bottom with "Track every lift." in white and "Own every PR." in green. Two subtle glow blobs visible. "Start Workout" green pill button + "Browse exercises →" link.

- [ ] **Step 3: Commit**

```bash
git add src/routes/index.tsx
git commit -m "feat: spotify dark intro page with green glow blobs and bottom-anchored hero"
```

---

### Task 6: Convex Exercise Functions + Exercise Library Page

**Files:**
- Create: `convex/exercises.ts`
- Create: `src/components/exercises/AddExerciseForm.tsx`
- Create: `src/routes/exercises/index.tsx`

- [ ] **Step 1: Create `convex/exercises.ts`**

```ts
import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query('exercises').order('asc').collect();
  },
});

export const getById = query({
  args: { id: v.id('exercises') },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const create = mutation({
  args: {
    name: v.string(),
    muscleGroups: v.array(v.string()),
    category: v.union(v.literal('compound'), v.literal('isolation')),
    equipment: v.union(
      v.literal('barbell'),
      v.literal('dumbbell'),
      v.literal('cable'),
      v.literal('bodyweight'),
      v.literal('machine'),
      v.literal('kettlebell'),
      v.literal('band'),
      v.literal('other'),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('exercises', { ...args, isDefault: false });
  },
});

export const remove = mutation({
  args: { id: v.id('exercises') },
  handler: async (ctx, { id }) => {
    const exercise = await ctx.db.get(id);
    if (!exercise) throw new Error('Exercise not found.');
    if (exercise.isDefault) throw new Error('Default exercises cannot be deleted.');

    // Cascade: delete all sets for this exercise
    const sets = await ctx.db
      .query('sets')
      .withIndex('by_exercise', (q) => q.eq('exerciseId', id))
      .collect();
    for (const set of sets) {
      await ctx.db.delete(set._id);
    }

    // Cascade: delete all 1RM records for this exercise
    const orms = await ctx.db
      .query('oneRepMaxes')
      .withIndex('by_exercise', (q) => q.eq('exerciseId', id))
      .collect();
    for (const orm of orms) {
      await ctx.db.delete(orm._id);
    }

    await ctx.db.delete(id);
  },
});
```

- [ ] **Step 2: Create `src/components/exercises/AddExerciseForm.tsx`**

```tsx
import { useMutation } from 'convex/react';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { api } from '@convex/_generated/api';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  muscleGroupsRaw: z.string().min(1, 'At least one muscle group required'),
  category: z.enum(['compound', 'isolation']),
  equipment: z.enum([
    'barbell',
    'dumbbell',
    'cable',
    'bodyweight',
    'machine',
    'kettlebell',
    'band',
    'other',
  ]),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const equipmentOptions = [
  'barbell',
  'dumbbell',
  'cable',
  'bodyweight',
  'machine',
  'kettlebell',
  'band',
  'other',
] as const;

export function AddExerciseForm() {
  const createExercise = useMutation(api.exercises.create);

  const form = useForm({
    defaultValues: {
      name: '',
      muscleGroupsRaw: '',
      category: 'compound' as 'compound' | 'isolation',
      equipment: 'barbell' as FormValues['equipment'],
      notes: '',
    },
    onSubmit: async ({ value }) => {
      const parsed = schema.parse(value);
      const muscleGroups = parsed.muscleGroupsRaw
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      await createExercise({
        name: parsed.name,
        muscleGroups,
        category: parsed.category,
        equipment: parsed.equipment,
        notes: parsed.notes || undefined,
      });
      form.reset();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5 flex flex-col gap-4"
    >
      <h2 className="text-sm font-semibold text-white">Add Custom Exercise</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Name */}
        <form.Field name="name">
          {(field) => (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">Name</label>
              <input
                className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="e.g. Cable Lateral Raise"
                required
              />
              {field.state.meta.errors.length > 0 && (
                <p className="text-xs text-red-400">{field.state.meta.errors[0]}</p>
              )}
            </div>
          )}
        </form.Field>

        {/* Muscle groups */}
        <form.Field name="muscleGroupsRaw">
          {(field) => (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">
                Muscle Groups (comma-separated)
              </label>
              <input
                className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="e.g. side delts, traps"
                required
              />
            </div>
          )}
        </form.Field>

        {/* Category */}
        <form.Field name="category">
          {(field) => (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">Category</label>
              <select
                className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                value={field.state.value}
                onChange={(e) =>
                  field.handleChange(e.target.value as 'compound' | 'isolation')
                }
              >
                <option value="compound">Compound</option>
                <option value="isolation">Isolation</option>
              </select>
            </div>
          )}
        </form.Field>

        {/* Equipment */}
        <form.Field name="equipment">
          {(field) => (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-muted)]">Equipment</label>
              <select
                className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                value={field.state.value}
                onChange={(e) =>
                  field.handleChange(e.target.value as FormValues['equipment'])
                }
              >
                {equipmentOptions.map((eq) => (
                  <option key={eq} value={eq} className="capitalize">
                    {eq.charAt(0).toUpperCase() + eq.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </form.Field>

        {/* Notes */}
        <form.Field name="notes">
          {(field) => (
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs text-[var(--text-muted)]">Notes (optional)</label>
              <input
                className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Form cues, tips..."
              />
            </div>
          )}
        </form.Field>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-5 py-2 rounded-full bg-[var(--accent)] text-black text-sm font-bold hover:bg-[var(--accent-hover)] transition-colors"
        >
          Add Exercise
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create `src/routes/exercises/index.tsx`**

```tsx
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { api } from '@convex/_generated/api';
import type { Doc } from '@convex/_generated/dataModel';
import { Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { AddExerciseForm } from '#/components/exercises/AddExerciseForm';

const MUSCLE_GROUPS = [
  'chest', 'back', 'lats', 'traps', 'quads', 'hamstrings', 'glutes', 'calves',
  'biceps', 'triceps', 'shoulders', 'front delts', 'side delts', 'rear delts',
  'core', 'forearms', 'full body',
];
const CATEGORIES = ['compound', 'isolation'] as const;
const EQUIPMENT = [
  'barbell', 'dumbbell', 'cable', 'bodyweight', 'machine', 'kettlebell', 'band', 'other',
] as const;

export const Route = createFileRoute('/exercises/')({
  component: ExercisesPage,
});

function ExercisesPage() {
  const exercises = useQuery(api.exercises.list) ?? [];
  const removeExercise = useMutation(api.exercises.remove);

  const [search, setSearch] = useState('');
  const [filterMuscle, setFilterMuscle] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterEquipment, setFilterEquipment] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterMuscle && !ex.muscleGroups.includes(filterMuscle)) return false;
      if (filterCategory && ex.category !== filterCategory) return false;
      if (filterEquipment && ex.equipment !== filterEquipment) return false;
      return true;
    });
  }, [exercises, search, filterMuscle, filterCategory, filterEquipment]);

  const columns: ColumnDef<Doc<'exercises'>>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <Link
          to="/exercises/$id"
          params={{ id: row.original._id }}
          className="text-white hover:text-[var(--accent)] font-medium transition-colors"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: 'muscleGroups',
      header: 'Muscle Groups',
      cell: ({ row }) => (
        <span className="text-[var(--text-muted)] text-xs capitalize">
          {row.original.muscleGroups.join(', ')}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <span className="capitalize text-sm text-[var(--text-muted)]">
          {row.original.category}
        </span>
      ),
    },
    {
      accessorKey: 'equipment',
      header: 'Equipment',
      cell: ({ row }) => (
        <span className="capitalize text-sm text-[var(--text-muted)]">
          {row.original.equipment}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        if (row.original.isDefault) return null;
        return (
          <button
            type="button"
            onClick={() => void removeExercise({ id: row.original._id })}
            className="p-1.5 text-[var(--text-muted)] hover:text-red-400 transition-colors"
            aria-label={`Delete ${row.original.name}`}
          >
            <Trash2 size={14} />
          </button>
        );
      },
      enableSorting: false,
    },
  ];

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Exercise Library</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="search"
          placeholder="Search exercises…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] min-w-[180px]"
        />
        <select
          value={filterMuscle}
          onChange={(e) => setFilterMuscle(e.target.value)}
          className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        >
          <option value="">All muscle groups</option>
          {MUSCLE_GROUPS.map((mg) => (
            <option key={mg} value={mg} className="capitalize">
              {mg}
            </option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c} className="capitalize">
              {c}
            </option>
          ))}
        </select>
        <select
          value={filterEquipment}
          onChange={(e) => setFilterEquipment(e.target.value)}
          className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        >
          <option value="">All equipment</option>
          {EQUIPMENT.map((eq) => (
            <option key={eq} value={eq} className="capitalize">
              {eq}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface)]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap"
                      style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' && <ChevronUp size={12} />}
                        {header.column.getIsSorted() === 'desc' && <ChevronDown size={12} />}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="bg-[var(--bg)] hover:bg-white/[0.02] transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-sm text-[var(--text-muted)]"
                  >
                    No exercises match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-[var(--text-muted)] mb-4">
        Showing {filtered.length} of {exercises.length} exercises
      </p>

      <AddExerciseForm />
    </div>
  );
}
```

- [ ] **Step 4: Verify in browser**

Navigate to `/exercises`. The table should load with all 62 seeded exercises. Filters should narrow results. Clicking a column header sorts that column. Custom exercises get a delete button; default ones don't.

- [ ] **Step 5: Commit**

```bash
git add convex/exercises.ts src/routes/exercises/ src/components/exercises/
git commit -m "feat: exercise library with TanStack Table, client-side filters, and AddExerciseForm"
```

---

### Task 7: Exercise Detail Page

**Files:**
- Create: `src/routes/exercises/$id.tsx`

This page queries the exercise, its 1RM history, and all sets grouped by session, then displays them with a Recharts LineChart.

- [ ] **Step 1: Add `getHistory` query to `convex/exercises.ts`**

Append to `convex/exercises.ts`:

```ts
// Returns all sets for an exercise, ordered oldest → newest, with session metadata
export const getHistory = query({
  args: { exerciseId: v.id('exercises') },
  handler: async (ctx, { exerciseId }) => {
    const sets = await ctx.db
      .query('sets')
      .withIndex('by_exercise', (q) => q.eq('exerciseId', exerciseId))
      .order('asc')
      .collect();

    // Hydrate session dates
    const sessionIds = [...new Set(sets.map((s) => s.sessionId))];
    const sessions = await Promise.all(sessionIds.map((id) => ctx.db.get(id)));
    const sessionMap = new Map(
      sessions.filter(Boolean).map((s) => [s!._id, s!]),
    );

    return sets.map((set) => ({
      ...set,
      sessionDate: sessionMap.get(set.sessionId)?.date ?? set.loggedAt,
      sessionName: sessionMap.get(set.sessionId)?.name ?? null,
    }));
  },
});
```

- [ ] **Step 2: Create `src/routes/exercises/$id.tsx`**

```tsx
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { calculateOneRepMax } from '#/lib/oneRepMax';

export const Route = createFileRoute('/exercises/$id')({
  component: ExerciseDetailPage,
});

function ExerciseDetailPage() {
  const { id } = Route.useParams();
  const exercise = useQuery(api.exercises.getById, { id: id as Id<'exercises'> });
  const history = useQuery(api.exercises.getHistory, { exerciseId: id as Id<'exercises'> }) ?? [];
  const currentOrm = useQuery(api.oneRepMaxes.getCurrentForExercise, {
    exerciseId: id as Id<'exercises'>,
  });
  const ormHistory = useQuery(api.oneRepMaxes.listForExercise, {
    exerciseId: id as Id<'exercises'>,
  }) ?? [];

  if (exercise === undefined) {
    return (
      <div className="p-6 text-[var(--text-muted)] text-sm">Loading…</div>
    );
  }
  if (exercise === null) {
    return <div className="p-6 text-red-400 text-sm">Exercise not found.</div>;
  }

  const ormChartData = [...ormHistory]
    .sort((a, b) => a.date - b.date)
    .map((r) => ({
      date: format(new Date(r.date), 'MMM d'),
      value: r.value,
      source: r.source,
    }));

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Back */}
      <Link
        to="/exercises"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-white mb-5 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to exercises
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{exercise.name}</h1>
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-[var(--text-muted)] capitalize">
            {exercise.category}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-[var(--text-muted)] capitalize">
            {exercise.equipment}
          </span>
          {exercise.muscleGroups.map((mg) => (
            <span
              key={mg}
              className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] capitalize"
            >
              {mg}
            </span>
          ))}
        </div>
        {exercise.notes && (
          <p className="mt-3 text-sm text-[var(--text-muted)]">{exercise.notes}</p>
        )}
      </div>

      {/* Current 1RM */}
      {currentOrm && (
        <div className="mb-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
              Current 1RM
            </p>
            <p className="text-3xl font-black text-white">
              {currentOrm.value}
              <span className="text-sm font-medium text-[var(--text-muted)] ml-1">
                {currentOrm.unit}
              </span>
            </p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] capitalize font-medium">
            {currentOrm.source === 'calculated' ? 'estimated' : currentOrm.source}
          </span>
        </div>
      )}

      {/* 1RM Chart */}
      <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5 mb-6">
        <h2 className="text-sm font-semibold text-white mb-4">1RM Progress</h2>
        {ormChartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={220}>
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
                contentStyle={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 12,
                }}
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
          <p className="text-sm text-[var(--text-muted)] py-6 text-center">
            Log at least 2 sessions to see the 1RM trend.
          </p>
        )}
      </div>

      {/* Set History */}
      <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5">
        <h2 className="text-sm font-semibold text-white mb-4">
          Set History ({history.length} sets)
        </h2>
        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['Date', 'Set', 'Type', 'Weight', 'Reps', 'RPE', 'Est. 1RM'].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left pb-2 text-xs text-[var(--text-muted)] font-medium pr-4 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((set) => {
                  const orm = calculateOneRepMax(set.weight, set.reps);
                  return (
                    <tr
                      key={set._id}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="py-2 pr-4 text-[var(--text-muted)] whitespace-nowrap">
                        {format(new Date(set.sessionDate), 'MMM d')}
                      </td>
                      <td className="py-2 pr-4 text-white">#{set.setNumber}</td>
                      <td className="py-2 pr-4 text-[var(--text-muted)] capitalize">
                        {set.setType}
                      </td>
                      <td className="py-2 pr-4 text-white font-medium">
                        {set.weight}
                        <span className="text-[var(--text-muted)] text-xs ml-0.5">
                          {set.unit}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-white">{set.reps}</td>
                      <td className="py-2 pr-4 text-[var(--text-muted)]">
                        {set.rpe ?? '—'}
                      </td>
                      <td className="py-2 text-[var(--text-muted)] text-xs">
                        {orm.value}
                        {orm.source === 'calculated' && (
                          <span className="ml-0.5 text-[10px]">est.</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            No sets logged for this exercise yet.
          </p>
        )}
      </div>
    </div>
  );
}
```

> **Note:** `api.oneRepMaxes.getCurrentForExercise` and `api.oneRepMaxes.listForExercise` are implemented in Part 3 (Task 10). Until then, TypeScript will error on those lines. That's expected — implement this file now and the errors resolve in Part 3.

- [ ] **Step 3: Commit**

```bash
git add convex/exercises.ts src/routes/exercises/
git commit -m "feat: exercise detail with 1RM chart, set history, and getHistory convex query"
```

---

### Task 8: Convex Session Functions + Session Start Page

**Files:**
- Create: `convex/workoutSessions.ts`
- Create: `src/routes/log/index.tsx`

- [ ] **Step 1: Create `convex/workoutSessions.ts`**

```ts
import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// Returns the single active session (if any)
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query('workoutSessions')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .first();
  },
});

export const listRecent = query({
  args: { limit: v.number() },
  handler: async (ctx, { limit }) => {
    return ctx.db
      .query('workoutSessions')
      .withIndex('by_date')
      .order('desc')
      .take(limit);
  },
});

export const getById = query({
  args: { id: v.id('workoutSessions') },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

// Create a free-form session (enforces single-active constraint)
export const create = mutation({
  args: {
    name: v.optional(v.string()),
    routineId: v.optional(v.id('routines')),
  },
  handler: async (ctx, { name, routineId }) => {
    const existing = await ctx.db
      .query('workoutSessions')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .first();
    if (existing) throw new Error('A session is already active. Finish it before starting a new one.');

    const now = Date.now();
    return ctx.db.insert('workoutSessions', {
      date: now,
      startTime: now,
      name,
      routineId,
      status: 'active',
    });
  },
});

export const finish = mutation({
  args: { id: v.id('workoutSessions') },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      status: 'completed',
      completedAt: Date.now(),
    });
  },
});

export const cancel = mutation({
  args: { id: v.id('workoutSessions') },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { status: 'cancelled' });
  },
});

// Full cascade delete — see Part 3 for 1RM recalc version
export const remove = mutation({
  args: { id: v.id('workoutSessions') },
  handler: async (ctx, { id }) => {
    const sets = await ctx.db
      .query('sets')
      .withIndex('by_session', (q) => q.eq('sessionId', id))
      .collect();
    for (const set of sets) {
      await ctx.db.delete(set._id);
    }
    await ctx.db.delete(id);
  },
});
```

- [ ] **Step 2: Create `src/routes/log/index.tsx`**

```tsx
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { useState } from 'react';
import { api } from '@convex/_generated/api';
import { format } from 'date-fns';
import { Dumbbell, Play, Clock } from 'lucide-react';

export const Route = createFileRoute('/log/')({
  component: LogPage,
});

function LogPage() {
  const navigate = useNavigate();
  const activeSession = useQuery(api.workoutSessions.getActive);
  const routines = useQuery(api.routines.list) ?? [];
  const createSession = useMutation(api.workoutSessions.create);

  const [sessionName, setSessionName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Note: api.routines.list is implemented in Part 3. If Convex errors before then,
  // the page still works — routines just shows empty.

  async function handleStartFreeForm(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    setError('');
    try {
      const sessionId = await createSession({ name: sessionName.trim() || undefined });
      void navigate({ to: '/log/$sessionId', params: { sessionId } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
      setCreating(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Log Workout</h1>

      {/* Active session resume banner */}
      {activeSession && (
        <div className="mb-6 rounded-xl bg-[var(--accent-dim)] border border-[var(--accent)]/20 p-4 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className="text-[var(--accent)]" />
              <p className="text-sm font-semibold text-[var(--accent)]">
                Session in progress
              </p>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              {activeSession.name ?? 'Untitled session'} · started{' '}
              {format(new Date(activeSession.startTime), 'h:mm a')}
            </p>
          </div>
          <Link
            to="/log/$sessionId"
            params={{ sessionId: activeSession._id }}
            className="shrink-0 px-4 py-2 rounded-lg bg-[var(--accent)] text-black text-sm font-bold hover:bg-[var(--accent-hover)] transition-colors"
          >
            Resume →
          </Link>
        </div>
      )}

      {/* Free-form session start */}
      {!activeSession && (
        <form
          onSubmit={(e) => void handleStartFreeForm(e)}
          className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5 mb-6"
        >
          <h2 className="text-sm font-semibold text-white mb-4">Start New Session</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Session name (optional)"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="flex-1 h-10 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--accent)] text-black text-sm font-bold disabled:opacity-50 hover:bg-[var(--accent-hover)] transition-colors"
            >
              <Dumbbell size={15} />
              {creating ? 'Starting…' : 'Start'}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </form>
      )}

      {/* Start from routine */}
      {!activeSession && routines.length > 0 && (
        <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Start from Routine</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {routines.map((routine) => (
              <StartFromRoutineButton key={routine._id} routine={routine} />
            ))}
          </div>
        </div>
      )}

      {!activeSession && routines.length === 0 && (
        <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5 text-center">
          <p className="text-[var(--text-muted)] text-sm mb-3">
            No routines yet.
          </p>
          <Link
            to="/routines"
            className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            Create a routine →
          </Link>
        </div>
      )}
    </div>
  );
}

function StartFromRoutineButton({
  routine,
}: {
  routine: { _id: string; name: string; exercises: unknown[] };
}) {
  const navigate = useNavigate();
  const startSession = useMutation(api.routines.startSession);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      const sessionId = await startSession({ routineId: routine._id as any });
      void navigate({ to: '/log/$sessionId', params: { sessionId } });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={loading}
      className="flex items-center justify-between gap-2 p-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)]/30 transition-colors text-left disabled:opacity-50"
    >
      <div>
        <p className="text-sm font-medium text-white">{routine.name}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          {(routine.exercises as unknown[]).length} exercises
        </p>
      </div>
      <Play size={16} className="text-[var(--accent)] shrink-0" />
    </button>
  );
}
```

- [ ] **Step 3: Verify in browser**

Navigate to `/log`. You should see the "Start New Session" form. Type a name and click Start — it should navigate to `/log/:sessionId` (which is a 404 for now, that's fine). The active session banner should appear if you navigate back to `/log`.

- [ ] **Step 4: Commit**

```bash
git add convex/workoutSessions.ts src/routes/log/
git commit -m "feat: workout session start page and workoutSessions convex functions"
```

---

## Part 2 Complete

At this point you have:
- Spotify dark intro page at `/`
- `convex/exercises.ts` with list, getById, getHistory, create, remove
- Exercise Library at `/exercises` with TanStack Table, filters, AddExerciseForm
- Exercise Detail at `/exercises/:id` with Recharts 1RM chart and set history table
- `convex/workoutSessions.ts` with getActive, listRecent, getById, create, finish, cancel, remove
- Session Start page at `/log` with free-form start and routine-picker

**Continue with:** `2026-04-17-workout-tracker-part3-features.md`
