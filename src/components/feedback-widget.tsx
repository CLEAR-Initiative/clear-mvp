"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { MessageSquarePlus } from "lucide-react";

export function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("GENERAL");
  const [text, setText] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = api.feedback.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setText("");
        setType("GENERAL");
        setRating(null);
      }, 1500);
    },
  });

  function handleSubmit() {
    submit.mutate({
      type: type as "GENERAL",
      pageUrl: pathname,
      feedbackText: text || undefined,
      rating: rating ?? undefined,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="fixed bottom-4 right-4 z-50 gap-2 shadow-lg"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Feedback
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Send Feedback</SheetTitle>
          <SheetDescription>
            Help us improve CLEAR. Your feedback is recorded and reviewed.
          </SheetDescription>
        </SheetHeader>

        {submitted ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <p className="text-center text-sm text-muted-foreground">
              Thank you for your feedback!
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Feedback Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">General</SelectItem>
                  <SelectItem value="BUG_REPORT">Bug Report</SelectItem>
                  <SelectItem value="FEATURE_REQUEST">Feature Request</SelectItem>
                  <SelectItem value="PAGE_COMMENT">Page Comment</SelectItem>
                  <SelectItem value="FLOW_RATING">Flow Rating</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Your Feedback</Label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tell us what you think..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Rating (optional)</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(rating === n ? null : n)}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm transition-colors ${
                      rating === n
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Page: {pathname}
            </p>
          </div>
        )}

        {!submitted && (
          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submit.isPending || (!text.trim() && !rating)}
            >
              {submit.isPending ? "Sending..." : "Send Feedback"}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
