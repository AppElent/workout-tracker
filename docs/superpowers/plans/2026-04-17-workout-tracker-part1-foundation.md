# Workout Tracker — Part 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install all dependencies, configure tooling, define the Convex schema, seed 60 exercises, implement the 1RM utility with tests, and wire up the root layout with ConvexProvider + AppShell (sidebar/bottom tabs) + Spotify dark CSS theme.

**Architecture:** Convex is the real-time backend (no REST, no fetch — just `useQuery`/`useMutation` hooks). The root layout wraps everything in `ConvexProvider` and renders an `AppShell` that switches between a collapsible desktop sidebar and a fixed mobile bottom tab bar. The intro page (`/`) is excluded from the AppShell via a layout exception in `__root.tsx`.

**Tech Stack:** React 19, TanStack Router (file-based SPA), Convex, shadcn/ui (Tailwind v4), Biome, Vitest, Zod, TanStack Form, TanStack Table, Recharts, date-fns

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `biome.json` | Create | Biome linter/formatter config |
| `components.json` | Create | shadcn/ui config |
| `.env.local` | Create | Convex deployment URL (not committed) |
| `.env.example` | Create | Template for env vars |
| `tsconfig.json` | Modify | Add `@convex` path alias |
| `vite.config.ts` | Modify | Add `@convex` alias |
| `convex/schema.ts` | Create | Full DB schema with indexes |
| `convex/seed.ts` | Create | 60 default exercises |
| `convex/lib/oneRepMax.ts` | Create | Pure 1RM functions (Convex-safe, no test deps) |
| `src/lib/oneRepMax.ts` | Create | Same pure 1RM functions (source of truth for tests) |
| `src/lib/oneRepMax.test.ts` | Create | Vitest tests |
| `src/styles.css` | Replace | Spotify dark CSS vars (replaces ocean theme entirely) |
| `src/main.tsx` | Modify | Wrap router in `ConvexProvider` |
| `src/routes/__root.tsx` | Replace | Import CSS, render `AppShell` or raw `Outlet` based on route |
| `src/components/AppShell.tsx` | Create | Layout wrapper: sidebar on desktop, bottom tabs on mobile |
| `src/components/Sidebar.tsx` | Create | Collapsible left nav |
| `src/components/BottomTabBar.tsx` | Create | Fixed mobile nav |
| `src/components/OfflineBanner.tsx` | Create | Convex connection-loss banner |
| `src/routes/about.tsx` | Delete | Scaffold leftover |
| `src/components/Header.tsx` | Delete | Scaffold leftover |
| `src/components/Footer.tsx` | Delete | Scaffold leftover |
| `src/components/ThemeToggle.tsx` | Delete | Scaffold leftover |

---

### Task 0: Install Dependencies

**Files:**
- Modify: `package.json` (via npm commands)
- Create: `biome.json`
- Create: `components.json` (via shadcn CLI)
- Create: `.env.local`, `.env.example`
- Modify: `tsconfig.json`, `vite.config.ts`

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install convex @tanstack/react-form @tanstack/react-table recharts zod date-fns
```

Expected output: `added N packages`

- [ ] **Step 2: Install dev dependencies**

```bash
npm install -D @biomejs/biome
```

- [ ] **Step 3: Initialize Convex**

```bash
npx convex dev
```

This opens a browser to log in and link a project. After linking, it creates `.env.local` with `VITE_CONVEX_URL=https://<your-deployment>.convex.cloud` and starts watching `convex/`. **Leave this terminal running** — it auto-generates `convex/_generated/` on every save.

If you want to skip the interactive flow for now: press Ctrl+C after `.env.local` is created. You can restart `npx convex dev` later alongside `npm run dev`.

- [ ] **Step 4: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

