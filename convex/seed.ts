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
      // Powerlifting
      { name: 'Squat (Barbell)', muscleGroups: ['quads', 'glutes', 'hamstrings', 'core'], category: 'compound', equipment: 'barbell', notes: 'Keep chest up, knees tracking over toes.', isDefault: true },
      { name: 'Bench Press (Barbell)', muscleGroups: ['chest', 'triceps', 'front delts'], category: 'compound', equipment: 'barbell', notes: 'Retract scapula, slight arch, bar to lower chest.', isDefault: true },
      { name: 'Bench Press (Dumbbell)', muscleGroups: ['chest', 'triceps', 'front delts'], category: 'compound', equipment: 'dumbbell', isDefault: true },
      { name: 'Deadlift (Barbell)', muscleGroups: ['hamstrings', 'glutes', 'back', 'traps'], category: 'compound', equipment: 'barbell', notes: 'Hinge at hips, bar stays close to shins.', isDefault: true },
      { name: 'Romanian Deadlift (Barbell)', muscleGroups: ['hamstrings', 'glutes', 'lower back'], category: 'compound', equipment: 'barbell', isDefault: true },
      { name: 'Front Squat (Barbell)', muscleGroups: ['quads', 'core', 'upper back'], category: 'compound', equipment: 'barbell', isDefault: true },
      { name: 'Overhead Press (Barbell)', muscleGroups: ['front delts', 'triceps', 'upper chest'], category: 'compound', equipment: 'barbell', notes: 'Press bar in a straight line, lock out overhead.', isDefault: true },
      // Olympic
      { name: 'Clean & Jerk (Barbell)', muscleGroups: ['full body', 'quads', 'shoulders', 'traps'], category: 'compound', equipment: 'barbell', isDefault: true },
      { name: 'Snatch (Barbell)', muscleGroups: ['full body', 'shoulders', 'traps', 'hips'], category: 'compound', equipment: 'barbell', isDefault: true },
      { name: 'Power Clean (Barbell)', muscleGroups: ['quads', 'traps', 'shoulders', 'glutes'], category: 'compound', equipment: 'barbell', isDefault: true },
      // Upper Push
      { name: 'Overhead Press (Dumbbell)', muscleGroups: ['front delts', 'triceps', 'side delts'], category: 'compound', equipment: 'dumbbell', isDefault: true },
      { name: 'Incline Bench Press (Barbell)', muscleGroups: ['upper chest', 'front delts', 'triceps'], category: 'compound', equipment: 'barbell', isDefault: true },
      { name: 'Incline Bench Press (Dumbbell)', muscleGroups: ['upper chest', 'front delts', 'triceps'], category: 'compound', equipment: 'dumbbell', isDefault: true },
      { name: 'Dips (Bodyweight)', muscleGroups: ['chest', 'triceps', 'front delts'], category: 'compound', equipment: 'bodyweight', notes: 'Lean forward slightly for chest emphasis.', isDefault: true },
      { name: 'Push-ups (Bodyweight)', muscleGroups: ['chest', 'triceps', 'front delts'], category: 'compound', equipment: 'bodyweight', isDefault: true },
      { name: 'Cable Chest Fly (Cable)', muscleGroups: ['chest'], category: 'isolation', equipment: 'cable', isDefault: true },
      { name: 'Lateral Raise (Dumbbell)', muscleGroups: ['side delts'], category: 'isolation', equipment: 'dumbbell', isDefault: true },
      { name: 'Machine Chest Press (Machine)', muscleGroups: ['chest', 'triceps'], category: 'compound', equipment: 'machine', isDefault: true },
      // Upper Pull
      { name: 'Pull-ups (Bodyweight)', muscleGroups: ['lats', 'biceps', 'rear delts'], category: 'compound', equipment: 'bodyweight', notes: 'Full range — dead hang to chin over bar.', isDefault: true },
      { name: 'Chin-ups (Bodyweight)', muscleGroups: ['lats', 'biceps'], category: 'compound', equipment: 'bodyweight', isDefault: true },
      { name: 'Barbell Row (Barbell)', muscleGroups: ['lats', 'traps', 'rear delts', 'biceps'], category: 'compound', equipment: 'barbell', isDefault: true },
      { name: 'Dumbbell Row (Dumbbell)', muscleGroups: ['lats', 'traps', 'rear delts'], category: 'compound', equipment: 'dumbbell', isDefault: true },
      { name: 'Cable Row (Cable)', muscleGroups: ['lats', 'traps', 'rear delts'], category: 'compound', equipment: 'cable', isDefault: true },
      { name: 'Face Pull (Cable)', muscleGroups: ['rear delts', 'traps', 'external rotators'], category: 'isolation', equipment: 'cable', isDefault: true },
      { name: 'Lat Pulldown (Cable)', muscleGroups: ['lats', 'biceps', 'rear delts'], category: 'compound', equipment: 'cable', isDefault: true },
      { name: 'T-Bar Row (Barbell)', muscleGroups: ['lats', 'traps', 'rhomboids'], category: 'compound', equipment: 'barbell', isDefault: true },
      { name: 'Chest Supported Row (Machine)', muscleGroups: ['lats', 'traps', 'rear delts'], category: 'compound', equipment: 'machine', isDefault: true },
      // Legs
      { name: 'Leg Press (Machine)', muscleGroups: ['quads', 'glutes', 'hamstrings'], category: 'compound', equipment: 'machine', isDefault: true },
      { name: 'Lunges (Barbell)', muscleGroups: ['quads', 'glutes', 'hamstrings'], category: 'compound', equipment: 'barbell', isDefault: true },
      { name: 'Lunges (Dumbbell)', muscleGroups: ['quads', 'glutes', 'hamstrings'], category: 'compound', equipment: 'dumbbell', isDefault: true },
      { name: 'Leg Curl (Machine)', muscleGroups: ['hamstrings'], category: 'isolation', equipment: 'machine', isDefault: true },
      { name: 'Leg Extension (Machine)', muscleGroups: ['quads'], category: 'isolation', equipment: 'machine', isDefault: true },
      { name: 'Calf Raises (Machine)', muscleGroups: ['calves'], category: 'isolation', equipment: 'machine', isDefault: true },
      { name: 'Calf Raises (Barbell)', muscleGroups: ['calves'], category: 'isolation', equipment: 'barbell', isDefault: true },
      { name: 'Hip Thrust (Barbell)', muscleGroups: ['glutes', 'hamstrings'], category: 'compound', equipment: 'barbell', isDefault: true },
      { name: 'Hack Squat (Machine)', muscleGroups: ['quads', 'glutes'], category: 'compound', equipment: 'machine', isDefault: true },
      { name: 'Bulgarian Split Squat (Dumbbell)', muscleGroups: ['quads', 'glutes', 'hamstrings'], category: 'compound', equipment: 'dumbbell', isDefault: true },
      { name: 'Romanian Deadlift (Dumbbell)', muscleGroups: ['hamstrings', 'glutes'], category: 'compound', equipment: 'dumbbell', isDefault: true },
      // Arms
      { name: 'Bicep Curl (Barbell)', muscleGroups: ['biceps', 'forearms'], category: 'isolation', equipment: 'barbell', isDefault: true },
      { name: 'Bicep Curl (Dumbbell)', muscleGroups: ['biceps', 'forearms'], category: 'isolation', equipment: 'dumbbell', isDefault: true },
      { name: 'Hammer Curl (Dumbbell)', muscleGroups: ['biceps', 'brachialis', 'forearms'], category: 'isolation', equipment: 'dumbbell', isDefault: true },
      { name: 'Preacher Curl (Barbell)', muscleGroups: ['biceps'], category: 'isolation', equipment: 'barbell', isDefault: true },
      { name: 'Cable Bicep Curl (Cable)', muscleGroups: ['biceps'], category: 'isolation', equipment: 'cable', isDefault: true },
      { name: 'Tricep Pushdown (Cable)', muscleGroups: ['triceps'], category: 'isolation', equipment: 'cable', isDefault: true },
      { name: 'Skull Crushers (Barbell)', muscleGroups: ['triceps'], category: 'isolation', equipment: 'barbell', notes: 'Lower bar to forehead with elbows fixed.', isDefault: true },
      { name: 'Tricep Overhead Extension (Dumbbell)', muscleGroups: ['triceps'], category: 'isolation', equipment: 'dumbbell', isDefault: true },
      { name: 'Close Grip Bench Press (Barbell)', muscleGroups: ['triceps', 'chest'], category: 'compound', equipment: 'barbell', isDefault: true },
      { name: 'Tricep Dips (Bodyweight)', muscleGroups: ['triceps', 'chest'], category: 'compound', equipment: 'bodyweight', isDefault: true },
      // Core
      { name: 'Plank (Bodyweight)', muscleGroups: ['core', 'transverse abdominis'], category: 'isolation', equipment: 'bodyweight', notes: 'Log reps as seconds held.', isDefault: true },
      { name: 'Ab Wheel Rollout (Other)', muscleGroups: ['core', 'lats'], category: 'compound', equipment: 'other', isDefault: true },
      { name: 'Cable Crunch (Cable)', muscleGroups: ['core', 'rectus abdominis'], category: 'isolation', equipment: 'cable', isDefault: true },
      { name: 'Hanging Leg Raise (Bodyweight)', muscleGroups: ['core', 'hip flexors'], category: 'isolation', equipment: 'bodyweight', isDefault: true },
      { name: 'Sit-ups (Bodyweight)', muscleGroups: ['core'], category: 'isolation', equipment: 'bodyweight', isDefault: true },
      { name: 'Russian Twist (Dumbbell)', muscleGroups: ['core', 'obliques'], category: 'isolation', equipment: 'dumbbell', isDefault: true },
      { name: 'Dead Bug (Bodyweight)', muscleGroups: ['core', 'transverse abdominis'], category: 'isolation', equipment: 'bodyweight', isDefault: true },
      { name: 'Pallof Press (Cable)', muscleGroups: ['core', 'obliques'], category: 'isolation', equipment: 'cable', isDefault: true },
      // Shoulders
      { name: 'Arnold Press (Dumbbell)', muscleGroups: ['front delts', 'side delts', 'triceps'], category: 'compound', equipment: 'dumbbell', isDefault: true },
      { name: 'Upright Row (Barbell)', muscleGroups: ['traps', 'side delts'], category: 'compound', equipment: 'barbell', isDefault: true },
      { name: 'Rear Delt Fly (Dumbbell)', muscleGroups: ['rear delts', 'traps'], category: 'isolation', equipment: 'dumbbell', isDefault: true },
      { name: 'Shrugs (Barbell)', muscleGroups: ['traps'], category: 'isolation', equipment: 'barbell', isDefault: true },
      { name: 'Shrugs (Dumbbell)', muscleGroups: ['traps'], category: 'isolation', equipment: 'dumbbell', isDefault: true },
    ];

    let count = 0;
    for (const ex of exercises) {
      await ctx.db.insert('exercises', ex);
      count++;
    }

    return { seeded: count, message: `Seeded ${count} exercises` };
  },
});
