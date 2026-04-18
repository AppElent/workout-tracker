import { query } from './_generated/server';
import { v } from 'convex/values';

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
