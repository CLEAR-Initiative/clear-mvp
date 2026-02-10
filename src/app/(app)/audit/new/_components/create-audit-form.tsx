"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Plus, X } from "lucide-react";

export function CreateAuditForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [stakeholders, setStakeholders] = useState<string[]>([]);
  const [newSource, setNewSource] = useState("");
  const [newStakeholder, setNewStakeholder] = useState("");

  const createAudit = api.audit.create.useMutation({
    onSuccess: (data) => {
      router.push(`/audit/${data.id}`);
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    createAudit.mutate({
      title: fd.get("title") as string,
      type: fd.get("type") as "SECURITY_RESPONSE",
      decisionMade: fd.get("decisionMade") as string,
      rationale: fd.get("rationale") as string,
      riskLevel: fd.get("riskLevel") as "LOW",
      alternatives: (fd.get("alternatives") as string) || undefined,
      locationAddress: (fd.get("locationAddress") as string) || undefined,
      priority: fd.get("priority") as "NORMAL",
      informationSources: sources,
      stakeholders,
    });
  }

  function addSource() {
    if (newSource.trim()) {
      setSources((prev) => [...prev, newSource.trim()]);
      setNewSource("");
    }
  }

  function addStakeholder() {
    if (newStakeholder.trim()) {
      setStakeholders((prev) => [...prev, newStakeholder.trim()]);
      setNewStakeholder("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Decision Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                required
                placeholder="e.g., Emergency shelter allocation for Darfur IDPs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Decision Type</Label>
              <Select name="type" defaultValue="RESOURCE_ALLOCATION">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SECURITY_RESPONSE">Security Response</SelectItem>
                  <SelectItem value="RESOURCE_ALLOCATION">Resource Allocation</SelectItem>
                  <SelectItem value="BENEFICIARY_SELECTION">Beneficiary Selection</SelectItem>
                  <SelectItem value="PROGRAM_MODIFICATION">Program Modification</SelectItem>
                  <SelectItem value="PARTNER_MANAGEMENT">Partner Management</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="decisionMade">Decision Made</Label>
            <Textarea
              id="decisionMade"
              name="decisionMade"
              required
              rows={3}
              placeholder="Describe the decision that was made..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rationale">Rationale</Label>
            <Textarea
              id="rationale"
              name="rationale"
              required
              rows={3}
              placeholder="Why was this decision made? What evidence supported it?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alternatives">Alternatives Considered</Label>
            <Textarea
              id="alternatives"
              name="alternatives"
              rows={2}
              placeholder="What other options were considered?"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Risk & Priority</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="riskLevel">Risk Level</Label>
              <Select name="riskLevel" defaultValue="MEDIUM">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select name="priority" defaultValue="NORMAL">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="locationAddress">Location</Label>
            <Input
              id="locationAddress"
              name="locationAddress"
              placeholder="e.g., Kalma Camp, South Darfur"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sources & Stakeholders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Information Sources</Label>
            <div className="flex gap-2">
              <Input
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                placeholder="e.g., OCHA Situation Report"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSource();
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addSource}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {sources.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {sources.map((s, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {s}
                    <button
                      type="button"
                      onClick={() => setSources((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Stakeholders</Label>
            <div className="flex gap-2">
              <Input
                value={newStakeholder}
                onChange={(e) => setNewStakeholder(e.target.value)}
                placeholder="e.g., UNHCR, WFP, Local authorities"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addStakeholder();
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addStakeholder}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {stakeholders.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {stakeholders.map((s, i) => (
                  <Badge key={i} variant="outline" className="gap-1">
                    {s}
                    <button
                      type="button"
                      onClick={() => setStakeholders((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={createAudit.isPending}>
          {createAudit.isPending ? "Recording..." : "Record Decision"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
