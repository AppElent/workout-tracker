import { query } from './_generated/server';
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
