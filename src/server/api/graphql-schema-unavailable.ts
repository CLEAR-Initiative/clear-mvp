/** True when clear-api has not yet shipped the requested GraphQL field/type/mutation. */
export function isGraphqlSchemaUnavailable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  // GraphQL validation language only — avoid bare "is not defined" which matches
  // unrelated variable-coercion / runtime prose and would falsely soft-fail.
  return /Cannot query field|Unknown type|Unknown argument|Cannot query/i.test(msg);
}
