import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CreateDecisionForm } from "./_components/create-decision-form";

export default async function NewDecisionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let crisis;
  try {
    crisis = await api.crisis.getById({ id });
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/crises/${crisis.id}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to {crisis.title}
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">New Decision</h1>
        <p className="text-muted-foreground">
          Record a decision for {crisis.title}.
        </p>
      </div>

      <CreateDecisionForm crisisId={crisis.id} />
    </div>
  );
}
