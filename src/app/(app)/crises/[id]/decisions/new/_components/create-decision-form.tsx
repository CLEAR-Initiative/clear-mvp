"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Card, CardContent } from "~/components/ui/card";

export function CreateDecisionForm({ crisisId }: { crisisId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(50);

  const createDecision = api.decision.create.useMutation({
    onSuccess: () => {
      router.push(`/crises/${crisisId}`);
      router.refresh();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    createDecision.mutate({
      crisisId,
      title: formData.get("title") as string,
      decisionText: formData.get("decisionText") as string,
      rationale: (formData.get("rationale") as string) || undefined,
      confidenceScore: confidence,
      optionA: (formData.get("optionA") as string) || undefined,
      optionB: (formData.get("optionB") as string) || undefined,
      optionC: (formData.get("optionC") as string) || undefined,
      selectedOption: formData.get("selectedOption") as "OPTION_A" | "OPTION_B" | "OPTION_C" | "OTHER",
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Decision Title</Label>
            <Input
              id="title"
              name="title"
              required
              placeholder="e.g. Emergency Cash Assistance Scale-up"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="decisionText">Decision</Label>
            <Textarea
              id="decisionText"
              name="decisionText"
              required
              rows={3}
              placeholder="Describe the decision being made..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rationale">Rationale</Label>
            <Textarea
              id="rationale"
              name="rationale"
              rows={3}
              placeholder="Why was this decision made? What evidence supports it?"
            />
          </div>

          <div className="space-y-2">
            <Label>
              Confidence Score: <strong>{confidence}%</strong>
            </Label>
            <input
              type="range"
              min="0"
              max="100"
              value={confidence}
              onChange={(e) => setConfidence(parseInt(e.target.value, 10))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Low confidence</span>
              <span>High confidence</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Decision Options (optional)</Label>
            <div className="space-y-2">
              <Input name="optionA" placeholder="Option A" />
              <Input name="optionB" placeholder="Option B" />
              <Input name="optionC" placeholder="Option C" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="selectedOption">Selected Option</Label>
            <Select name="selectedOption" required defaultValue="OPTION_A">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPTION_A">Option A</SelectItem>
                <SelectItem value="OPTION_B">Option B</SelectItem>
                <SelectItem value="OPTION_C">Option C</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={createDecision.isPending}>
              {createDecision.isPending ? "Recording..." : "Record Decision"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
