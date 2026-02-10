import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import Link from "next/link";

export const metadata = { title: "Preview Survey — CLEAR" };

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

export default async function SurveyPreviewPage({
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{template.name}</h1>
          <p className="text-muted-foreground">
            Survey Preview — This is how respondents will see the survey
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/surveys/${id}`}>Back to Template</Link>
        </Button>
      </div>

      {template.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm">{template.description}</p>
          </CardContent>
        </Card>
      )}

      {template.questions.map((q) => (
        <Card key={q.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">
                {q.questionNumber}. {q.questionText}
              </CardTitle>
              {q.isRequired && (
                <span className="text-destructive">*</span>
              )}
            </div>
            {q.helpText && (
              <CardDescription>{q.helpText}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <QuestionPreview question={q} />
          </CardContent>
        </Card>
      ))}

      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <p className="text-sm">
            This is a preview. Deploy the survey to start collecting responses.
          </p>
          <Button variant="outline" className="mt-3" asChild>
            <Link href={`/surveys/${id}`}>Back to Template</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function QuestionPreview({
  question,
}: {
  question: {
    questionType: string;
    options: unknown;
  };
}) {
  const options = Array.isArray(question.options) ? question.options as string[] : [];

  switch (question.questionType) {
    case "TEXT":
      return <Input disabled placeholder="Short text response..." />;
    case "TEXTAREA":
      return <Textarea disabled placeholder="Long text response..." rows={3} />;
    case "NUMBER":
      return <Input disabled type="number" placeholder="0" className="w-32" />;
    case "DATE":
      return <Input disabled type="date" className="w-48" />;
    case "SINGLE_CHOICE":
      return (
        <div className="space-y-2">
          {options.map((opt, i) => (
            <label key={i} className="flex items-center gap-2">
              <input type="radio" disabled name="preview" />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      );
    case "MULTIPLE_CHOICE":
      return (
        <div className="space-y-2">
          {options.map((opt, i) => (
            <label key={i} className="flex items-center gap-2">
              <input type="checkbox" disabled />
              <span className="text-sm">{opt}</span>
            </label>
          ))}
        </div>
      );
    case "SCALE":
      return (
        <div className="flex items-center gap-1">
          {Array.from({ length: 10 }, (_, i) => (
            <Label
              key={i}
              className="flex h-10 w-10 items-center justify-center rounded-lg border text-sm hover:bg-muted"
            >
              {i + 1}
            </Label>
          ))}
        </div>
      );
    case "BOOLEAN":
      return (
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input type="radio" disabled name="bool-preview" />
            <span className="text-sm">Yes</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" disabled name="bool-preview" />
            <span className="text-sm">No</span>
          </label>
        </div>
      );
    case "LOCATION":
      return (
        <div className="flex gap-2">
          <Input disabled placeholder="Latitude" className="w-32" />
          <Input disabled placeholder="Longitude" className="w-32" />
        </div>
      );
    default:
      return (
        <Badge variant="outline">
          {questionTypeLabels[question.questionType] ?? question.questionType}
        </Badge>
      );
  }
}
