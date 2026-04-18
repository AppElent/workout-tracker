import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

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
