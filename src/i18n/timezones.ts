export interface TimeZoneOption {
  value: string;
  label: string;
}

/** All IANA zones the runtime knows, or none on engines without the API. */
export function supportedTimeZones(): readonly string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [];
  }
}

/** "GMT+3", "GMT-5:30", or "GMT" for the zone at `now`; "" if unknown. */
export function timeZoneOffset(zone: string, now: Date): string {
  try {
    const part = new Intl.DateTimeFormat("en", {
      timeZone: zone,
      timeZoneName: "shortOffset",
    })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName");
    return part?.value ?? "";
  } catch {
    return "";
  }
}

/** "America/Argentina/Buenos_Aires" -> "America/Argentina/Buenos Aires (GMT-3)". */
export function timeZoneLabel(zone: string, now: Date): string {
  const name = zone.replace(/_/g, " ");
  const offset = timeZoneOffset(zone, now);
  return offset ? `${name} (${offset})` : name;
}

/**
 * Options for a timezone select: the pinned zones first (with their
 * translated labels), then every other zone the runtime supports. The
 * current value is always present, so a zone the runtime does not list
 * (an alias such as "Asia/Calcutta") still shows as selected.
 */
export function timeZoneOptions({
  pinned,
  current,
  now = new Date(),
  zones = supportedTimeZones(),
}: {
  pinned: readonly TimeZoneOption[];
  current?: string;
  now?: Date;
  zones?: readonly string[];
}): TimeZoneOption[] {
  const seen = new Set(pinned.map((o) => o.value));
  const options = [...pinned];
  const rest = current && !seen.has(current) && !zones.includes(current) ? [current, ...zones] : zones;
  for (const zone of rest) {
    if (seen.has(zone)) continue;
    seen.add(zone);
    options.push({ value: zone, label: timeZoneLabel(zone, now) });
  }
  return options;
}
