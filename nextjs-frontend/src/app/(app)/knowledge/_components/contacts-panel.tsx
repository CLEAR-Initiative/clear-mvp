import { Box, Text, Group } from "@mantine/core";
import { CardSection } from "~/components/ui";
import { type Contact } from "./knowledge-data";

interface ContactsPanelProps {
  filteredContacts: Contact[];
}

export function ContactsPanel({ filteredContacts }: ContactsPanelProps) {
  return (
    <CardSection
      title="Key Contacts"
      subtitle={`${filteredContacts.length} contacts`}
      noPadding
    >
      <Box style={{ maxHeight: 400, overflowY: "auto" }}>
        {filteredContacts.map((contact) => (
          <Box key={contact.id} p={12} className="border-b border-[#F0F0F0] hover:bg-[#F9FAFB]">
            <Text fw={500} c="#171717" style={{ fontSize: 13 }}>{contact.name}</Text>
            <Text c="#737373" style={{ fontSize: 12 }}>{contact.org}</Text>
            <Text c="#E85D3D" mt={4} style={{ fontSize: 12 }}>{contact.role}</Text>
            <Group gap={8} mt={8}>
              <Text c="#A3A3A3" style={{ fontSize: 11, cursor: "pointer" }} className="hover:text-[#E85D3D]">Email</Text>
              <Text c="#E5E5E5">&bull;</Text>
              <Text c="#A3A3A3" style={{ fontSize: 11, cursor: "pointer" }} className="hover:text-[#E85D3D]">Call</Text>
            </Group>
          </Box>
        ))}
        {filteredContacts.length === 0 && (
          <Box p={24}>
            <Text ta="center" c="#737373" style={{ fontSize: 13 }}>No contacts found for this location</Text>
          </Box>
        )}
      </Box>
    </CardSection>
  );
}
