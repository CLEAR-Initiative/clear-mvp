/** True when clear-api has not yet shipped the requested GraphQL field/type/mutation. */
export function isGraphqlSchemaUnavailable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /Cannot query field|Unknown type|Unknown argument|is not defined|Cannot query/i.test(
    msg,
  );
}
