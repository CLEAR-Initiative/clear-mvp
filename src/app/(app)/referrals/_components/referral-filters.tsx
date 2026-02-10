"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";

export function ReferralFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasFilters = searchParams.has("status") || searchParams.has("urgency") || searchParams.has("type");

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={searchParams.get("status") ?? "all"}
        onValueChange={(v) => setParam("status", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="DRAFT">Draft</SelectItem>
          <SelectItem value="SENT">Sent</SelectItem>
          <SelectItem value="RECEIVED">Received</SelectItem>
          <SelectItem value="ACCEPTED">Accepted</SelectItem>
          <SelectItem value="IN_PROGRESS_REFERRAL">In Progress</SelectItem>
          <SelectItem value="COMPLETED">Completed</SelectItem>
          <SelectItem value="REJECTED">Rejected</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("urgency") ?? "all"}
        onValueChange={(v) => setParam("urgency", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Urgency" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Urgency</SelectItem>
          <SelectItem value="ROUTINE">Routine</SelectItem>
          <SelectItem value="PRIORITY">Priority</SelectItem>
          <SelectItem value="URGENT">Urgent</SelectItem>
          <SelectItem value="EMERGENCY">Emergency</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("type") ?? "all"}
        onValueChange={(v) => setParam("type", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="INDIVIDUAL_CASE">Individual</SelectItem>
          <SelectItem value="FAMILY_CASE">Family</SelectItem>
          <SelectItem value="GROUP_REFERRAL">Group</SelectItem>
          <SelectItem value="EMERGENCY_TRANSFER">Emergency</SelectItem>
          <SelectItem value="INFORMATION_SHARING">Info Sharing</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
