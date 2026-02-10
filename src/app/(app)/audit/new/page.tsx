import { CreateAuditForm } from "./_components/create-audit-form";

export const metadata = { title: "Record Decision — CLEAR" };

export default function NewAuditDecisionPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Record Decision</h1>
        <p className="text-muted-foreground">
          Document a decision for the accountability audit trail
        </p>
      </div>
      <CreateAuditForm />
    </div>
  );
}
