import Link from "next/link";
import { api } from "~/trpc/server";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Plus } from "lucide-react";
import { CrisisFilters } from "./_components/crisis-filters";

export default async function CrisesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const { items: crises } = await api.crisis.list({
    status: validStatus(params.status),
    type: validType(params.type),
    severity: validSeverity(params.severity),
    search: params.search,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Crises</h1>
          <p className="text-muted-foreground">
            Monitor and manage humanitarian crises.
          </p>
        </div>
        <Button asChild>
          <Link href="/crises/new">
            <Plus className="mr-2 h-4 w-4" />
            New Crisis
          </Link>
        </Button>
      </div>

      <CrisisFilters />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {crises.length} {crises.length === 1 ? "crisis" : "crises"} found
          </CardTitle>
        </CardHeader>
        <CardContent>
          {crises.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No crises match your filters.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Crisis</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Affected</TableHead>
                  <TableHead className="text-right">Decisions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {crises.map((crisis) => (
                  <TableRow key={crisis.id}>
                    <TableCell>
                      <Link
                        href={`/crises/${crisis.id}`}
                        className="font-medium hover:underline"
                      >
                        {crisis.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {crisis.location}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatEnum(crisis.type)}</Badge>
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={crisis.severity} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={crisis.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {crisis.affectedPopulation.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {crisis._count.decisions}
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

function formatEnum(value: string) {
  return value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function SeverityBadge({ severity }: { severity: string }) {
  const variant: Record<string, "destructive" | "secondary" | "outline" | "default"> = {
    CRITICAL: "destructive",
    HIGH: "destructive",
    MODERATE: "default",
    LOW: "secondary",
  };
  return <Badge variant={variant[severity] ?? "outline"}>{severity}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const variant: Record<string, "destructive" | "secondary" | "outline" | "default"> = {
    ACTIVE: "default",
    MONITORING: "secondary",
    RESOLVED: "outline",
    ARCHIVED: "outline",
  };
  return <Badge variant={variant[status] ?? "outline"}>{status}</Badge>;
}

function validStatus(s?: string) {
  const valid = ["ACTIVE", "MONITORING", "RESOLVED", "ARCHIVED"] as const;
  return valid.includes(s as (typeof valid)[number])
    ? (s as (typeof valid)[number])
    : undefined;
}

function validType(s?: string) {
  const valid = [
    "NATURAL_DISASTER", "CONFLICT", "EPIDEMIC", "FAMINE",
    "REFUGEE_CRISIS", "ECONOMIC_CRISIS", "OTHER",
  ] as const;
  return valid.includes(s as (typeof valid)[number])
    ? (s as (typeof valid)[number])
    : undefined;
}

function validSeverity(s?: string) {
  const valid = ["LOW", "MODERATE", "HIGH", "CRITICAL"] as const;
  return valid.includes(s as (typeof valid)[number])
    ? (s as (typeof valid)[number])
    : undefined;
}
