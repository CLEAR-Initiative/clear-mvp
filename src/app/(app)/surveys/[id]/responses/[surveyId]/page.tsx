import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/server";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export const metadata = { title: "Survey Responses — CLEAR" };

export default async function SurveyResponsesPage({
  params,
}: {
  params: Promise<{ id: string; surveyId: string }>;
}) {
  const { id, surveyId } = await params;

  let survey;
  try {
    survey = await api.survey.surveyResponses({ surveyId });
  } catch {
    notFound();
  }

  const questions = survey.template.questions;
  const submissions = survey.submissions;

  // Build analytics per question
  const analytics = questions.map((q) => {
    const responses = submissions.flatMap((s) =>
      s.responses.filter((r) => r.questionId === q.id),
    );
    const answered = responses.filter((r) => !r.isSkipped).length;
    const skipped = responses.filter((r) => r.isSkipped).length;

    let summary: { type: string; data: Record<string, number> | number | null } = {
      type: "text",
      data: null,
    };

    if (q.questionType === "NUMBER" || q.questionType === "SCALE") {
      const values = responses
        .filter((r) => r.responseNumber != null)
        .map((r) => r.responseNumber!);
      if (values.length > 0) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        summary = { type: "number", data: Math.round(avg * 10) / 10 };
      }
    } else if (
      q.questionType === "SINGLE_CHOICE" ||
      q.questionType === "MULTIPLE_CHOICE"
    ) {
      const counts: Record<string, number> = {};
      for (const r of responses) {
        if (r.responseText) {
          counts[r.responseText] = (counts[r.responseText] ?? 0) + 1;
        }
        if (r.responseJson && Array.isArray(r.responseJson)) {
          for (const val of r.responseJson as string[]) {
            counts[val] = (counts[val] ?? 0) + 1;
          }
        }
      }
      summary = { type: "distribution", data: counts };
    } else if (q.questionType === "BOOLEAN") {
      const yes = responses.filter((r) => r.responseBoolean === true).length;
      const no = responses.filter((r) => r.responseBoolean === false).length;
      summary = { type: "distribution", data: { Yes: yes, No: no } };
    }

    return { question: q, answered, skipped, summary };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{survey.title}</h1>
          <p className="text-muted-foreground">
            {submissions.length} response{submissions.length !== 1 && "s"}
            {survey.targetResponses && ` of ${survey.targetResponses} target`}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/surveys/${id}`}>Back to Template</Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Responses</CardDescription>
            <CardTitle className="text-3xl">{submissions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completion Rate</CardDescription>
            <CardTitle className="text-3xl">
              {submissions.length > 0
                ? Math.round(
                    (submissions.filter((s) => s.isComplete).length /
                      submissions.length) *
                      100,
                  )
                : 0}
              %
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Questions</CardDescription>
            <CardTitle className="text-3xl">{questions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-3xl">
              <Badge
                variant={survey.status === "ACTIVE" ? "default" : "secondary"}
              >
                {survey.status}
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Per-question Analytics */}
      {submissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No responses yet. Share the survey to start collecting data.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Response Breakdown</h2>
          {analytics.map(({ question: q, answered, skipped, summary }) => (
            <Card key={q.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Q{q.questionNumber}. {q.questionText}
                  </CardTitle>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>{answered} answered</span>
                    {skipped > 0 && <span>{skipped} skipped</span>}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {summary.type === "distribution" &&
                  summary.data &&
                  typeof summary.data === "object" && (
                    <div className="space-y-2">
                      {Object.entries(summary.data).map(
                        ([label, count]) => {
                          const pct =
                            answered > 0
                              ? Math.round((count / answered) * 100)
                              : 0;
                          return (
                            <div key={label} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>{label}</span>
                                <span className="text-muted-foreground">
                                  {count} ({pct}%)
                                </span>
                              </div>
                              <div className="h-2 rounded-full bg-muted">
                                <div
                                  className="h-2 rounded-full bg-primary"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  )}
                {summary.type === "number" && summary.data != null && (
                  <p className="text-2xl font-semibold">
                    Avg: {summary.data as number}
                  </p>
                )}
                {summary.type === "text" && (
                  <p className="text-sm text-muted-foreground">
                    {answered} text responses collected
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
