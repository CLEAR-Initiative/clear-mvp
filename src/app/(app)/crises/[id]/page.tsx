import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Separator } from "~/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  AlertTriangle,
  MapPin,
  Users,
  Plus,
  ArrowLeft,
  Clock,
} from "lucide-react";

export default async function CrisisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let crisis;
  try {
    crisis = await api.crisis.getById({ id });
  } catch {
    notFound();
  }

  const activeAlerts = crisis.alerts.filter((a) => a.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/crises">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{crisis.title}</h1>
            <SeverityBadge severity={crisis.severity} />
            <StatusBadge status={crisis.status} />
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {crisis.location}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {crisis.affectedPopulation.toLocaleString()} affected
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Created {crisis.createdAt.toLocaleDateString()}
            </span>
          </div>
        </div>
        <Button asChild>
          <Link href={`/crises/${crisis.id}/decisions/new`}>
            <Plus className="mr-2 h-4 w-4" />
            New Decision
          </Link>
        </Button>
      </div>

      {crisis.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm">{crisis.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Decisions"
          value={crisis._count.decisions}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          title="Active Alerts"
          value={activeAlerts.length}
          icon={<AlertTriangle className="h-4 w-4" />}
          variant={activeAlerts.length > 0 ? "destructive" : undefined}
        />
        <StatCard
          title="Affected Population"
          value={crisis.affectedPopulation.toLocaleString()}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue="decisions">
        <TabsList>
          <TabsTrigger value="decisions">
            Decisions ({crisis.decisions.length})
          </TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts ({crisis.alerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="decisions" className="mt-4">
          {crisis.decisions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>No decisions recorded for this crisis yet.</p>
                <Button asChild className="mt-4" variant="outline">
                  <Link href={`/crises/${crisis.id}/decisions/new`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Record a Decision
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {crisis.decisions.map((decision) => (
                <Card key={decision.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{decision.title}</CardTitle>
                      <Badge variant="outline">
                        {decision.confidenceScore}% confidence
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      by {decision.madeBy.name} &middot;{" "}
                      {decision.createdAt.toLocaleDateString()}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{decision.decisionText}</p>
                    {decision.rationale && (
                      <>
                        <Separator className="my-3" />
                        <p className="text-sm text-muted-foreground">
                          <strong>Rationale:</strong> {decision.rationale}
                        </p>
                      </>
                    )}
                    {(decision.optionA ?? decision.optionB ?? decision.optionC) && (
                      <>
                        <Separator className="my-3" />
                        <div className="grid gap-2 sm:grid-cols-3">
                          {decision.optionA && (
                            <OptionCard
                              label="Option A"
                              text={decision.optionA}
                              selected={decision.selectedOption === "OPTION_A"}
                            />
                          )}
                          {decision.optionB && (
                            <OptionCard
                              label="Option B"
                              text={decision.optionB}
                              selected={decision.selectedOption === "OPTION_B"}
                            />
                          )}
                          {decision.optionC && (
                            <OptionCard
                              label="Option C"
                              text={decision.optionC}
                              selected={decision.selectedOption === "OPTION_C"}
                            />
                          )}
                        </div>
                      </>
                    )}
                    {decision.outcome && (
                      <>
                        <Separator className="my-3" />
                        <p className="text-sm">
                          <strong>Outcome:</strong> {decision.outcome}
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          {crisis.alerts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No alerts for this crisis.
              </CardContent>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Triggered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {crisis.alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <Badge variant="outline">{formatEnum(alert.type)}</Badge>
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={alert.severity} />
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm">{alert.message}</p>
                    </TableCell>
                    <TableCell>
                      {alert.isActive ? (
                        <Badge variant="destructive">Active</Badge>
                      ) : (
                        <Badge variant="outline">Resolved</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {alert.triggeredAt.toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  variant,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  variant?: "destructive";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${variant === "destructive" ? "text-destructive" : ""}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function OptionCard({
  label,
  text,
  selected,
}: {
  label: string;
  text: string;
  selected: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        selected ? "border-primary bg-primary/5" : ""
      }`}
    >
      <p className="font-medium">
        {label} {selected && "✓"}
      </p>
      <p className="text-muted-foreground">{text}</p>
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
