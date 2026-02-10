import { RapidAssessmentForm } from "./_components/rapid-assessment-form";

export const metadata = { title: "New Assessment — CLEAR" };

export default function NewAssessmentPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Rapid Vulnerability Assessment
        </h1>
        <p className="text-muted-foreground">
          60-second household vulnerability scoring — Sudan RNA methodology
        </p>
      </div>
      <RapidAssessmentForm />
    </div>
  );
}
