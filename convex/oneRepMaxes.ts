import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getCurrentForExercise = query({
  args: { exerciseId: v.id('exercises') },
  handler: async (ctx, { exerciseId }) => {
    return ctx.db
      .query('oneRepMaxes')
      .withIndex('by_exercise', (q) => q.eq('exerciseId', exerciseId))
      .order('desc')
      .first();
  },
});

export const listForExercise = query({
  args: { exerciseId: v.id('exercises') },
  handler: async (ctx, { exerciseId }) => {
    return ctx.db
      .query('oneRepMaxes')
      .withIndex('by_exercise', (q) => q.eq('exerciseId', exerciseId))
      .order('asc')
      .collect();
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
    return ctx.db.insert('oneRepMaxes', {
      exerciseId: args.exerciseId,
      value: args.value,
      unit: args.unit,
      date: args.date ?? Date.now(),
      source: 'manual',
    });
  },
});

export const calculateAndStore = mutation({
  args: {
    exerciseId: v.id('exercises'),
    weight: v.number(),
    reps: v.number(),
    unit: v.union(v.literal('kg'), v.literal('lbs')),
  },
  handler: async (ctx, { exerciseId, weight, reps, unit }) => {
    const { calculateOneRepMax } = await import('./lib/oneRepMax');
    const { value, source, formula } = calculateOneRepMax(weight, reps);

    const existing = await ctx.db
      .query('oneRepMaxes')
      .withIndex('by_exercise', (q) => q.eq('exerciseId', exerciseId))
      .collect();

    const hasManual = existing.some((r) => r.source === 'manual');
    if (hasManual) return null;

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
