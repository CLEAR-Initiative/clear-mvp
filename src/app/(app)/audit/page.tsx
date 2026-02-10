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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { AuditFilters } from "./_components/audit-filters";

export const metadata = { title: "Audit Trail — CLEAR" };

const typeLabels: Record<string, string> = {
  SECURITY_RESPONSE: "Security Response",
  RESOURCE_ALLOCATION: "Resource Allocation",
  BENEFICIARY_SELECTION: "Beneficiary Selection",
  PROGRAM_MODIFICATION: "Program Modification",
  PARTNER_MANAGEMENT: "Partner Management",
  OTHER: "Other",
};

const riskColors: Record<string, "default" | "secondary" | "destructive"> = {
  LOW: "secondary",
  MEDIUM: "default",
  HIGH: "destructive",
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  DRAFT: "outline",
  SUBMITTED: "default",
  SYNCED: "secondary",
  ARCHIVED: "outline",
};

export default async function AuditTrailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const [{ items }, stats] = await Promise.all([
    api.audit.list({
      status: params.status as "DRAFT" | undefined,
      type: params.type as "SECURITY_RESPONSE" | undefined,
      riskLevel: params.riskLevel as "LOW" | undefined,
      search: params.search,
    }),
    api.audit.stats(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Trail</h1>
          <p className="text-muted-foreground">
            Decision accountability and evidence tracking
          </p>
        </div>
        <Button asChild>
          <Link href="/audit/new">Record Decision</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Decisions</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        {stats.byRiskLevel.map((r) => (
          <Card key={r.riskLevel}>
            <CardHeader className="pb-2">
              <CardDescription>{r.riskLevel} Risk</CardDescription>
              <CardTitle className="text-3xl">{r.count}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <AuditFilters />

      {/* Table */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No audit decisions found. Record one to start the audit trail.
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Risk Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>By</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((audit) => (
              <TableRow key={audit.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/audit/${audit.id}`}
                    className="hover:underline"
                  >
                    {audit.title}
                  </Link>
                </TableCell>
                <TableCell className="text-sm">
                  {typeLabels[audit.type] ?? audit.type}
                </TableCell>
                <TableCell>
                  <Badge variant={riskColors[audit.riskLevel] ?? "secondary"}>
                    {audit.riskLevel}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[audit.status] ?? "secondary"}>
                    {audit.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{audit.priority}</TableCell>
                <TableCell className="text-sm">
                  {audit._count.evidence > 0 ? (
                    <Badge variant="outline">
                      {audit._count.evidence} file
                      {audit._count.evidence !== 1 && "s"}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">{audit.createdBy.name}</TableCell>
                <TableCell className="text-sm">
                  {new Date(audit.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
