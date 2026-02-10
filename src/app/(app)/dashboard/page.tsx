import Link from "next/link";
import { api } from "~/trpc/server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { AlertTriangle, Plus } from "lucide-react";

export default async function DashboardPage() {
  const [stats, recentCrises, recentDecisions, activeAlerts] =
    await Promise.all([
      api.dashboard.stats(),
      api.dashboard.recentCrises(),
      api.dashboard.recentDecisions(),
      api.dashboard.activeAlerts(),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            CLEAR — Crisis Learning, Early-warning, Anticipation, and Response
          </p>
        </div>
        <Button asChild>
          <Link href="/crises/new">
            <Plus className="mr-2 h-4 w-4" />
            New Crisis
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Crises" value={stats.totalCrises} />
        <StatCard title="Active Crises" value={stats.activeCrises} variant="destructive" />
        <StatCard title="Decisions Made" value={stats.totalDecisions} />
        <StatCard title="Active Alerts" value={stats.activeAlerts} variant="warning" />
      </div>

      {activeAlerts.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts ({activeAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeAlerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start justify-between gap-4 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{alert.message}</p>
                    <Link
                      href={`/crises/${alert.crisis.id}`}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      {alert.crisis.title}
                    </Link>
                  </div>
                  <SeverityBadge severity={alert.severity} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Crises</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/crises">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentCrises.length === 0 ? (
              <p className="text-sm text-muted-foreground">No crises recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {recentCrises.map((crisis) => (
                  <Link
                    key={crisis.id}
                    href={`/crises/${crisis.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">{crisis.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {crisis.location} &middot; {crisis._count.decisions} decisions
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={crisis.severity} />
                      <StatusBadge status={crisis.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Decisions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentDecisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No decisions recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {recentDecisions.map((decision) => (
                  <Link
                    key={decision.id}
                    href={`/crises/${decision.crisis.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">{decision.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {decision.crisis.title} &middot; by {decision.madeBy.name}
                      </p>
                    </div>
                    <Badge variant="outline">{decision.confidenceScore}%</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  variant,
}: {
  title: string;
  value: number;
  variant?: "destructive" | "warning";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={`text-3xl font-bold ${
            variant === "destructive"
              ? "text-destructive"
              : variant === "warning"
                ? "text-orange-500"
                : ""
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const variantMap: Record<string, "destructive" | "secondary" | "outline" | "default"> = {
    CRITICAL: "destructive",
    HIGH: "destructive",
    MODERATE: "default",
    LOW: "secondary",
  };
  return <Badge variant={variantMap[severity] ?? "outline"}>{severity}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, "destructive" | "secondary" | "outline" | "default"> = {
    ACTIVE: "default",
    MONITORING: "secondary",
    RESOLVED: "outline",
    ARCHIVED: "outline",
  };
  return <Badge variant={variantMap[status] ?? "outline"}>{status}</Badge>;
}
