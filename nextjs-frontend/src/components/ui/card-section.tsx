import type { ReactNode } from "react";
import { Box, Card, Text, Group } from "@mantine/core";

interface CardSectionProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  icon?: ReactNode;
  noPadding?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function CardSection({
  title,
  subtitle,
  action,
  children,
  icon,
  noPadding,
  className,
  style,
}: CardSectionProps) {
  return (
    <Card p={0} className={className} style={{ border: "1px solid #E5E5E5", ...style }}>
      <Box px={16} py={12} className="border-b border-[#E5E5E5]">
        <Group justify="space-between">
          <Box>
            <Group gap={8}>
              {icon}
              <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                {title}
              </Text>
            </Group>
            {subtitle && (
              <Text size="xs" c="#737373">
                {subtitle}
              </Text>
            )}
          </Box>
          {action}
        </Group>
      </Box>
      {noPadding ? children : <Box p={16}>{children}</Box>}
    </Card>
  );
}
