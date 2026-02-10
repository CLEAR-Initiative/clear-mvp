import Link from "next/link";
import { Button } from "~/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CreateCrisisForm } from "./_components/create-crisis-form";

export default function NewCrisisPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/crises">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">New Crisis</h1>
        <p className="text-muted-foreground">
          Record a new humanitarian crisis.
        </p>
      </div>

      <CreateCrisisForm />
    </div>
  );
}
