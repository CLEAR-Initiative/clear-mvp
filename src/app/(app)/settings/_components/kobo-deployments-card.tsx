"use client";

import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
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
import { RefreshCw } from "lucide-react";

const syncStatusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  SYNCING: "default",
  SYNCED: "secondary",
  FAILED: "destructive",
};

export function KoboDeploymentsCard() {
  const router = useRouter();
  const deployments = api.kobo.listDeployments.useQuery();
  const syncMutation = api.kobo.syncResponses.useMutation({
    onSuccess: () => {
      deployments.refetch().catch(() => undefined);
      router.refresh();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>KoBo Deployments</CardTitle>
        <CardDescription>
          Surveys exported to KoBoToolbox for mobile data collection.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {deployments.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : !deployments.data || deployments.data.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No surveys have been deployed to KoBo yet. Deploy from the survey
            detail page.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Survey</TableHead>
                <TableHead>KoBo Asset</TableHead>
                <TableHead>Submissions</TableHead>
                <TableHead>Sync Status</TableHead>
                <TableHead>Last Synced</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {deployments.data.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">
                    {d.survey.title}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {d.koboAssetUid}
                  </TableCell>
                  <TableCell>{d.submissionCount}</TableCell>
                  <TableCell>
                    <Badge variant={syncStatusVariant[d.syncStatus] ?? "outline"}>
                      {d.syncStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {d.lastSyncedAt
                      ? new Date(d.lastSyncedAt).toLocaleString()
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => syncMutation.mutate({ deploymentId: d.id })}
                      disabled={syncMutation.isPending}
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${syncMutation.isPending ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
