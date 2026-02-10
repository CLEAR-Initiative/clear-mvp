"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { X } from "lucide-react";

export function CrisisFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/crises?${params.toString()}`);
  }

  function clearFilters() {
    router.push("/crises");
  }

  const hasFilters =
    searchParams.has("status") ||
    searchParams.has("type") ||
    searchParams.has("severity") ||
    searchParams.has("search");

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Search crises..."
        defaultValue={searchParams.get("search") ?? ""}
        className="max-w-xs"
        onChange={(e) => {
          const value = e.target.value;
          // Debounce search
          const timeout = setTimeout(() => updateParam("search", value || null), 300);
          return () => clearTimeout(timeout);
        }}
      />

      <Select
        value={searchParams.get("status") ?? "all"}
        onValueChange={(v) => updateParam("status", v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="MONITORING">Monitoring</SelectItem>
          <SelectItem value="RESOLVED">Resolved</SelectItem>
          <SelectItem value="ARCHIVED">Archived</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("severity") ?? "all"}
        onValueChange={(v) => updateParam("severity", v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Severity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Severity</SelectItem>
          <SelectItem value="CRITICAL">Critical</SelectItem>
          <SelectItem value="HIGH">High</SelectItem>
          <SelectItem value="MODERATE">Moderate</SelectItem>
          <SelectItem value="LOW">Low</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("type") ?? "all"}
        onValueChange={(v) => updateParam("type", v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="NATURAL_DISASTER">Natural Disaster</SelectItem>
          <SelectItem value="CONFLICT">Conflict</SelectItem>
          <SelectItem value="EPIDEMIC">Epidemic</SelectItem>
          <SelectItem value="FAMINE">Famine</SelectItem>
          <SelectItem value="REFUGEE_CRISIS">Refugee Crisis</SelectItem>
          <SelectItem value="ECONOMIC_CRISIS">Economic Crisis</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
