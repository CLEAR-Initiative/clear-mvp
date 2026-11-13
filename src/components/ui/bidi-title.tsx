import type { ReactNode } from "react";

/**
 * A title that may mix scripts, shown in its own direction.
 *
 * An event title can name a place with its Arabic spelling beside the
 * English one: "Explosions in Al-Kanabi (الكنابي), Northern". On an Arabic
 * (right-to-left) page, a bare title takes the page's direction, and the
 * parentheses, the comma and the word order come out wrong. On an English
 * page, an all-Arabic title has the same fault the other way round.
 *
 * `<bdi>` isolates the title and takes its direction from its first strong
 * character, so the title reads correctly in every locale and its
 * neighbours are not reordered. The stored title holds no direction marks
 * (clear-pipeline strips them): direction is the page's job.
 */
export function BidiTitle({ children }: { children: ReactNode }) {
  return <bdi>{children}</bdi>;
}
