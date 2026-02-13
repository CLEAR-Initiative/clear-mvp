import { Badge } from "@mantine/core";
import { severityColors, severityLabels } from "~/lib/constants/severity";

interface SeverityBadgeProps {
  severity: string;
  label?: string;
  size?: "xs" | "sm" | "md" | "lg";
  style?: React.CSSProperties;
}

export function SeverityBadge({ severity, label, size = "xs", style }: SeverityBadgeProps) {
  const colors = severityColors[severity] ?? severityColors.medium!;
  const displayLabel = label ?? severityLabels[severity] ?? severity;

  return (
    <Badge
      size={size}
      tt="uppercase"
      style={{
        fontSize: size === "xs" ? 10 : undefined,
        fontWeight: 700,
        background: colors.bg,
        color: colors.text,
        ...style,
      }}
    >
      {displayLabel}
    </Badge>
  );
}
