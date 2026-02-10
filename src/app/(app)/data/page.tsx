import { api } from "~/trpc/server";
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

export const metadata = { title: "Data Feeds — CLEAR" };

export default async function DataFeedsPage() {
  const [feedStatus, earthquakes, reports] = await Promise.all([
    api.feeds.status(),
    api.feeds.earthquakes({ minMagnitude: 4.5, period: "week" }),
    api.feeds.reliefweb({ limit: 10 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Live Data Feeds</h1>
        <p className="text-muted-foreground">
          Real-time external data sources for crisis monitoring
        </p>
      </div>

      {/* Feed Status Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {feedStatus.map((feed) => (
          <Card key={feed.name}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {feed.name}
                </CardTitle>
                <Badge
                  variant={
                    feed.status === "online" ? "default" : "destructive"
                  }
                >
                  {feed.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Last checked:{" "}
                {new Date(feed.lastChecked).toLocaleTimeString()}
              </p>
              {feed.recordCount != null && (
                <p className="text-xs text-muted-foreground">
                  {feed.recordCount} records available
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Earthquakes */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Earthquakes</CardTitle>
          <CardDescription>
            Significant seismic events from USGS (M4.5+ this week)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {earthquakes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No significant earthquakes reported.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Magnitude</TableHead>
                  <TableHead>Depth</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Tsunami</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earthquakes.slice(0, 15).map((eq) => (
                  <TableRow key={eq.id}>
                    <TableCell>
                      <a
                        href={eq.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {eq.place}
                      </a>
                    </TableCell>
                    <TableCell>
                      <MagnitudeBadge magnitude={eq.magnitude} />
                    </TableCell>
                    <TableCell>{eq.depth.toFixed(1)} km</TableCell>
                    <TableCell>
                      {new Date(eq.time).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {eq.tsunami ? (
                        <Badge variant="destructive">Yes</Badge>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ReliefWeb Reports */}
      <Card>
        <CardHeader>
          <CardTitle>ReliefWeb Reports</CardTitle>
          <CardDescription>
            Latest humanitarian reports and situation updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No reports available.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="max-w-md">
                      <a
                        href={report.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline line-clamp-2"
                      >
                        {report.title}
                      </a>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {report.source}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {report.country}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {report.date
                        ? new Date(report.date).toLocaleDateString()
                        : "—"}
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

function MagnitudeBadge({ magnitude }: { magnitude: number }) {
  const variant =
    magnitude >= 7
      ? "destructive"
      : magnitude >= 5.5
        ? "default"
        : "secondary";

  return (
    <Badge variant={variant}>
      M{magnitude.toFixed(1)}
    </Badge>
  );
}
