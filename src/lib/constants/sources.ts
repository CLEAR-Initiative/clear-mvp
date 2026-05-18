const MANUAL_SOURCE_TYPES = ["field_officer", "partner", "government"] as const;

export type ManualSourceType = (typeof MANUAL_SOURCE_TYPES)[number];

export const sourceLabels: Record<ManualSourceType, string> = {
  field_officer: "Field Team",
  partner: "Partner Organisation",
  government: "Government Source",
};

export function isManualSourceType(type: string): type is ManualSourceType {
  return (MANUAL_SOURCE_TYPES as readonly string[]).includes(type);
}
