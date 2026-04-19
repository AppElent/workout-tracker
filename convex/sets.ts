import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { calculateOneRepMax } from './lib/oneRepMax';

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

export const remove = mutation({
  args: { id: v.id('sets') },
  handler: async (ctx, { id }) => {
    const set = await ctx.db.get(id);
    if (!set) return;

    await ctx.db.delete(id);

    const orms = await ctx.db
      .query('oneRepMaxes')
      .withIndex('by_exercise', (q) => q.eq('exerciseId', set.exerciseId))
      .collect();

    for (const orm of orms) {
      if (orm.source !== 'manual') await ctx.db.delete(orm._id);
    }

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
