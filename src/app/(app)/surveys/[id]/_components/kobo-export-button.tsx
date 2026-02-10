"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { Upload, CheckCircle } from "lucide-react";

export function KoboExportButton({ surveyIds }: { surveyIds: { id: string; title: string }[] }) {
  const [open, setOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState("");
  const [success, setSuccess] = useState(false);

  const exportMutation = api.kobo.exportSurvey.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setSelectedSurvey("");
      }, 2000);
    },
  });

  if (surveyIds.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Export to KoBo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export to KoBoToolbox</DialogTitle>
          <DialogDescription>
            Export a deployed survey to KoBoToolbox for mobile data collection.
            The survey will be created as a KoBo form and deployed automatically.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <p className="text-sm text-muted-foreground">
              Successfully deployed to KoBoToolbox!
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Survey to Export</Label>
              <Select value={selectedSurvey} onValueChange={setSelectedSurvey}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a deployed survey" />
                </SelectTrigger>
                <SelectContent>
                  {surveyIds.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {exportMutation.error && (
              <p className="text-sm text-destructive">
                {exportMutation.error.message}
              </p>
            )}
          </div>
        )}

        {!success && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => exportMutation.mutate({ surveyId: selectedSurvey })}
              disabled={!selectedSurvey || exportMutation.isPending}
            >
              {exportMutation.isPending ? "Exporting..." : "Export & Deploy"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