When prompted:
- Style: **Default**
- Base color: **Neutral** (we'll override all colors)
- CSS variables: **Yes**

This creates `components.json` and appends CSS variable blocks to `src/styles.css`.

- [ ] **Step 5: Create Biome config**

Create `biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": { "noExplicitAny": "warn" }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all",
      "semicolons": "always"
    }
  }
}
```

Add to `package.json` scripts:

```json
"lint": "biome check .",
"format": "biome format --write ."
```

- [ ] **Step 6: Add path aliases for Convex generated files**

In `tsconfig.json`, add to `"paths"`:

```json
"@convex/*": ["./convex/*"]
```

In `vite.config.ts`, add an `alias` to the resolve block:

```ts
import path from 'path'

// inside defineConfig:
resolve: {
  tsconfigPaths: true,
  alias: {
    '@convex': path.resolve(__dirname, 'convex'),
  },
},
```

Full updated `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const config = defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@convex': path.resolve(__dirname, 'convex'),
    },
  },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    viteReact(),
  ],
})

export default config
```

- [ ] **Step 7: Create .env.example**

Create `.env.example`:

```
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

Verify `.env.local` is in `.gitignore` (it should be from the scaffold — check and add if missing).

- [ ] **Step 8: Delete scaffold leftovers**

```bash
rm src/routes/about.tsx
rm src/components/Header.tsx
rm src/components/Footer.tsx
rm src/components/ThemeToggle.tsx
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: install convex, shadcn, biome, tanstack-form/table, recharts, zod"
```

---

### Task 1: Convex Schema

**Files:**
- Create: `convex/schema.ts`

- [ ] **Step 1: Create `convex/schema.ts`**

```ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  exercises: defineTable({
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
    isDefault: v.boolean(),
    userId: v.optional(v.string()),
  })
    .index('by_name', ['name'])
    .index('by_default', ['isDefault']),

  workoutSessions: defineTable({
    date: v.number(),
    startTime: v.number(),
    name: v.optional(v.string()),
    routineId: v.optional(v.id('routines')),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal('active'),
      v.literal('completed'),
      v.literal('cancelled'),
    ),
    completedAt: v.optional(v.number()),
    userId: v.optional(v.string()),
  })
    .index('by_status', ['status'])
    .index('by_date', ['date']),

  sets: defineTable({
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
    loggedAt: v.number(),
  })
    .index('by_session', ['sessionId'])
    .index('by_exercise', ['exerciseId'])
    .index('by_session_exercise', ['sessionId', 'exerciseId']),

  oneRepMaxes: defineTable({
    exerciseId: v.id('exercises'),
    value: v.number(),
    unit: v.union(v.literal('kg'), v.literal('lbs')),
    date: v.number(),
    source: v.union(
      v.literal('manual'),
      v.literal('calculated'),
      v.literal('actual'),
    ),
    formula: v.optional(v.literal('epley')),
    userId: v.optional(v.string()),
  })
    .index('by_exercise', ['exerciseId'])
    .index('by_exercise_source', ['exerciseId', 'source']),

  routines: defineTable({
    name: v.string(),
    exercises: v.array(
      v.object({
        exerciseId: v.id('exercises'),
        defaultSets: v.number(),
        defaultReps: v.number(),
        defaultWeight: v.optional(v.number()),
      }),
    ),
    userId: v.optional(v.string()),
  }),
});
```

- [ ] **Step 2: Verify Convex dev picks it up**

If `npx convex dev` is running, it will regenerate `convex/_generated/` automatically. Check the terminal for "Schema updated" or similar output. No errors = success.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: convex schema — 5 tables with indexes"
```

---

### Task 2: Seed Data

**Files:**
- Create: `convex/seed.ts`

- [ ] **Step 1: Create `convex/seed.ts`**

