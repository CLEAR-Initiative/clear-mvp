/**
 * Stable Users-tab order. The GraphQL `users` query is unordered
 * `findMany()`, so a role UPDATE rewrites the Postgres heap tuple and
 * the refetch would otherwise drop the row at the bottom.
 */
export function sortUsersStable<T extends { id: string; name: string }>(
  users: T[],
): T[] {
  return [...users].sort((a, b) => {
    const byName = a.name.localeCompare(b.name, undefined, {
      sensitivity: "base",
      numeric: true,
    });
    return byName !== 0 ? byName : a.id.localeCompare(b.id);
  });
}
