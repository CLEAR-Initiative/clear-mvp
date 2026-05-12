import { PageHeader } from "~/components/ui";
import { Box } from "@mantine/core";
import { ModalityChoiceTool } from "../_components/modality-choice-tool";

export default function ModalityChoicePage() {
  return (
    <Box>
      <PageHeader
        title="Modality Choice Tool"
        subtitle="Tools"
        breadcrumbs={["CLEAR", "Tools", "Modality Choice"]}
      />
      <Box px={24} pt={16} pb={32}>
        <ModalityChoiceTool />
      </Box>
    </Box>
  );
}