```ts
import { mutation } from './_generated/server';

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    // Guard: only seed if no default exercises exist
    const existing = await ctx.db
      .query('exercises')
      .withIndex('by_default', (q) => q.eq('isDefault', true))
      .first();
    if (existing) return { seeded: 0, message: 'Already seeded' };

    const exercises: Array<{
      name: string;
      muscleGroups: string[];
      category: 'compound' | 'isolation';
      equipment:
        | 'barbell'
        | 'dumbbell'
        | 'cable'
        | 'bodyweight'
        | 'machine'
        | 'kettlebell'
        | 'band'
        | 'other';
      notes?: string;
      isDefault: true;
    }> = [
      // ── Powerlifting ──────────────────────────────────────────
      {
        name: 'Squat (Barbell)',
        muscleGroups: ['quads', 'glutes', 'hamstrings', 'core'],
        category: 'compound',
        equipment: 'barbell',
        notes: 'Keep chest up, knees tracking over toes.',
        isDefault: true,
      },
      {
        name: 'Bench Press (Barbell)',
        muscleGroups: ['chest', 'triceps', 'front delts'],
        category: 'compound',
        equipment: 'barbell',
        notes: 'Retract scapula, slight arch, bar to lower chest.',
        isDefault: true,
      },
      {
        name: 'Bench Press (Dumbbell)',
        muscleGroups: ['chest', 'triceps', 'front delts'],
        category: 'compound',
        equipment: 'dumbbell',
        isDefault: true,
      },
      {
        name: 'Deadlift (Barbell)',
        muscleGroups: ['hamstrings', 'glutes', 'back', 'traps'],
        category: 'compound',
        equipment: 'barbell',
        notes: 'Hinge at hips, bar stays close to shins.',
        isDefault: true,
      },
      {
        name: 'Romanian Deadlift (Barbell)',
        muscleGroups: ['hamstrings', 'glutes', 'lower back'],
        category: 'compound',
        equipment: 'barbell',
        isDefault: true,
      },
      {
        name: 'Front Squat (Barbell)',
        muscleGroups: ['quads', 'core', 'upper back'],
        category: 'compound',
        equipment: 'barbell',
        isDefault: true,
      },
      {
        name: 'Overhead Press (Barbell)',
        muscleGroups: ['front delts', 'triceps', 'upper chest'],
        category: 'compound',
        equipment: 'barbell',
        notes: 'Press bar in a straight line, lock out overhead.',
        isDefault: true,
      },

      // ── Olympic ───────────────────────────────────────────────
      {
        name: 'Clean & Jerk (Barbell)',
        muscleGroups: ['full body', 'quads', 'shoulders', 'traps'],
        category: 'compound',
        equipment: 'barbell',
        isDefault: true,
      },
      {
        name: 'Snatch (Barbell)',
        muscleGroups: ['full body', 'shoulders', 'traps', 'hips'],
        category: 'compound',
        equipment: 'barbell',
        isDefault: true,
      },
      {
        name: 'Power Clean (Barbell)',
        muscleGroups: ['quads', 'traps', 'shoulders', 'glutes'],
        category: 'compound',
        equipment: 'barbell',
        isDefault: true,
      },

      // ── Upper Push ────────────────────────────────────────────
      {
        name: 'Overhead Press (Dumbbell)',
        muscleGroups: ['front delts', 'triceps', 'side delts'],
        category: 'compound',
        equipment: 'dumbbell',
        isDefault: true,
      },
      {
        name: 'Incline Bench Press (Barbell)',
        muscleGroups: ['upper chest', 'front delts', 'triceps'],
        category: 'compound',
        equipment: 'barbell',
        isDefault: true,
      },
      {
        name: 'Incline Bench Press (Dumbbell)',
        muscleGroups: ['upper chest', 'front delts', 'triceps'],
        category: 'compound',
        equipment: 'dumbbell',
        isDefault: true,
      },
      {
        name: 'Dips (Bodyweight)',
        muscleGroups: ['chest', 'triceps', 'front delts'],
        category: 'compound',
        equipment: 'bodyweight',
        notes: 'Lean forward slightly for chest emphasis.',
        isDefault: true,
      },
      {
        name: 'Push-ups (Bodyweight)',
        muscleGroups: ['chest', 'triceps', 'front delts'],
        category: 'compound',
        equipment: 'bodyweight',
        isDefault: true,
      },
      {
        name: 'Cable Chest Fly (Cable)',
        muscleGroups: ['chest'],
        category: 'isolation',
        equipment: 'cable',
        isDefault: true,
      },
      {
        name: 'Lateral Raise (Dumbbell)',
        muscleGroups: ['side delts'],
        category: 'isolation',
        equipment: 'dumbbell',
        isDefault: true,
      },
      {
        name: 'Machine Chest Press (Machine)',
        muscleGroups: ['chest', 'triceps'],
        category: 'compound',
        equipment: 'machine',
        isDefault: true,
      },

      // ── Upper Pull ────────────────────────────────────────────
      {
        name: 'Pull-ups (Bodyweight)',
        muscleGroups: ['lats', 'biceps', 'rear delts'],
        category: 'compound',
        equipment: 'bodyweight',
        notes: 'Full range — dead hang to chin over bar.',
        isDefault: true,
      },
      {
        name: 'Chin-ups (Bodyweight)',
        muscleGroups: ['lats', 'biceps'],
        category: 'compound',
        equipment: 'bodyweight',
        isDefault: true,
      },
      {
        name: 'Barbell Row (Barbell)',
        muscleGroups: ['lats', 'traps', 'rear delts', 'biceps'],
        category: 'compound',
        equipment: 'barbell',
        isDefault: true,
      },
      {
        name: 'Dumbbell Row (Dumbbell)',
        muscleGroups: ['lats', 'traps', 'rear delts'],
        category: 'compound',
        equipment: 'dumbbell',
        isDefault: true,
      },
      {
        name: 'Cable Row (Cable)',
        muscleGroups: ['lats', 'traps', 'rear delts'],
        category: 'compound',
        equipment: 'cable',
        isDefault: true,
      },
      {
        name: 'Face Pull (Cable)',
        muscleGroups: ['rear delts', 'traps', 'external rotators'],
        category: 'isolation',
        equipment: 'cable',
        isDefault: true,
      },
      {
        name: 'Lat Pulldown (Cable)',
        muscleGroups: ['lats', 'biceps', 'rear delts'],
        category: 'compound',
        equipment: 'cable',
        isDefault: true,
      },
      {
        name: 'T-Bar Row (Barbell)',
        muscleGroups: ['lats', 'traps', 'rhomboids'],
        category: 'compound',
        equipment: 'barbell',
        isDefault: true,
      },
      {
        name: 'Chest Supported Row (Machine)',
        muscleGroups: ['lats', 'traps', 'rear delts'],
        category: 'compound',
        equipment: 'machine',
        isDefault: true,
      },

      // ── Legs ──────────────────────────────────────────────────
      {
        name: 'Leg Press (Machine)',
        muscleGroups: ['quads', 'glutes', 'hamstrings'],
        category: 'compound',
        equipment: 'machine',
        isDefault: true,
      },
      {
        name: 'Lunges (Barbell)',
        muscleGroups: ['quads', 'glutes', 'hamstrings'],
        category: 'compound',
        equipment: 'barbell',
        isDefault: true,
      },
      {
        name: 'Lunges (Dumbbell)',
        muscleGroups: ['quads', 'glutes', 'hamstrings'],
        category: 'compound',
        equipment: 'dumbbell',
        isDefault: true,
      },
      {
        name: 'Leg Curl (Machine)',
        muscleGroups: ['hamstrings'],
        category: 'isolation',
        equipment: 'machine',
        isDefault: true,
      },
      {
        name: 'Leg Extension (Machine)',
        muscleGroups: ['quads'],
        category: 'isolation',
        equipment: 'machine',
        isDefault: true,
      },
      {
        name: 'Calf Raises (Machine)',
        muscleGroups: ['calves'],
        category: 'isolation',
        equipment: 'machine',
        isDefault: true,
      },
      {
        name: 'Calf Raises (Barbell)',
        muscleGroups: ['calves'],
        category: 'isolation',
        equipment: 'barbell',
        isDefault: true,
      },
      {
        name: 'Hip Thrust (Barbell)',
        muscleGroups: ['glutes', 'hamstrings'],
        category: 'compound',
        equipment: 'barbell',
        isDefault: true,
      },
      {
        name: 'Hack Squat (Machine)',
        muscleGroups: ['quads', 'glutes'],
        category: 'compound',
        equipment: 'machine',
        isDefault: true,
      },
      {
        name: 'Bulgarian Split Squat (Dumbbell)',
        muscleGroups: ['quads', 'glutes', 'hamstrings'],
        category: 'compound',
        equipment: 'dumbbell',
        isDefault: true,
      },
      {
        name: 'Romanian Deadlift (Dumbbell)',
        muscleGroups: ['hamstrings', 'glutes'],
        category: 'compound',
        equipment: 'dumbbell',
        isDefault: true,
      },

      // ── Arms ──────────────────────────────────────────────────
      {
        name: 'Bicep Curl (Barbell)',
        muscleGroups: ['biceps', 'forearms'],
        category: 'isolation',
        equipment: 'barbell',
        isDefault: true,
      },
      {
        name: 'Bicep Curl (Dumbbell)',
        muscleGroups: ['biceps', 'forearms'],
        category: 'isolation',
        equipment: 'dumbbell',
        isDefault: true,
      },
      {
        name: 'Hammer Curl (Dumbbell)',
        muscleGroups: ['biceps', 'brachialis', 'forearms'],
        category: 'isolation',
        equipment: 'dumbbell',
        isDefault: true,
      },
      {
        name: 'Preacher Curl (Barbell)',
        muscleGroups: ['biceps'],
        category: 'isolation',
        equipment: 'barbell',
        isDefault: true,
      },
      {
        name: 'Cable Bicep Curl (Cable)',
        muscleGroups: ['biceps'],
        category: 'isolation',
        equipment: 'cable',
        isDefault: true,
      },
      {
        name: 'Tricep Pushdown (Cable)',
        muscleGroups: ['triceps'],
        category: 'isolation',
        equipment: 'cable',
        isDefault: true,
      },
      {
        name: 'Skull Crushers (Barbell)',
        muscleGroups: ['triceps'],
        category: 'isolation',
        equipment: 'barbell',
        notes: 'Lower bar to forehead with elbows fixed.',
        isDefault: true,
      },
      {
        name: 'Tricep Overhead Extension (Dumbbell)',
        muscleGroups: ['triceps'],
        category: 'isolation',
        equipment: 'dumbbell',
        isDefault: true,
      },
      {
        name: 'Close Grip Bench Press (Barbell)',
        muscleGroups: ['triceps', 'chest'],
        category: 'compound',
        equipment: 'barbell',
        isDefault: true,
      },
      {
        name: 'Tricep Dips (Bodyweight)',
        muscleGroups: ['triceps', 'chest'],
        category: 'compound',
        equipment: 'bodyweight',
        isDefault: true,
      },

      // ── Core ──────────────────────────────────────────────────
      {
        name: 'Plank (Bodyweight)',
        muscleGroups: ['core', 'transverse abdominis'],
        category: 'isolation',
        equipment: 'bodyweight',
        notes: 'Log reps as seconds held.',
        isDefault: true,
      },
      {
        name: 'Ab Wheel Rollout (Other)',
        muscleGroups: ['core', 'lats'],
        category: 'compound',
        equipment: 'other',
        isDefault: true,
      },
      {
        name: 'Cable Crunch (Cable)',
        muscleGroups: ['core', 'rectus abdominis'],
        category: 'isolation',
        equipment: 'cable',
        isDefault: true,
      },
      {
        name: 'Hanging Leg Raise (Bodyweight)',
        muscleGroups: ['core', 'hip flexors'],
        category: 'isolation',
        equipment: 'bodyweight',
        isDefault: true,
      },
      {
        name: 'Sit-ups (Bodyweight)',
        muscleGroups: ['core'],
        category: 'isolation',
        equipment: 'bodyweight',
        isDefault: true,
      },
      {
        name: 'Russian Twist (Dumbbell)',
        muscleGroups: ['core', 'obliques'],
        category: 'isolation',
        equipment: 'dumbbell',
        isDefault: true,
      },
      {
        name: 'Dead Bug (Bodyweight)',
        muscleGroups: ['core', 'transverse abdominis'],
        category: 'isolation',
        equipment: 'bodyweight',
        isDefault: true,
      },
      {
        name: 'Pallof Press (Cable)',
        muscleGroups: ['core', 'obliques'],
        category: 'isolation',
        equipment: 'cable',
        isDefault: true,
      },

      // ── Shoulders ─────────────────────────────────────────────
      {
        name: 'Arnold Press (Dumbbell)',
        muscleGroups: ['front delts', 'side delts', 'triceps'],
        category: 'compound',
        equipment: 'dumbbell',
        isDefault: true,
      },
      {
        name: 'Upright Row (Barbell)',
        muscleGroups: ['traps', 'side delts'],
        category: 'compound',
        equipment: 'barbell',
        isDefault: true,
      },
      {
        name: 'Rear Delt Fly (Dumbbell)',
        muscleGroups: ['rear delts', 'traps'],
        category: 'isolation',
        equipment: 'dumbbell',
        isDefault: true,
      },
      {
        name: 'Shrugs (Barbell)',
        muscleGroups: ['traps'],
        category: 'isolation',
        equipment: 'barbell',
        isDefault: true,
      },
      {
        name: 'Shrugs (Dumbbell)',
        muscleGroups: ['traps'],
        category: 'isolation',
        equipment: 'dumbbell',
        isDefault: true,
      },
    ];

    let count = 0;
    for (const ex of exercises) {
      await ctx.db.insert('exercises', ex);
      count++;
    }

    return { seeded: count, message: `Seeded ${count} exercises` };
  },
});
```

