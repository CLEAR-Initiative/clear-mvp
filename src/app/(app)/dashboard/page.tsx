import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { db } from "~/server/db";

export default async function DashboardPage() {
  const [crisisCount, activeCrisisCount, decisionCount, alertCount] =
    await Promise.all([
      db.crisis.count(),
      db.crisis.count({ where: { status: "ACTIVE" } }),
      db.decision.count(),
      db.alert.count({ where: { isActive: true } }),
    ]);

  const recentCrises = await db.crisis.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { decisions: true, alerts: true } } },
  });

  const recentDecisions = await db.decision.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { crisis: { select: { title: true } }, madeBy: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          CLEAR — Crisis Learning, Early-warning, Anticipation, and Response
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Crises" value={crisisCount} />
        <StatCard title="Active Crises" value={activeCrisisCount} variant="destructive" />
        <StatCard title="Decisions Made" value={decisionCount} />
        <StatCard title="Active Alerts" value={alertCount} variant="warning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Crises</CardTitle>
          </CardHeader>
          <CardContent>
            {recentCrises.length === 0 ? (
              <p className="text-sm text-muted-foreground">No crises recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {recentCrises.map((crisis) => (
                  <div
                    key={crisis.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium text-sm">{crisis.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {crisis.location} &middot; {crisis._count.decisions} decisions
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={crisis.severity} />
                      <StatusBadge status={crisis.status} />
                    </div>
                  </div>
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
                  <div
                    key={decision.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium text-sm">{decision.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {decision.crisis.title} &middot; by {decision.madeBy.name}
                      </p>
                    </div>
                    <Badge variant="outline">{decision.confidenceScore}%</Badge>
                  </div>
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
