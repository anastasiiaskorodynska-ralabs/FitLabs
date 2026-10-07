// Muscle keys stored in exercises.muscle_groups; labels live in messages (Muscles).
export const MUSCLES = [
  "quads",
  "glutes",
  "hamstrings",
  "adductors",
  "calves",
  "chest",
  "back",
  "lats",
  "shoulders",
  "biceps",
  "triceps",
  "abs",
  "obliques",
  "core",
  "hip_flexors",
  "full_body",
  "forearms",
  "traps",
] as const;

export type Muscle = (typeof MUSCLES)[number];
