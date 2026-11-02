/**
 * Card topics from the humanitarian taxonomy the analysis follows (Shock-Event and
 * Humanitarian Access, levels 2 and 3). The pipeline files each finding under one key.
 */
export const AGGRAVATING_TOPICS = [
  "economic_fragility",
  "environment_technology",
  "governance_policy",
  "social_inequality",
  "resource_shortfalls",
  "coordination_failures",
] as const;

export const MITIGATING_TOPICS = [
  "preparedness",
  "risk_reduction",
  "recovery_support",
  "protective_infrastructure",
  "public_warning",
  "response_surge",
] as const;

export const ACCESS_TOPICS = [
  "people_facing_gaps",
  "physical",
  "security",
  "relief_to_population",
  "population_to_relief",
] as const;

export interface TopicGroup<T> {
  topic: string;
  items: T[];
}

/** One card per topic in taxonomy order. Topics without findings are left out; unknown topics go last as "other". */
export function groupByTopic<T extends { topic: string }>(items: T[], order: readonly string[]): TopicGroup<T>[] {
  const known = order.map((topic) => ({ topic, items: items.filter((item) => item.topic === topic) }));
  const rest = items.filter((item) => !order.includes(item.topic));
  return [...known, { topic: "other", items: rest }].filter((group) => group.items.length > 0);
}
