import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/server";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export const metadata = { title: "Assessment Detail — CLEAR" };

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

const needLabels: Record<string, string> = {
  FOOD: "Food",
  SHELTER: "Shelter",
  WASH: "WASH",
  HEALTH: "Health",
  PROTECTION: "Protection",
};

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let profile;
  try {
    profile = await api.assessment.getById({ id });
  } catch {
    notFound();
  }

  const detail = profile.vulnerabilityDetail;
  const programs = detail
    ? (Array.isArray(detail.eligiblePrograms) ? detail.eligiblePrograms as string[] : [])
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              Assessment {profile.siteId ? `— ${profile.siteId}` : ""}
            </h1>
            <Badge variant={categoryVariant[profile.riskCategory] ?? "outline"}>
              {categoryLabels[profile.riskCategory] ?? profile.riskCategory} Risk
            </Badge>
            <Badge variant="outline">Priority {profile.priorityRank}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Assessed by {profile.assessedBy.name} ·{" "}
            {new Date(profile.assessedAt).toLocaleDateString()}
            {profile.assessmentDuration &&
              ` · ${profile.assessmentDuration}s duration`}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/assessments">Back to Assessments</Link>
        </Button>
      </div>

      {/* Score Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Vulnerability Score</CardTitle>
          <CardDescription>
            Composite score based on Sudan RNA methodology (0-100)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-primary">
              <span className="text-3xl font-bold">
                {profile.vulnerabilityScore}
              </span>
            </div>
            {detail && (
              <div className="flex-1">
                <div className="space-y-2">
                  <ScoreBar label="Female-Headed HH" value={detail.femaleHeadedScore} max={25} />
                  <ScoreBar label="Vulnerable Members" value={detail.vulnerableMembersScore} max={65} />
                  <ScoreBar label="Household Size" value={detail.householdSizeScore} max={15} />
                  <ScoreBar label="Primary Need" value={detail.primaryNeedScore} max={20} />
                  <ScoreBar label="Service Distance" value={detail.serviceDistanceScore} max={15} />
                  <ScoreBar label="GBV Risk" value={detail.gbvRiskScore} max={20} />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Household Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Household Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Household Size</dt>
                <dd className="mt-1 text-lg font-semibold">{profile.householdSize}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Primary Need</dt>
                <dd className="mt-1 text-lg font-semibold">
                  {needLabels[profile.primaryNeed] ?? profile.primaryNeed}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Female-Headed</dt>
                <dd className="mt-1">{profile.femaleHeaded ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Vulnerable Members</dt>
                <dd className="mt-1">{profile.hasVulnerable ? "Yes" : "No"}</dd>
              </div>
              {profile.pwdCount > 0 && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">PWD Count</dt>
                  <dd className="mt-1">{profile.pwdCount}</dd>
                </div>
              )}
              {profile.elderlyCount > 0 && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Elderly Count</dt>
                  <dd className="mt-1">{profile.elderlyCount}</dd>
                </div>
              )}
              {profile.childHeaded && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Child-Headed</dt>
                  <dd className="mt-1">Yes</dd>
                </div>
              )}
              {profile.gbvRisk && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">GBV Risk</dt>
                  <dd className="mt-1 text-destructive">Yes</dd>
                </div>
              )}
              {profile.serviceDistance != null && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Service Distance</dt>
                  <dd className="mt-1">{profile.serviceDistance} km</dd>
                </div>
              )}
              {profile.latitude != null && profile.longitude != null && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Coordinates</dt>
                  <dd className="mt-1 font-mono text-xs">
                    {profile.latitude.toFixed(4)}, {profile.longitude.toFixed(4)}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Eligible Programs */}
        <Card>
          <CardHeader>
            <CardTitle>Eligible Programs</CardTitle>
            <CardDescription>
              Programs this household qualifies for based on their score
            </CardDescription>
          </CardHeader>
          <CardContent>
            {programs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No specific program eligibility identified.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {programs.map((p, i) => (
                  <Badge key={i} variant="secondary">
                    {p}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ScoreBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 text-xs text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 text-right text-xs font-medium">
        {value}/{max}
      </span>
    </div>
  );
}
