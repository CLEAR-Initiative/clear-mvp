"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Card, CardContent } from "~/components/ui/card";

export function CreateCrisisForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const createCrisis = api.crisis.create.useMutation({
    onSuccess: (crisis) => {
      router.push(`/crises/${crisis.id}`);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    const lat = formData.get("latitude") as string;
    const lng = formData.get("longitude") as string;
    const pop = formData.get("affectedPopulation") as string;

    createCrisis.mutate({
      title: formData.get("title") as string,
      type: formData.get("type") as "NATURAL_DISASTER" | "CONFLICT" | "EPIDEMIC" | "FAMINE" | "REFUGEE_CRISIS" | "ECONOMIC_CRISIS" | "OTHER",
      severity: formData.get("severity") as "LOW" | "MODERATE" | "HIGH" | "CRITICAL",
      location: formData.get("location") as string,
      latitude: lat ? parseFloat(lat) : undefined,
      longitude: lng ? parseFloat(lng) : undefined,
      description: (formData.get("description") as string) || undefined,
      affectedPopulation: pop ? parseInt(pop, 10) : 0,
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Crisis Title</Label>
            <Input
              id="title"
              name="title"
              required
              placeholder="e.g. Sudan Armed Conflict"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select name="type" required defaultValue="CONFLICT">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NATURAL_DISASTER">Natural Disaster</SelectItem>
                  <SelectItem value="CONFLICT">Conflict</SelectItem>
                  <SelectItem value="EPIDEMIC">Epidemic</SelectItem>
                  <SelectItem value="FAMINE">Famine</SelectItem>
                  <SelectItem value="REFUGEE_CRISIS">Refugee Crisis</SelectItem>
                  <SelectItem value="ECONOMIC_CRISIS">Economic Crisis</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select name="severity" required defaultValue="HIGH">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MODERATE">Moderate</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              required
              placeholder="e.g. Khartoum, Sudan"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                name="latitude"
                type="number"
                step="any"
                min="-90"
                max="90"
                placeholder="e.g. 15.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                name="longitude"
                type="number"
                step="any"
                min="-180"
                max="180"
                placeholder="e.g. 32.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="affectedPopulation">Affected Population</Label>
              <Input
                id="affectedPopulation"
                name="affectedPopulation"
                type="number"
                min="0"
                placeholder="e.g. 1000000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Describe the crisis situation, context, and key factors..."
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={createCrisis.isPending}>
              {createCrisis.isPending ? "Creating..." : "Create Crisis"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
