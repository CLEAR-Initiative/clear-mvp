"use client";

import { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

const ALL_SECTORS = [
  "protection",
  "health",
  "nutrition",
  "wash",
  "shelter",
  "education",
  "livelihoods",
];

const severityVariant: Record<string, "destructive" | "default" | "secondary"> = {
  critical: "destructive",
  high: "default",
  medium: "secondary",
};

const priorityVariant: Record<string, "destructive" | "default" | "secondary"> = {
  urgent: "destructive",
  high: "default",
  medium: "secondary",
};

const statusColors: Record<string, string> = {
  fully_available: "bg-green-500",
  partially_available: "bg-yellow-500",
  not_available: "bg-red-500",
};

export function GapAnalysisPanel() {
  const [selectedSectors, setSelectedSectors] = useState<string[]>(ALL_SECTORS);

  const { data: availability } = api.dataSource.checkAvailability.useQuery(
    { sectors: selectedSectors },
    { enabled: selectedSectors.length > 0 },
  );

  const { data: gaps } = api.dataSource.gapAnalysis.useQuery(
    { sectors: selectedSectors },
    { enabled: selectedSectors.length > 0 },
  );

  const { data: sectorIndicators } = api.dataSource.sectorIndicators.useQuery();

  function toggleSector(sector: string) {
    setSelectedSectors((prev) =>
      prev.includes(sector)
        ? prev.filter((s) => s !== sector)
        : [...prev, sector],
    );
  }

  return (
    <div className="space-y-6">
      {/* Sector selector */}
      <Card>
        <CardHeader>
          <CardTitle>Sector Selection</CardTitle>
          <CardDescription>
            Select sectors to analyze data availability and gaps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ALL_SECTORS.map((sector) => {
              const indicator = sectorIndicators?.find((s) => s.sector === sector);
              return (
                <Button
                  key={sector}
                  variant={selectedSectors.includes(sector) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleSector(sector)}
                  className="capitalize"
                >
                  {sector}
                  {indicator && (
                    <Badge variant="secondary" className="ml-1.5 text-xs">
                      {indicator.count}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Availability overview */}
      {availability && (
        <Card>
          <CardHeader>
            <CardTitle>Data Availability</CardTitle>
            <CardDescription>
              Coverage assessment across {availability.sectors.length} sectors —{" "}
              {availability.confidence}% confidence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-4 md:grid-cols-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{availability.totalRequired}</div>
                <p className="text-xs text-muted-foreground">Required Indicators</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {availability.fullyAvailable}
                </div>
                <p className="text-xs text-muted-foreground">Fully Available</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {availability.partiallyAvailable}
                </div>
                <p className="text-xs text-muted-foreground">Partially Available</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {availability.notAvailable}
                </div>
                <p className="text-xs text-muted-foreground">Not Available</p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sector</TableHead>
                  <TableHead>Coverage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Missing</TableHead>
                  <TableHead>Primary Collection</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availability.sectors.map((sector) => (
                  <TableRow key={sector.sector}>
                    <TableCell className="font-medium capitalize">
                      {sector.sector}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary transition-all"
                            style={{ width: `${sector.coverage}%` }}
                          />
                        </div>
                        <span className="text-xs">{sector.coverage}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${statusColors[sector.status] ?? "bg-gray-400"}`}
                        />
                        <span className="text-xs capitalize">
                          {sector.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {sector.availableCount}/{sector.totalIndicators}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {sector.missingIndicators.map((ind) => (
                          <Badge key={ind} variant="outline" className="text-xs">
                            {ind.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {sector.primaryCollectionNeeded ? (
                        <Badge variant="destructive">Needed</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">No</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Gap Details */}
      {gaps && gaps.gapCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Gap Details</CardTitle>
            <CardDescription>
              {gaps.gapCount} gaps identified across {gaps.totalRequired} required
              indicators ({gaps.coveragePercentage}% coverage)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indicator</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Collection Method</TableHead>
                  <TableHead>Est. Cost</TableHead>
                  <TableHead>Timeframe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gaps.gaps.map((gap) => (
                  <TableRow key={`${gap.sector}-${gap.indicator}`}>
                    <TableCell className="font-medium">
                      {gap.indicator.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="capitalize">{gap.sector}</TableCell>
                    <TableCell>
                      <Badge variant={severityVariant[gap.severity] ?? "secondary"}>
                        {gap.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>{gap.collectionMethod}</TableCell>
                    <TableCell>${gap.estimatedCost.toLocaleString()}</TableCell>
                    <TableCell>{gap.timeframe}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {gaps && gaps.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>
              Prioritized actions to address data gaps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {gaps.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <Badge variant={priorityVariant[rec.priority] ?? "secondary"}>
                    {rec.priority}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium capitalize">{rec.sector}</p>
                    <p className="text-sm text-muted-foreground">
                      {rec.recommendation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
