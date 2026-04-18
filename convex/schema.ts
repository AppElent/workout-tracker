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
