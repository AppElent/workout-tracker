# Workout Tracker — Design Spec
**Date:** 2026-04-16
**Status:** Approved

---

## Overview

A personal web-based fitness tracker for logging workouts, tracking 1RM (one-rep max) per exercise, and visualizing strength progress over time. Data is persisted in Convex (real-time reactive DB). No server-side rendering needed — pure SPA.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | TanStack Router (Router-only SPA, `--router-only`) |
| Database | Convex |
| UI Components | shadcn/ui (Radix + Tailwind) |
| Forms | TanStack Form + Zod (frontend validation only) |
| Tables | TanStack Table |
| Charts | Recharts |
| Linter/Formatter | Biome |
| Package Manager | npm |

> **Schema validation:** Convex native validators (`v.string()` etc.) in `convex/schema.ts` for DB-level validation. Zod schemas are used exclusively for frontend form validation (TanStack Form). Do not replace Convex validators with Zod.

**Scaffold command** *(already executed)*:
```
npx @tanstack/cli create workout-tracker --package-manager npm --add-ons biome,convex,shadcn-ui,tanstack-form,tanstack-table --router-only
```

---

## Navigation

**Responsive hybrid:**
- Desktop: collapsible left sidebar
- Mobile: fixed bottom tab bar

**Top-level routes:**

| Route | Page | Description |
|---|---|---|
| `/` | Intro | Visually appealing landing page — standalone layout, no sidebar |
| `/dashboard` | Dashboard | Recent sessions, quick-log CTA, top 1RMs per exercise |
| `/log` | Log Workout | Start a new session (free-form or from routine) |
| `/log/:sessionId` | Active Session | Live logging view — exercises + inline set rows |
| `/exercises` | Exercise Library | Searchable, filterable by muscle group / category |
| `/exercises/:id` | Exercise Detail | Full history, 1RM chart, all sets |
| `/routines` | Routines | Create, edit, start workout templates |
| `/progress` | Progress | Per-exercise 1RM timeline + weekly volume charts |

> **Layout exception:** `/` uses a full-screen standalone layout with its own inline top navigation. All other routes use the standard responsive shell (collapsible sidebar on desktop, bottom tab bar on mobile).

---

## Intro Page (`/`)

### Design System
Spotify-inspired dark aesthetic via `npx getdesign@latest add spotify`. The resulting `DESIGN.md` is the source of truth for design tokens.

| Token | Value |
|---|---|
| Background | `#000` |
| Surface | `#1a1a1a` |
| Primary accent | `#1DB954` |
| Text primary | `#ffffff` |
| Text secondary | `#b3b3b3` |
| Display weight | 900 |

### Layout
Full-screen standalone — no sidebar, no bottom tab bar. The page fills the entire viewport with a black background and two CSS-only radial-gradient green glow blobs:
- Top-left: `radial-gradient(circle, rgba(29,185,84,0.12), transparent 65%)`, 400×400 px
- Bottom-right: `radial-gradient(circle, rgba(29,185,84,0.06), transparent 65%)`, 300×300 px

### Top Navigation
- **Left:** Logo icon (30×30 px, `#1DB954` fill, `#000` "W", border-radius 6px) + "Workout Tracker" wordmark (white, 700)
- **Right:** Links to `/exercises`, `/progress`, `/routines` — 12px, 600, `#b3b3b3`, uppercase, letter-spacing 1.2px
- **Mobile (<640px):** Nav links hidden; logo only. Users reach other routes via the CTA buttons.

### Hero (bottom-anchored)
Content is anchored to the bottom of the viewport (`justify-content: flex-end`, `padding-bottom: 48px`):

1. **Eyebrow** — "Your gym. Your data." — `#1DB954`, 12px, 700, uppercase, letter-spacing 2px
2. **Headline line 1** — "Track every lift." — white, 52px, weight 900, letter-spacing -1.5px
3. **Headline line 2** — "Own every PR." — `#1DB954`, same size
4. **Subtitle** — "Log sets, track 1RMs, and watch your strength compound — session by session." — `#b3b3b3`, 15px, line-height 1.6, max-width 420px
5. **CTA row:**
   - Primary button: "Start Workout" → `/log` — `#1DB954` bg, `#000` text, 700, border-radius 50px
   - Secondary link: "Browse exercises →" → `/exercises` — `#b3b3b3`, arrow in `#1DB954`

