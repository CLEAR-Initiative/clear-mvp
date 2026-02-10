import { notFound } from "next/navigation";
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

export const metadata = { title: "Audit Decision — CLEAR" };

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

const evidenceTypeLabels: Record<string, string> = {
  DOCUMENT: "Document",
  IMAGE: "Image",
  AUDIO: "Audio",
  VIDEO: "Video",
  OTHER: "Other",
};

export default async function AuditDecisionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let audit;
  try {
    audit = await api.audit.getById({ id });
  } catch {
    notFound();
  }

  const sources = Array.isArray(audit.informationSources)
    ? (audit.informationSources as string[])
    : [];
  const stakeholders = Array.isArray(audit.stakeholders)
    ? (audit.stakeholders as string[])
    : [];
  const tags = Array.isArray(audit.tags) ? (audit.tags as string[]) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {audit.title}
            </h1>
            <Badge variant={riskColors[audit.riskLevel] ?? "secondary"}>
              {audit.riskLevel} Risk
            </Badge>
            <Badge variant="outline">{audit.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {typeLabels[audit.type] ?? audit.type} · by {audit.createdBy.name} ·{" "}
            {new Date(audit.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/audit">Back to Audit Trail</Link>
        </Button>
      </div>

      {/* Decision Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Decision</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                Decision Made
              </h3>
              <p className="mt-1 whitespace-pre-wrap">{audit.decisionMade}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                Rationale
              </h3>
              <p className="mt-1 whitespace-pre-wrap">{audit.rationale}</p>
            </div>
            {audit.alternatives && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Alternatives Considered
                </h3>
                <p className="mt-1 whitespace-pre-wrap">{audit.alternatives}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Priority
                </h3>
                <p className="mt-1">{audit.priority}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Sync Status
                </h3>
                <p className="mt-1">{audit.syncStatus}</p>
              </div>
            </div>

            {sources.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Information Sources
                </h3>
                <div className="mt-1 flex flex-wrap gap-1">
                  {sources.map((s, i) => (
                    <Badge key={i} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {stakeholders.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Stakeholders
                </h3>
                <div className="mt-1 flex flex-wrap gap-1">
                  {stakeholders.map((s, i) => (
                    <Badge key={i} variant="outline">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {tags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Tags
                </h3>
                <div className="mt-1 flex flex-wrap gap-1">
                  {tags.map((t, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {audit.locationAddress && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Location
                </h3>
                <p className="mt-1">{audit.locationAddress}</p>
                {audit.locationLat != null && audit.locationLng != null && (
                  <p className="text-xs text-muted-foreground">
                    {audit.locationLat.toFixed(4)}, {audit.locationLng.toFixed(4)}
                  </p>
                )}
              </div>
            )}

            {audit.cryptoHash && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Integrity Hash
                </h3>
                <p className="mt-1 truncate font-mono text-xs">
                  {audit.cryptoHash}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Evidence */}
      <Card>
        <CardHeader>
          <CardTitle>Evidence</CardTitle>
          <CardDescription>
            {audit.evidence.length} file
            {audit.evidence.length !== 1 && "s"} attached
          </CardDescription>
        </CardHeader>
        <CardContent>
          {audit.evidence.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No evidence attached to this decision.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit.evidence.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.filename}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {evidenceTypeLabels[e.type] ?? e.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatBytes(e.size)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(e.createdAt).toLocaleDateString()}
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
