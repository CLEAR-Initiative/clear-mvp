import Link from "next/link";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";
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
import { Plus, Shield, Send, CheckCircle, Clock } from "lucide-react";
import { ReferralFilters } from "./_components/referral-filters";

export const metadata = { title: "Referrals — CLEAR" };

const urgencyVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ROUTINE: "secondary",
  PRIORITY: "default",
  URGENT: "destructive",
  EMERGENCY: "destructive",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  SENT: "default",
  RECEIVED: "secondary",
  ACCEPTED: "secondary",
  IN_PROGRESS_REFERRAL: "default",
  COMPLETED: "secondary",
  REJECTED: "destructive",
  CANCELLED: "outline",
  EXPIRED: "outline",
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
  INDIVIDUAL_CASE: "Individual",
  FAMILY_CASE: "Family",
  GROUP_REFERRAL: "Group",
  EMERGENCY_TRANSFER: "Emergency",
  INFORMATION_SHARING: "Info Sharing",
};

export default async function ReferralsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : undefined;
  const urgency = typeof params.urgency === "string" ? params.urgency : undefined;
  const type = typeof params.type === "string" ? params.type : undefined;

  const [{ items: referrals }, stats] = await Promise.all([
    api.referral.list({
      status: status as "DRAFT" | undefined,
      urgency: urgency as "ROUTINE" | undefined,
      type: type as "INDIVIDUAL_CASE" | undefined,
    }),
    api.referral.stats(),
  ]);

  const active = stats.byStatus.find((s) => s.status === "SENT")?._count ?? 0;
  const completed = stats.byStatus.find((s) => s.status === "COMPLETED")?._count ?? 0;
  const pending = stats.byStatus.find((s) => s.status === "DRAFT")?._count ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Secure Referrals</h1>
          <p className="text-muted-foreground">
            Encrypted beneficiary referrals between partner organizations
          </p>
        </div>
        <Button asChild>
          <Link href="/referrals/new">
            <Plus className="mr-2 h-4 w-4" />
            New Referral
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partners</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.partners}</div>
          </CardContent>
        </Card>
      </div>

      <ReferralFilters />

      {/* Referrals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Referrals</CardTitle>
          <CardDescription>
            {referrals.length} referral{referrals.length !== 1 && "s"} found
            {pending > 0 && ` · ${pending} draft${pending !== 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No referrals found. Create your first referral to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link
                        href={`/referrals/${r.id}`}
                        className="font-medium hover:underline"
                      >
                        {typeLabels[r.referralType] ?? r.referralType}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.fromOrganization.name}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.toOrganization.name}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {r.serviceRequested}
                    </TableCell>
                    <TableCell>
                      <Badge variant={urgencyVariant[r.urgency] ?? "secondary"}>
                        {r.urgency}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[r.status] ?? "outline"}>
                        {statusLabels[r.status] ?? r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
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
