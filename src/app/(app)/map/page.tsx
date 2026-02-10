import { api } from "~/trpc/server";
import { MapView } from "./_components/map-view";

export const metadata = { title: "Crisis Map — CLEAR" };

export default async function MapPage() {
  const { items } = await api.crisis.list({ limit: 100 });

  const crises = items.map((c) => ({
    id: c.id,
    title: c.title,
    location: c.location,
    latitude: c.latitude,
    longitude: c.longitude,
    severity: c.severity,
    type: c.type,
    status: c.status,
    affectedPopulation: c.affectedPopulation,
  }));

  return (
    <div className="h-[calc(100vh-2rem)]">
      <MapView crises={crises} />
    </div>
  );
}
