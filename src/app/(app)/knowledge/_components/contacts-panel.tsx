import { useTranslations } from "next-intl";
import { Box, Text, Group } from "@mantine/core";
import { CardSection } from "~/components/ui";
import { type Contact } from "./knowledge-data";

interface ContactsPanelProps {
  filteredContacts: Contact[];
}

export function ContactsPanel({ filteredContacts }: ContactsPanelProps) {
  const t = useTranslations("knowledge.contacts");

  return (
    <CardSection
      title={t("title")}
      subtitle={t("count", { count: filteredContacts.length })}
      noPadding
    >
      <Box style={{ maxHeight: 400, overflowY: "auto" }}>
        {filteredContacts.map((contact) => (
          <Box key={contact.id} p={12} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-muted)]">
            <Text fw={500} c="var(--color-text-primary)" style={{ fontSize: 13 }}>{contact.name}</Text>
            <Text c="var(--color-text-muted)" style={{ fontSize: 12 }}>{contact.org}</Text>
            <Text c="#E85D3D" mt={4} style={{ fontSize: 12 }}>{contact.role}</Text>
            <Group gap={8} mt={8}>
              <Text c="var(--color-text-muted)" style={{ fontSize: 11, cursor: "pointer" }} className="hover:text-[#E85D3D]">{t("email")}</Text>
              <Text c="var(--color-border)">&bull;</Text>
              <Text c="var(--color-text-muted)" style={{ fontSize: 11, cursor: "pointer" }} className="hover:text-[#E85D3D]">{t("call")}</Text>
            </Group>
          </Box>
        ))}
        {filteredContacts.length === 0 && (
          <Box p={24}>
            <Text ta="center" c="var(--color-text-muted)" style={{ fontSize: 13 }}>{t("empty")}</Text>
          </Box>
        )}
      </Box>
    </CardSection>
  );
}
