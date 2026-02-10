"use client";

import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useState } from "react";

const nextStatuses: Record<string, { value: string; label: string }[]> = {
  DRAFT: [{ value: "SENT", label: "Send" }],
  SENT: [
    { value: "RECEIVED", label: "Mark Received" },
    { value: "CANCELLED", label: "Cancel" },
  ],
  RECEIVED: [
    { value: "ACCEPTED", label: "Accept" },
    { value: "REJECTED", label: "Reject" },
  ],
  ACCEPTED: [
    { value: "IN_PROGRESS_REFERRAL", label: "Start Processing" },
    { value: "CANCELLED", label: "Cancel" },
  ],
  IN_PROGRESS_REFERRAL: [
    { value: "COMPLETED", label: "Complete" },
    { value: "CANCELLED", label: "Cancel" },
  ],
};

type ValidStatus = "SENT" | "RECEIVED" | "ACCEPTED" | "IN_PROGRESS_REFERRAL" | "COMPLETED" | "REJECTED" | "CANCELLED";

export function StatusUpdateButton({
  id,
  currentStatus,
}: {
  id: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>("");

  const updateStatus = api.referral.updateStatus.useMutation({
    onSuccess: () => router.refresh(),
  });

  const options = nextStatuses[currentStatus];
  if (!options || options.length === 0) return null;

  return (
    <div className="flex gap-2">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Update status" />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        disabled={!selected || updateStatus.isPending}
        onClick={() => {
          if (selected) {
            updateStatus.mutate({ id, status: selected as ValidStatus });
          }
        }}
      >
        {updateStatus.isPending ? "Updating..." : "Update"}
      </Button>
    </div>
  );
}
