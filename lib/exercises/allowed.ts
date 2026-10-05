// One rule for "can this exercise be planned": every piece of equipment it
// needs is available, its names don't match an avoid term, and it uses no
// cardio machine when those are avoided. Shared by the swap sheet and the AI.

export type EquipmentRef = {
  slug?: string;
  name_en: string;
  name_uk: string;
  available: boolean;
  is_cardio_machine: boolean;
};

export type AvoidRules = {
  avoidTerms: string[];
  avoidCardioMachines: boolean;
};

export function matchesAvoidTerm(names: string[], avoidTerms: string[]) {
  const lower = names.map((n) => n.toLowerCase());
  return avoidTerms
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .some((term) => lower.some((n) => n.includes(term)));
}

export function isExerciseAllowed(
  exercise: { name_en: string; name_uk: string },
  equipment: EquipmentRef[],
  rules: AvoidRules,
) {
  if (!equipment.every((q) => q.available)) return false;
  if (rules.avoidCardioMachines && equipment.some((q) => q.is_cardio_machine)) return false;
  const names = [exercise.name_en, exercise.name_uk, ...equipment.flatMap((q) => [q.name_en, q.name_uk])];
  return !matchesAvoidTerm(names, rules.avoidTerms);
}
