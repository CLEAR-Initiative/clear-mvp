"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";

interface MapFiltersProps {
  filters: {
    severity?: string;
    type?: string;
    status?: string;
  };
  onFiltersChange: (filters: MapFiltersProps["filters"]) => void;
  crisisCount: number;
  visibleCount: number;
}

export function MapFilters({
  filters,
  onFiltersChange,
  crisisCount,
  visibleCount,
}: MapFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <Badge variant="secondary" className="whitespace-nowrap">
        {visibleCount} of {crisisCount} crises
      </Badge>

      <Select
        value={filters.severity ?? "all"}
        onValueChange={(v) =>
          onFiltersChange({
            ...filters,
            severity: v === "all" ? undefined : v,
          })
        }
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
        value={filters.type ?? "all"}
        onValueChange={(v) =>
          onFiltersChange({ ...filters, type: v === "all" ? undefined : v })
        }
      >
        <SelectTrigger className="w-[170px]">
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
          <SelectItem value="OTHER">Other</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.status ?? "all"}
        onValueChange={(v) =>
          onFiltersChange({ ...filters, status: v === "all" ? undefined : v })
        }
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
    </div>
  );
}
