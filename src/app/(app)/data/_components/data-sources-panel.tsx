"use client";

import { api } from "~/trpc/react";
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

const qualityVariant: Record<string, "default" | "secondary" | "outline"> = {
  high: "default",
  medium: "secondary",
  low: "outline",
};

const typeLabels: Record<string, string> = {
  API: "API",
  DATABASE: "Database",
  SURVEY: "Survey",
  MANUAL: "Manual",
  SATELLITE: "Satellite",
  IOT: "IoT",
  SOCIAL_MEDIA: "Social Media",
  OTHER_SOURCE: "Other",
};

export function DataSourcesPanel() {
  const { data: stats } = api.dataSource.stats.useQuery();
  const { data } = api.dataSource.list.useQuery({});
  const { data: partners } = api.dataSource.partnerSources.useQuery({});

  const sources = data?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSources}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSources}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Recent Outages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentOutages}</div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Failing Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.failingMetrics}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Registered Sources */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Data Sources</CardTitle>
          <CardDescription>
            Data sources configured in the system with availability tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No data sources registered yet. Sources can be added via the API.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sync</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell className="font-medium">{source.name}</TableCell>
                    <TableCell>{typeLabels[source.sourceType] ?? source.sourceType}</TableCell>
                    <TableCell className="capitalize">{source.sector}</TableCell>
                    <TableCell>
                      <Badge variant={qualityVariant[source.qualityLevel] ?? "outline"}>
                        {source.qualityLevel}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{source.updateFrequency}</TableCell>
                    <TableCell>
                      <Badge variant={source.isActive ? "default" : "secondary"}>
                        {source.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {source.lastSyncedAt
                        ? new Date(source.lastSyncedAt).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Partner Sources Catalog */}
      <Card>
        <CardHeader>
          <CardTitle>Partner Source Catalog</CardTitle>
          <CardDescription>
            Known humanitarian data partners and their available data types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sectors</TableHead>
                <TableHead>Data Types</TableHead>
                <TableHead>Update Freq.</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(partners ?? []).map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell className="font-medium">{partner.name}</TableCell>
                  <TableCell>{partner.type}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {partner.sectors.map((s) => (
                        <Badge key={s} variant="outline" className="text-xs capitalize">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {partner.dataTypes.map((dt) => (
                        <span key={dt} className="text-xs text-muted-foreground">
                          {dt.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{partner.updateFrequency}</TableCell>
                  <TableCell>
                    <Badge variant={qualityVariant[partner.quality] ?? "outline"}>
                      {partner.quality}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        partner.accessLevel === "public"
                          ? "default"
                          : partner.accessLevel === "partner"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {partner.accessLevel}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
