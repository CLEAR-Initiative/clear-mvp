import { notFound } from "next/navigation";
import { CampsResearchPrototype } from "./_components/camps-research-prototype";

function researchCampsEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.ENABLE_CAMPS_RESEARCH === "1"
  );
}

export default function ResearchCampsPage() {
  if (!researchCampsEnabled()) {
    notFound();
  }

  return <CampsResearchPrototype />;
}
