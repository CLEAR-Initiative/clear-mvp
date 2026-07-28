/** True when clear-api has not yet shipped the requested GraphQL field/type/mutation. */
export function isGraphqlSchemaUnavailable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  // Keep patterns anchored to GraphQL validation language — avoid bare
  // "is not defined" which matches unrelated runtime/coercion prose.
  return /Cannot query field|Unknown type|Unknown argument|Field ['"`]?[\w.]+['"`]? is not defined|Cannot query/i.test(
    msg,
  );
}
