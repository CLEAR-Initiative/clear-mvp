import Link from "next/link";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Plus, Users, AlertTriangle, Target, TrendingUp } from "lucide-react";
import { AssessmentFilters } from "./_components/assessment-filters";

export const metadata = { title: "Assessments — CLEAR" };

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

export default async function AssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const riskCategory = typeof params.riskCategory === "string" ? params.riskCategory : undefined;

  const [{ items: profiles }, stats] = await Promise.all([
    api.assessment.list({
      riskCategory: riskCategory as "CRITICAL" | undefined,
    }),
    api.assessment.stats(),
  ]);

  const rec = stats.recommendations;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Vulnerability Assessments
          </h1>
          <p className="text-muted-foreground">
            Rapid household vulnerability scoring based on Sudan RNA methodology
          </p>
        </div>
        <Button asChild>
          <Link href="/assessments/new">
            <Plus className="mr-2 h-4 w-4" />
            New Assessment
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Households</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rec.totalHouseholds}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {rec.criticalCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Eligible</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rec.cashEligible}</div>
            <p className="text-xs text-muted-foreground">Score 50+</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rec.averageScore}</div>
            <p className="text-xs text-muted-foreground">out of 100</p>
          </CardContent>
        </Card>
      </div>

      <AssessmentFilters />

      {/* Profiles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assessments</CardTitle>
          <CardDescription>
            {profiles.length} assessment{profiles.length !== 1 && "s"} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No assessments found. Start a rapid assessment to score household
              vulnerability.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>HH Size</TableHead>
                  <TableHead>Primary Need</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assessed By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={`/assessments/${p.id}`}
                        className="font-medium hover:underline"
                      >
                        {p.siteId ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell>{p.householdSize}</TableCell>
                    <TableCell>{needLabels[p.primaryNeed] ?? p.primaryNeed}</TableCell>
                    <TableCell className="font-mono font-bold">
                      {p.vulnerabilityScore}
                    </TableCell>
                    <TableCell>
                      <Badge variant={categoryVariant[p.riskCategory] ?? "outline"}>
                        {categoryLabels[p.riskCategory] ?? p.riskCategory}
                      </Badge>
                    </TableCell>
                    <TableCell>P{p.priorityRank}</TableCell>
                    <TableCell className="text-sm">
                      {p.assessedBy.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(p.assessedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
