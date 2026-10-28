/**
 * Heading for one Analysis source row.
 *
 * A human title is shown as written. An internal citation id — `event:…` or
 * `api:…:hapi_humanitarian_needs:…` — is never the heading. Those rows get a
 * typed label. This does not invent a report title the knowledge base does
 * not have.
 */

const EVENT_PREFIX = "event:";
const UNTITLED_REPORT = "Untitled report";
const RAW_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Metadata pasted onto a report title, through the end of the string. */
const TITLE_META = /\s*(?:[|·–-]\s*)?(?:Publication Date|Data Valid)\s*:[\s\S]*$/i;

/** A publisher that is only an id is not a name. */
export function readablePublisher(publisher: string | null | undefined): string | null {
  const value = publisher?.trim() ?? "";
  if (!value || RAW_ID.test(value)) return null;
  return value;
}

/** Take a pasted publication-date suffix off a human title. */
export function cleanSourceTitle(title: string): string {
  return title.replace(TITLE_META, "").trim();
}

export function isEventCitationId(value: string): boolean {
  return value.startsWith(EVENT_PREFIX) && value.length > EVENT_PREFIX.length;
}

export function isHapiCitationId(value: string): boolean {
  return value.startsWith("api:") && value.includes("hapi_humanitarian_needs");
}

function isInternalCitationId(value: string): boolean {
  return isEventCitationId(value) || isHapiCitationId(value);
}

/** The last segment of a HAPI citation, as words. Null when there is nothing to tell two rows apart. */
export function hapiIndicator(id: string): string | null {
  if (!isHapiCitationId(id)) return null;
  const tail = id.split(":").pop()?.trim() ?? "";
  if (!tail || tail.includes("hapi_humanitarian_needs")) return null;
  const words = tail.replace(/[_-]+/g, " ").trim();
  return words || null;
}

export function sourceHeading(
  source: { id: string; title: string },
  labels: { event: string; hapiFigure: string },
): string {
  const title = cleanSourceTitle(source.title.trim());
  const internal =
    isEventCitationId(source.id) ||
    isHapiCitationId(source.id) ||
    isEventCitationId(title) ||
    isHapiCitationId(title);
  // "Untitled report" is the mapper's placeholder for a report with no title.
  // On an event or HAPI citation it is not a heading.
  if (title && !isInternalCitationId(title) && !(internal && title === UNTITLED_REPORT)) return title;
  if (isEventCitationId(source.id) || isEventCitationId(title)) return labels.event;
  if (isHapiCitationId(source.id) || isHapiCitationId(title)) {
    const indicator = hapiIndicator(source.id) ?? (isHapiCitationId(title) ? hapiIndicator(title) : null);
    return indicator ? `${labels.hapiFigure} · ${indicator}` : labels.hapiFigure;
  }
  return title || `ReliefWeb report ${source.id}`;
}

/**
 * When two sources would share a heading, append publisher and date so the
 * list can be told apart. A row with neither stays on the shared heading.
 */
export function distinctHeadings(
  sources: readonly { id: string; title: string; publisher: string | null; publishedAt: string | null }[],
  labels: { event: string; hapiFigure: string },
  publishedLabel: (iso: string) => string,
): string[] {
  const base = sources.map((source) => sourceHeading(source, labels));
  const counts = new Map<string, number>();
  for (const heading of base) counts.set(heading, (counts.get(heading) ?? 0) + 1);
  return sources.map((source, i) => {
    const heading = base[i]!;
    if ((counts.get(heading) ?? 0) < 2) return heading;
    const when = source.publishedAt ? publishedLabel(source.publishedAt) : "";
    const extra = [readablePublisher(source.publisher), when].filter(Boolean).join(", ");
    return extra ? `${heading} (${extra})` : heading;
  });
}
