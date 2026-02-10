"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

export function DeploySurveyButton({
  templateId,
  templateName,
}: {
  templateId: string;
  templateName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(templateName);
  const [targetResponses, setTargetResponses] = useState("");

  const deploy = api.survey.deploySurvey.useMutation({
    onSuccess: () => {
      setOpen(false);
      router.refresh();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Deploy Survey</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deploy Survey</DialogTitle>
          <DialogDescription>
            Create a live survey from the &quot;{templateName}&quot; template.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="survey-title">Survey Title</Label>
            <Input
              id="survey-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target">Target Responses (optional)</Label>
            <Input
              id="target"
              type="number"
              min={1}
              value={targetResponses}
              onChange={(e) => setTargetResponses(e.target.value)}
              placeholder="e.g., 100"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              deploy.mutate({
                templateId,
                title,
                targetResponses: targetResponses
                  ? parseInt(targetResponses)
                  : undefined,
              })
            }
            disabled={deploy.isPending || !title.trim()}
          >
            {deploy.isPending ? "Deploying..." : "Deploy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
