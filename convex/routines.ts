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