- [ ] **Step 2: Run the seed via Convex dashboard or a one-time script**

Open your Convex dashboard → Functions → `seed:run` → click "Run". Or call it from a test component temporarily. The seed guard (`by_default` index check) makes it safe to call multiple times.

- [ ] **Step 3: Commit**

```bash
git add convex/seed.ts
git commit -m "feat: seed 62 default exercises across powerlifting, olympic, push/pull, legs, arms, core"
```

---

### Task 3: 1RM Utility

**Files:**
- Create: `src/lib/oneRepMax.ts`
- Create: `src/lib/oneRepMax.test.ts`
- Create: `convex/lib/oneRepMax.ts` (identical copy — Convex functions can't import from `src/`)

- [ ] **Step 1: Write the failing tests first**

Create `src/lib/oneRepMax.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { calculateOneRepMax } from './oneRepMax';

describe('calculateOneRepMax', () => {
  it('returns weight directly when reps === 1 (actual 1RM)', () => {
    const result = calculateOneRepMax(140, 1);
    expect(result.value).toBe(140);
    expect(result.source).toBe('actual');
    expect(result.formula).toBeUndefined();
  });

  it('applies Epley formula for reps > 1', () => {
    // Epley: weight * (1 + reps / 30)
    // 100 * (1 + 10/30) = 100 * 1.333... = 133.3
    const result = calculateOneRepMax(100, 10);
    expect(result.value).toBe(133.3);
    expect(result.source).toBe('calculated');
    expect(result.formula).toBe('epley');
  });

  it('rounds to 1 decimal place', () => {
    // 90 * (1 + 8/30) = 90 * 1.2666... = 114.0
    const result = calculateOneRepMax(90, 8);
    expect(result.value).toBe(114);
  });

  it('handles reps = 5 correctly', () => {
    // 100 * (1 + 5/30) = 100 * 1.1666... = 116.7
    const result = calculateOneRepMax(100, 5);
    expect(result.value).toBe(116.7);
  });

  it('handles fractional weight', () => {
    // 102.5 * (1 + 3/30) = 102.5 * 1.1 = 112.75 → rounds to 112.8
    const result = calculateOneRepMax(102.5, 3);
    expect(result.value).toBe(112.8);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test
```

Expected: 5 failures — "Cannot find module './oneRepMax'"

- [ ] **Step 3: Implement `src/lib/oneRepMax.ts`**

```ts
export interface OneRepMaxResult {
  value: number;
  source: 'actual' | 'calculated';
  formula?: 'epley';
}

/**
 * Calculate 1RM using the Epley formula.
 * - reps === 1: weight is the actual 1RM (no formula)
 * - reps > 1: 1RM = weight × (1 + reps / 30), rounded to 1 decimal
 */
export function calculateOneRepMax(weight: number, reps: number): OneRepMaxResult {
  if (reps === 1) {
    return { value: weight, source: 'actual' };
  }
  const raw = weight * (1 + reps / 30);
  const value = Math.round(raw * 10) / 10;
  return { value, source: 'calculated', formula: 'epley' };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test
```

Expected: 5 passing

- [ ] **Step 5: Copy to `convex/lib/oneRepMax.ts`**

Create `convex/lib/` directory and copy the file verbatim (Convex can't import from `src/`):

```bash
mkdir -p convex/lib
cp src/lib/oneRepMax.ts convex/lib/oneRepMax.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/ convex/lib/
git commit -m "feat: 1RM utility (Epley) with vitest tests"
```

---

### Task 4: Spotify Dark Theme + Root Layout

**Files:**
- Replace: `src/styles.css`
- Modify: `src/main.tsx`
- Replace: `src/routes/__root.tsx`
- Create: `src/components/AppShell.tsx`
- Create: `src/components/Sidebar.tsx`
- Create: `src/components/BottomTabBar.tsx`
- Create: `src/components/OfflineBanner.tsx`

- [ ] **Step 1: Replace `src/styles.css` with Spotify dark theme**

Completely replace the file contents:

```css
@import "tailwindcss";

:root {
  /* Spotify dark design tokens */
  --bg: #000000;
  --surface: #1a1a1a;
  --surface-2: #242424;
  --accent: #1DB954;
  --accent-hover: #1ed760;
  --accent-dim: rgba(29, 185, 84, 0.08);
  --text: #ffffff;
  --text-muted: #b3b3b3;
  --border: rgba(255, 255, 255, 0.1);

  /* shadcn/ui CSS variable mapping */
  --background: 0 0% 0%;
  --foreground: 0 0% 100%;
  --card: 0 0% 10%;
  --card-foreground: 0 0% 100%;
  --popover: 0 0% 10%;
  --popover-foreground: 0 0% 100%;
  --primary: 141 73% 42%;
  --primary-foreground: 0 0% 0%;
  --secondary: 0 0% 14%;
  --secondary-foreground: 0 0% 100%;
  --muted: 0 0% 14%;
  --muted-foreground: 0 0% 70%;
  --accent: 141 73% 42%;
  --accent-foreground: 0 0% 0%;
  --destructive: 0 84% 60%;
  --border: 0 0% 100% / 10%;
  --input: 0 0% 14%;
  --ring: 141 73% 42%;
  --radius: 0.5rem;
}

* {
  box-sizing: border-box;
}

html,
body,
#app {
  min-height: 100%;
  background-color: var(--bg);
  color: var(--text);
}

body {
  margin: 0;
  font-family: ui-sans-serif, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Remove default link styles */
a {
  color: inherit;
  text-decoration: none;
}
```

- [ ] **Step 2: Update `src/main.tsx` to wrap with ConvexProvider**

```tsx
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { routeTree } from './routeTree.gen';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('app')!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <ConvexProvider client={convex}>
      <RouterProvider router={router} />
    </ConvexProvider>,
  );
}
```

- [ ] **Step 3: Create `src/components/OfflineBanner.tsx`**

```tsx
import { useConvexConnectionState } from 'convex/react';

export function OfflineBanner() {
  const { isConnected } = useConvexConnectionState();
  if (isConnected) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center py-2 px-4 bg-yellow-500/10 border-b border-yellow-500/20">
      <p className="text-xs text-yellow-400 font-medium">
        You're offline — changes will sync when reconnected
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/BottomTabBar.tsx`**

```tsx
import { Link, useRouterState } from '@tanstack/react-router';
import { LayoutDashboard, Dumbbell, ClipboardList, TrendingUp, BookOpen } from 'lucide-react';

const tabs = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/log', label: 'Log', Icon: Dumbbell },
  { to: '/exercises', label: 'Exercises', Icon: BookOpen },
  { to: '/routines', label: 'Routines', Icon: ClipboardList },
  { to: '/progress', label: 'Progress', Icon: TrendingUp },
] as const;

export function BottomTabBar() {
  const { location } = useRouterState();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border)] bg-[var(--surface)] sm:hidden">
      <div className="flex items-stretch">
        {tabs.map(({ to, label, Icon }) => {
          const active = location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={[
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
              ].join(' ')}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 5: Create `src/components/Sidebar.tsx`**

```tsx
import { useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Dumbbell,
  ClipboardList,
  TrendingUp,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/log', label: 'Log Workout', Icon: Dumbbell },
  { to: '/exercises', label: 'Exercises', Icon: BookOpen },
  { to: '/routines', label: 'Routines', Icon: ClipboardList },
  { to: '/progress', label: 'Progress', Icon: TrendingUp },
] as const;

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { location } = useRouterState();

  return (
    <aside
      className={[
        'hidden sm:flex flex-col h-screen sticky top-0 border-r border-[var(--border)] bg-[var(--surface)] transition-all duration-200',
        collapsed ? 'w-16' : 'w-56',
      ].join(' ')}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-[var(--border)]">
        <div
          className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center font-black text-black text-sm"
          style={{ background: 'var(--accent)' }}
        >
          W
        </div>
        {!collapsed && (
          <span className="font-bold text-sm text-white truncate">Workout Tracker</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
        {navItems.map(({ to, label, Icon }) => {
          const active = location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={[
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5',
              ].join(' ')}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 1.75} className="shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-center p-3 border-t border-[var(--border)] text-[var(--text-muted)] hover:text-white transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
```

- [ ] **Step 6: Create `src/components/AppShell.tsx`**

```tsx
import { Outlet } from '@tanstack/react-router';
import { Sidebar } from './Sidebar';
import { BottomTabBar } from './BottomTabBar';
import { OfflineBanner } from './OfflineBanner';

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <OfflineBanner />
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-16 sm:pb-0">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  );
}
```

- [ ] **Step 7: Replace `src/routes/__root.tsx`**

The root route renders `AppShell` for all routes **except** `/` (the intro page, which has its own standalone layout).

```tsx
import { Outlet, createRootRoute, useRouterState } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { api } from '@convex/_generated/api';
import { AppShell } from '#/components/AppShell';
import '../styles.css';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const { location } = useRouterState();
  const isIntroPage = location.pathname === '/';

  // Active session redirect: if any session is active, redirect to /log/:sessionId
  // This runs on all routes (including intro) to ensure we never show stale intro
  const activeSession = useQuery(api.workoutSessions.getActive);
  const navigate = useNavigate();

  useEffect(() => {
    if (activeSession) {
      void navigate({
        to: '/log/$sessionId',
        params: { sessionId: activeSession._id },
        replace: true,
      });
    }
  }, [activeSession, navigate]);

  if (isIntroPage) {
    // Intro page uses its own standalone layout — no AppShell
    return <Outlet />;
  }

  return <AppShell />;
}
```

> **Note:** `api.workoutSessions.getActive` will be implemented in Part 2 (Task 8). Until then, TypeScript will complain — that's expected. The file is correct once `convex/workoutSessions.ts` is created.

- [ ] **Step 8: Start the dev server and verify layout renders**

```bash
npm run dev
```

Navigate to `http://localhost:3000/dashboard` — you should see the sidebar on desktop and the bottom tab bar below a blank content area. No runtime errors.

- [ ] **Step 9: Commit**

```bash
git add src/
git commit -m "feat: spotify dark theme, ConvexProvider, AppShell with sidebar and bottom tabs"
```

---

## Part 1 Complete

At this point you have:
- All dependencies installed
- Convex schema with 5 tables and indexes
- 62 seeded exercises
- Tested 1RM utility (Epley)
- Spotify dark CSS theme replacing the ocean scaffold theme
- ConvexProvider wrapping the app
- AppShell with collapsible sidebar (desktop) and fixed bottom tabs (mobile)
- Offline connectivity banner

**Continue with:** `2026-04-17-workout-tracker-part2-pages.md`
