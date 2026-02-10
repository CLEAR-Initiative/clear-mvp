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
import { DecryptButton } from "./_components/decrypt-button";
import { StatusUpdateButton } from "./_components/status-update-button";

export const metadata = { title: "Referral Detail — CLEAR" };

const urgencyVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ROUTINE: "secondary",
  PRIORITY: "default",
  URGENT: "destructive",
  EMERGENCY: "destructive",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  RECEIVED: "Received",
  ACCEPTED: "Accepted",
  IN_PROGRESS_REFERRAL: "In Progress",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

const typeLabels: Record<string, string> = {
  INDIVIDUAL_CASE: "Individual Case",
  FAMILY_CASE: "Family Case",
  GROUP_REFERRAL: "Group Referral",
  EMERGENCY_TRANSFER: "Emergency Transfer",
  INFORMATION_SHARING: "Information Sharing",
};

const orgTypeLabels: Record<string, string> = {
  UN_AGENCY: "UN Agency",
  INGO: "INGO",
  LOCAL_NGO: "Local NGO",
  GOVERNMENT: "Government",
  RED_CROSS_CRESCENT: "Red Cross/Crescent",
  COMMUNITY_BASED: "Community-Based",
  PRIVATE_SECTOR: "Private Sector",
  OTHER_ORG: "Other",
};

const consentLabels: Record<string, string> = {
  DATA_SHARING: "Data Sharing",
  SERVICE_PROVISION: "Service Provision",
  CROSS_BORDER_TRANSFER: "Cross-Border Transfer",
  THIRD_PARTY_DISCLOSURE: "Third-Party Disclosure",
};

export default async function ReferralDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let referral;
  try {
    referral = await api.referral.getById({ id });
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {typeLabels[referral.referralType] ?? referral.referralType}
            </h1>
            <Badge variant={urgencyVariant[referral.urgency] ?? "secondary"}>
              {referral.urgency}
            </Badge>
            <Badge variant="outline">
              {statusLabels[referral.status] ?? referral.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Created by {referral.sentBy.name} ·{" "}
            {new Date(referral.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <StatusUpdateButton id={referral.id} currentStatus={referral.status} />
          <Button variant="outline" asChild>
            <Link href="/referrals">Back to Referrals</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Organizations */}
        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                From
              </h3>
              <p className="mt-1 font-medium">{referral.fromOrganization.name}</p>
              <p className="text-sm text-muted-foreground">
                {orgTypeLabels[referral.fromOrganization.organizationType] ??
                  referral.fromOrganization.organizationType}
                {referral.fromOrganization.sector &&
                  ` · ${referral.fromOrganization.sector}`}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                To
              </h3>
              <p className="mt-1 font-medium">{referral.toOrganization.name}</p>
              <p className="text-sm text-muted-foreground">
                {orgTypeLabels[referral.toOrganization.organizationType] ??
                  referral.toOrganization.organizationType}
                {referral.toOrganization.sector &&
                  ` · ${referral.toOrganization.sector}`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Service Details */}
        <Card>
          <CardHeader>
            <CardTitle>Service Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                Service Requested
              </h3>
              <p className="mt-1 whitespace-pre-wrap">
                {referral.serviceRequested}
              </p>
            </div>
            {referral.notes && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">
                  Notes
                </h3>
                <p className="mt-1 whitespace-pre-wrap">{referral.notes}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {referral.sentAt && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Sent
                  </h3>
                  <p className="mt-1 text-sm">
                    {new Date(referral.sentAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {referral.receivedAt && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Received
                  </h3>
                  <p className="mt-1 text-sm">
                    {new Date(referral.receivedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {referral.completedAt && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Completed
                  </h3>
                  <p className="mt-1 text-sm">
                    {new Date(referral.completedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              {referral.expiresAt && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Expires
                  </h3>
                  <p className="mt-1 text-sm">
                    {new Date(referral.expiresAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Encrypted Data */}
      <Card>
        <CardHeader>
          <CardTitle>Beneficiary Data</CardTitle>
          <CardDescription>
            This data is encrypted at rest using AES-256-GCM. Decryption requires
            authorization and is logged.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DecryptButton referralId={referral.id} />
        </CardContent>
      </Card>

      {/* Consents */}
      <Card>
        <CardHeader>
          <CardTitle>Consent Records</CardTitle>
          <CardDescription>
            {referral.consents.length} consent record
            {referral.consents.length !== 1 && "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referral.consents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No consent records attached.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Granted By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referral.consents.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {consentLabels[c.consentType] ?? c.consentType}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.isGranted ? "secondary" : "destructive"}>
                        {c.isGranted ? "Granted" : "Not Granted"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.grantedBy ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.grantedAt
                        ? new Date(c.grantedAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.expiresAt
                        ? new Date(c.expiresAt).toLocaleDateString()
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
