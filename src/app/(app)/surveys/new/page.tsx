import { CreateTemplateForm } from "./_components/create-template-form";

export const metadata = { title: "Create Survey Template — CLEAR" };

export default function NewSurveyTemplatePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Create Survey Template
        </h1>
        <p className="text-muted-foreground">
          Define questions that can be deployed as surveys
        </p>
      </div>
      <CreateTemplateForm />
    </div>
  );
}
