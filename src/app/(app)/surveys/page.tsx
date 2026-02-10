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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

export const metadata = { title: "Surveys — CLEAR" };

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

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  ACTIVE: "default",
  PAUSED: "outline",
  COMPLETED: "secondary",
  ARCHIVED: "outline",
};

export default async function SurveysPage() {
  const [templates, surveys] = await Promise.all([
    api.survey.templates({}),
    api.survey.surveys({}),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Surveys</h1>
          <p className="text-muted-foreground">
            Create and manage humanitarian assessment surveys
          </p>
        </div>
        <Button asChild>
          <Link href="/surveys/new">Create Template</Link>
        </Button>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">
            Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="deployed">
            Deployed Surveys ({surveys.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {templates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No survey templates yet. Create one to get started.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <Card key={t.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">
                        <Link
                          href={`/surveys/${t.id}`}
                          className="hover:underline"
                        >
                          {t.name}
                        </Link>
                      </CardTitle>
                      <Badge variant={t.isActive ? "default" : "outline"}>
                        {t.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription>
                      {categoryLabels[t.category] ?? t.category}
                      {t.estimatedDuration && ` · ${t.estimatedDuration} min`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{t._count.questions} questions</span>
                      <span>{t._count.surveys} deployments</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      by {t.createdBy.name}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="deployed" className="space-y-4">
          {surveys.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No surveys deployed yet. Deploy one from a template.
              </CardContent>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Crisis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responses</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {surveys.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/surveys/${s.templateId}?surveyId=${s.id}`}
                        className="hover:underline"
                      >
                        {s.title}
                      </Link>
                    </TableCell>
                    <TableCell>{s.template.name}</TableCell>
                    <TableCell>
                      {s.crisis ? (
                        <Link
                          href={`/crises/${s.crisis.id}`}
                          className="text-primary hover:underline"
                        >
                          {s.crisis.title}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[s.status] ?? "secondary"}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {s._count.submissions}
                      {s.targetResponses && ` / ${s.targetResponses}`}
                    </TableCell>
                    <TableCell>
                      {new Date(s.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
