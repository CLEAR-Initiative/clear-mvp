const MANUAL_SOURCE_NAMES = ["field_officer", "partner", "government"] as const;

export type ManualSourceName = (typeof MANUAL_SOURCE_NAMES)[number];

export const sourceLabels: Record<ManualSourceName, string> = {
  field_officer: "Field Team",
  partner: "Partner Organisation",
  government: "Government Source",
};

export function isManualSourceName(name: string): name is ManualSourceName {
  return (MANUAL_SOURCE_NAMES as readonly string[]).includes(name);
}
