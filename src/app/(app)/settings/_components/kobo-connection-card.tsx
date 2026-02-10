"use client";

import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { CheckCircle, XCircle, RefreshCw } from "lucide-react";

export function KoboConnectionCard() {
  const connection = api.kobo.validateConnection.useQuery(undefined, {
    retry: false,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          KoBoToolbox Connection
          {connection.data?.connected ? (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Connected
            </Badge>
          ) : connection.isError || connection.data?.connected === false ? (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" />
              Not Connected
            </Badge>
          ) : null}
        </CardTitle>
        <CardDescription>
          Connect to KoBoToolbox to export surveys and sync responses for
          mobile data collection.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connection.data?.connected ? (
          <div className="space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="font-medium text-muted-foreground">Username:</span>
              <span>{connection.data.username}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-muted-foreground">Server:</span>
              <span className="font-mono text-xs">{connection.data.serverUrl}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              To connect, set the following environment variables and restart:
            </p>
            <div className="rounded-lg bg-muted p-3 font-mono text-xs">
              <p>KOBO_API_TOKEN=your_token_here</p>
              <p>KOBO_SERVER_URL=https://kf.kobotoolbox.org</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your API token from your KoBoToolbox account settings page.
            </p>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => connection.refetch()}
          disabled={connection.isRefetching}
        >
          <RefreshCw className={`mr-2 h-3 w-3 ${connection.isRefetching ? "animate-spin" : ""}`} />
          Test Connection
        </Button>
      </CardContent>
    </Card>
  );
}
