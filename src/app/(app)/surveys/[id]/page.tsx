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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { DeploySurveyButton } from "./_components/deploy-survey-button";

export const metadata = { title: "Survey Template — CLEAR" };

const questionTypeLabels: Record<string, string> = {
  TEXT: "Short Text",
  TEXTAREA: "Long Text",
  NUMBER: "Number",
  DATE: "Date",
  SINGLE_CHOICE: "Single Choice",
  MULTIPLE_CHOICE: "Multiple Choice",
  SCALE: "Scale",
  LOCATION: "Location",
  BOOLEAN: "Yes / No",
};

const categoryLabels: Record<string, string> = {
  RAPID_ASSESSMENT: "Rapid Assessment",
  MONITORING: "Monitoring",
  EVALUATION: "Evaluation",
  FEEDBACK: "Feedback",
  REGISTRATION: "Registration",
  NEEDS_ASSESSMENT: "Needs Assessment",
  POST_DISTRIBUTION: "Post-Distribution",
  BASELINE: "Baseline",
  ENDLINE: "Endline",
  OTHER: "Other",
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  DRAFT: "secondary",
  ACTIVE: "default",
  PAUSED: "outline",
  COMPLETED: "secondary",
  ARCHIVED: "outline",
};

export default async function SurveyTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let template;
  try {
    template = await api.survey.templateById({ id });
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {template.name}
            </h1>
            <Badge variant={template.isActive ? "default" : "outline"}>
              {template.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            {categoryLabels[template.category] ?? template.category}
            {template.estimatedDuration &&
              ` · ${template.estimatedDuration} min`}
            {" · "}
            {template.questions.length} questions
            {" · by "}
            {template.createdBy.name}
          </p>
          {template.description && (
            <p className="mt-2 text-sm">{template.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/surveys/${id}/preview`}>Preview</Link>
          </Button>
          <DeploySurveyButton templateId={id} templateName={template.name} />
        </div>
      </div>

      {/* Questions */}
      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
          <CardDescription>
            {template.questions.length} questions defined in this template
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {template.questions.map((q) => (
              <div key={q.id} className="flex gap-4 border-b pb-4 last:border-0 last:pb-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {q.questionNumber}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{q.questionText}</p>
                    {q.isRequired && (
                      <Badge variant="destructive" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {questionTypeLabels[q.questionType] ?? q.questionType}
                    </Badge>
                    {q.helpText && (
                      <span className="italic">{q.helpText}</span>
                    )}
                  </div>
                  {q.options && Array.isArray(q.options) && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(q.options as string[]).map((opt, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {opt}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Deployed Surveys */}
      {template.surveys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Deployed Surveys</CardTitle>
            <CardDescription>
              {template.surveys.length} survey
              {template.surveys.length !== 1 && "s"} deployed from this template
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responses</TableHead>
                  <TableHead>Deployed</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {template.surveys.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.title}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[s.status] ?? "secondary"}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{s._count.submissions}</TableCell>
                    <TableCell>
                      {s.deployedAt
                        ? new Date(s.deployedAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {s._count.submissions > 0 && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/surveys/${id}/responses/${s.id}`}>
                            View Responses
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