---

## Data Model (Convex)

### `exercises`
```ts
{
  name: string,
  muscleGroups: string[],       // e.g. ["chest", "triceps"]
  category: "compound" | "isolation",
  equipment: "barbell" | "dumbbell" | "cable" | "bodyweight" | "machine" | "kettlebell" | "band" | "other",
  notes?: string,               // optional usage tips or form cues
  isDefault: boolean,           // true = seeded (read-only for user), false = user-created
  userId?: string,              // reserved for future auth — undefined on default exercises
}
```

> **Equipment variants:** Each equipment variant is a separate exercise entry (e.g. "Bench Press (Barbell)" and "Bench Press (Dumbbell)"). This gives each variant its own independent 1RM history. The seed list includes both variants where relevant.
>
> **Read-only default exercises:** Exercises where `isDefault: true` cannot be edited or deleted by the user. Users can create custom exercises (`isDefault: false`) which they own.

### `workoutSessions`
```ts
{
  date: number,                 // Unix timestamp (calendar date of session)
  startTime: number,            // Unix timestamp (when session was started)
  name?: string,                // e.g. "Push Day A"
  routineId?: Id<"routines">,
  notes?: string,
  status: "active" | "completed" | "cancelled",
  completedAt?: number,         // set when status = "completed"
  userId?: string,              // reserved for future auth
}
```

### `sets`
```ts
{
  sessionId: Id<"workoutSessions">,
  exerciseId: Id<"exercises">,
  setNumber: number,
  reps: number,
  weight: number,
  unit: "kg" | "lbs",
  rpe?: number,                 // Rate of Perceived Exertion, 1–10
  setType: "warmup" | "working" | "drop" | "failure",
  loggedAt: number,             // Unix timestamp
}
```

### `oneRepMaxes`
```ts
{
  exerciseId: Id<"exercises">,
  value: number,
  unit: "kg" | "lbs",
  date: number,
  source: "manual" | "calculated" | "actual",  // "actual" = logged with reps == 1
  formula?: "epley",            // only set when source = "calculated"
  userId?: string,              // reserved for future auth
}
```

### `routines`
```ts
{
  name: string,
  exercises: Array<{
    exerciseId: Id<"exercises">,
    defaultSets: number,
    defaultReps: number,
    defaultWeight?: number,
  }>,
  userId?: string,              // reserved for future auth
}
```

---

## Core Features

### Active Session Redirect
- Only one session can be active at a time — enforced in the Convex mutation that creates sessions
- On app load, the root route (`/`) checks for an active session and redirects if one is found:
  - **v1 (no auth):** redirects if any `workoutSessions` record with `status: "active"` exists
  - **v1.5 (Clerk auth):** condition becomes `isAuthenticated && hasActiveSession(user.id)` — the check should be structured so this is a one-line addition
- The redirect goes to `/log/:sessionId`; the intro page is never shown during an active session
- `/dashboard` and `/log` both show a banner/CTA to resume the active session if one exists

### Workout Logging (`/log/:sessionId`)
- Exercises are added one at a time from the library (searchable modal)
- Each exercise displays as a section with set rows:
  - **Desktop:** Inline row table with columns `#`, `Type`, `kg`, `Reps`, `RPE`, `✓`
  - **Mobile:** Card-based layout — one card per set with the same fields, stacked vertically
- Rows are added with "+ Add set"; completed by tapping ✓
- On set completion: 1RM auto-calculated and silently updated if new value exceeds stored max
- Session can be started from scratch (free-form) or from a routine template (pre-populates exercises + default sets)
- "Finish Workout" sets `status: "completed"` and saves `completedAt` timestamp

### 1RM Tracking
- **Actual 1RM:** If `reps == 1`, the logged weight is stored directly as `source: "actual"` — no formula applied
- **Estimated 1RM:** If `reps > 1`, Epley formula is applied: `1RM = weight × (1 + reps / 30)`, stored as `source: "calculated"`
- New records are stored in `oneRepMaxes` only when the new value exceeds the current max
- **Manual entry** always takes precedence — stored as `source: "manual"`, not overwritten by calculations unless user explicitly clears it
- Visible on Exercise Detail page as the current 1RM with source label (`manual`, `actual`, or `estimated`)

