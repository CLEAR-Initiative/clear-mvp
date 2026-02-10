"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

export function RapidAssessmentForm() {
  const router = useRouter();
  const startTime = useRef(Date.now());
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [siteId, setSiteId] = useState("");
  const [householdSize, setHouseholdSize] = useState(1);
  const [femaleHeaded, setFemaleHeaded] = useState(false);
  const [hasVulnerable, setHasVulnerable] = useState(false);
  const [pwdCount, setPwdCount] = useState(0);
  const [elderlyCount, setElderlyCount] = useState(0);
  const [childHeaded, setChildHeaded] = useState(false);
  const [primaryNeed, setPrimaryNeed] = useState("FOOD");
  const [serviceDistance, setServiceDistance] = useState<number | undefined>();
  const [gbvRisk, setGbvRisk] = useState(false);

  const create = api.assessment.create.useMutation({
    onSuccess: (data) => {
      router.push(`/assessments/${data.id}`);
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  // Live preview
  const preview = api.assessment.preview.useQuery(
    {
      householdSize,
      femaleHeaded,
      hasVulnerable,
      pwdCount,
      elderlyCount,
      childHeaded,
      primaryNeed: primaryNeed as "FOOD",
      serviceDistance,
      gbvRisk,
    },
    { refetchOnWindowFocus: false },
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const duration = Math.round((Date.now() - startTime.current) / 1000);

    create.mutate({
      siteId: siteId || undefined,
      householdSize,
      femaleHeaded,
      hasVulnerable,
      pwdCount,
      elderlyCount,
      childHeaded,
      primaryNeed: primaryNeed as "FOOD",
      serviceDistance,
      gbvRisk,
      assessmentDuration: duration,
    });
  }

  const categoryVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    CRITICAL: "destructive",
    HIGH: "default",
    MEDIUM_RISK: "secondary",
    LOW_RISK: "outline",
  };

  const categoryLabels: Record<string, string> = {
    CRITICAL: "Critical",
    HIGH: "High",
    MEDIUM_RISK: "Medium",
    LOW_RISK: "Low",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Live Score Preview */}
      {preview.data && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary text-2xl font-bold">
                {preview.data.total}
              </div>
              <div>
                <Badge variant={categoryVariant[preview.data.category] ?? "outline"}>
                  {categoryLabels[preview.data.category] ?? preview.data.category}
                </Badge>
                <p className="mt-1 text-sm text-muted-foreground">
                  Priority rank: P{preview.data.rank}
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              {preview.data.eligiblePrograms.length > 0 && (
                <div className="flex flex-wrap justify-end gap-1">
                  {preview.data.eligiblePrograms.slice(0, 3).map((p, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {p}
                    </Badge>
                  ))}
                  {preview.data.eligiblePrograms.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{preview.data.eligiblePrograms.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Household Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="siteId">Site / Camp ID</Label>
              <Input
                id="siteId"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                placeholder="e.g., Kalma Camp"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="householdSize">Household Size</Label>
              <Input
                id="householdSize"
                type="number"
                min={1}
                max={50}
                value={householdSize}
                onChange={(e) => setHouseholdSize(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Primary Need</Label>
            <Select value={primaryNeed} onValueChange={setPrimaryNeed}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FOOD">Food</SelectItem>
                <SelectItem value="SHELTER">Shelter</SelectItem>
                <SelectItem value="WASH">WASH</SelectItem>
                <SelectItem value="HEALTH">Health</SelectItem>
                <SelectItem value="PROTECTION">Protection</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceDistance">Distance to Services (km)</Label>
            <Input
              id="serviceDistance"
              type="number"
              min={0}
              step={0.5}
              value={serviceDistance ?? ""}
              onChange={(e) =>
                setServiceDistance(e.target.value ? parseFloat(e.target.value) : undefined)
              }
              placeholder="e.g., 8.5"
            />
          </div>
        </CardContent>
      </Card>

      {/* Vulnerability Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Vulnerability Indicators</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="femaleHeaded"
                checked={femaleHeaded}
                onCheckedChange={(c) => setFemaleHeaded(c === true)}
              />
              <Label htmlFor="femaleHeaded">Female-headed household (+25)</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasVulnerable"
                checked={hasVulnerable}
                onCheckedChange={(c) => setHasVulnerable(c === true)}
              />
              <Label htmlFor="hasVulnerable">Has vulnerable members (+20)</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="gbvRisk"
                checked={gbvRisk}
                onCheckedChange={(c) => setGbvRisk(c === true)}
              />
              <Label htmlFor="gbvRisk">GBV risk indicators (+20)</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="childHeaded"
                checked={childHeaded}
                onCheckedChange={(c) => setChildHeaded(c === true)}
              />
              <Label htmlFor="childHeaded">Child-headed household (+30)</Label>
            </div>
          </div>

          {hasVulnerable && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pwdCount">Persons with Disabilities</Label>
                <Input
                  id="pwdCount"
                  type="number"
                  min={0}
                  value={pwdCount}
                  onChange={(e) => setPwdCount(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">+5 per person</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="elderlyCount">Elderly Members</Label>
                <Input
                  id="elderlyCount"
                  type="number"
                  min={0}
                  value={elderlyCount}
                  onChange={(e) => setElderlyCount(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">+3 per person</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Scoring..." : "Score & Save"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
