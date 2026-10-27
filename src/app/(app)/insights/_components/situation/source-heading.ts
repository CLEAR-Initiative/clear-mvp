/**
 * Heading for one Analysis source row.
 *
 * A human title is shown as written. An internal citation id — `event:…` or
 * `api:…:hapi_humanitarian_needs:…` — is never the heading. Those rows get a
 * typed label. This does not invent a report title the knowledge base does
 * not have.
 */

const EVENT_PREFIX = "event:";

export function isEventCitationId(value: string): boolean {
  return value.startsWith(EVENT_PREFIX) && value.length > EVENT_PREFIX.length;
}

export function isHapiCitationId(value: string): boolean {
  return value.startsWith("api:") && value.includes("hapi_humanitarian_needs");
}

function isInternalCitationId(value: string): boolean {
  return isEventCitationId(value) || isHapiCitationId(value);
}

export function sourceHeading(
  source: { id: string; title: string },
  labels: { event: string; hapiFigure: string },
): string {
  const title = source.title.trim();
  if (title && !isInternalCitationId(title)) return title;
  if (isEventCitationId(source.id) || isEventCitationId(title)) return labels.event;
  if (isHapiCitationId(source.id) || isHapiCitationId(title)) return labels.hapiFigure;
  return title || `ReliefWeb report ${source.id}`;
}