### Exercise Library (`/exercises`)
- TanStack Table with columns: Name, Muscle Groups, Category, Equipment
- Client-side filtering by muscle group, category, equipment
- Search by name
- "Add Custom Exercise" form (TanStack Form) at bottom
- ~60–80 seeded default exercises covering:
  - Powerlifting: Squat, Bench Press, Deadlift, Romanian Deadlift, etc.
  - Olympic: Clean & Jerk, Snatch, Power Clean
  - Upper Push: Overhead Press, Dumbbell Press, Dips, Push-ups
  - Upper Pull: Pull-ups, Barbell Row, Cable Row, Face Pull
  - Legs: Leg Press, Lunges, Leg Curl, Calf Raises
  - Arms: Bicep Curl, Tricep Pushdown, Hammer Curl
  - Core: Plank, Ab Wheel, Cable Crunch

### Routines (`/routines`)
- Create named routine templates with ordered exercises + default sets/reps
- Optional — sessions can always be started without a routine
- Starting a routine pre-populates the active session with exercises and empty set rows

### Progress (`/progress`)
- Exercise selector → shows 1RM over time (line chart, Recharts)
- Weekly volume chart (total kg lifted per week)
- All charts pull from Convex reactive queries — update in real time as sets are logged

---

## 1RM Calculation

**Formula:** Epley (default, only formula at launch)
```
1RM = weight × (1 + reps / 30)
```

**Logic:**
1. On set completion:
   - If `reps == 1`: the logged weight **is** the actual 1RM — store with `source: "actual"`, no formula applied
   - If `reps > 1`: calculate estimated 1RM using Epley, store with `source: "calculated"` and `formula: "epley"`
2. Fetch current max from `oneRepMaxes` for that exercise
3. If new value > current max (or no record exists): insert new record
4. If `source: "manual"` exists: do not overwrite automatically
5. Show estimated/actual 1RM inline next to the completed set row as a subtle label

**"Current 1RM" Query Rule:**
- If a `source: "manual"` record exists → use the **most recent manual entry** (manual always takes precedence)
- Otherwise → use the highest `source: "calculated"` or `source: "actual"` value across all time

---

## Seeding

A Convex seed mutation (`convex/seed.ts`) populates the default exercise list on first run. Guarded by checking `isDefault` count before inserting to avoid duplicates.

---

## Delete Flows

### Sets
- Users can delete any individual set from a session (active or completed)
- After deletion, 1RM records for that exercise are **recalculated**: the highest estimated/actual 1RM across remaining sets is recomputed; if it no longer exceeds the stored max, the record is updated

### Sessions
- Users can delete a completed or active session
- Deleting a session **cascades**: all associated `sets` records are deleted
- After session deletion, `oneRepMaxes` records sourced from that session's sets are recalculated across all remaining sessions. Records with `source: "manual"` are never affected by session deletion.

### Custom Exercises
- Users can delete exercises where `isDefault: false`
- Default exercises (`isDefault: true`) cannot be deleted
- Deleting a custom exercise also removes all associated `sets` and `oneRepMaxes` records for that exercise

---

## PWA & Connectivity

The app is not a full offline-first PWA. Convex optimistic updates provide perceived instant feedback even on slow connections.

**Behavior on connection loss:**
- App detects loss of Convex connection and displays a non-blocking banner: *"You're offline — changes will sync when reconnected"*
- In-progress set inputs are not lost (held in local component state)
- Data syncs automatically when connection is restored

Full offline write support (service workers, local queue, conflict resolution) is out of scope for v1.

---

## Error Handling

- Convex mutations optimistically update the UI; failures surface via toast notifications (shadcn/ui `<Sonner>`)
- Active session state is persisted in Convex in real time — no data loss on browser close
- No auth in v1 — single-user app, no login required. `userId` fields are reserved on all tables for future auth (v1.5).

---

## Out of Scope (v1)

- **Authentication / multi-user** — `userId` fields are reserved on all tables; Clerk integration planned for v1.5
- Body weight / cardio tracking
- Rest timers
- Multiple 1RM formulas (Brzycki, Lander) — Epley only at launch
- Export / import
- Social / sharing
- Full offline write support (service workers, local queue) — connectivity banner is sufficient for v1
