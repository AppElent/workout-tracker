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

    const sets = await ctx.db
      .query('sets')
      .withIndex('by_exercise', (q) => q.eq('exerciseId', id))
      .collect();
    for (const set of sets) {
      await ctx.db.delete(set._id);
    }

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

// Returns all sets for an exercise with session metadata
export const getHistory = query({
  args: { exerciseId: v.id('exercises') },
  handler: async (ctx, { exerciseId }) => {
    const sets = await ctx.db
      .query('sets')
      .withIndex('by_exercise', (q) => q.eq('exerciseId', exerciseId))
      .order('asc')
      .collect();

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
