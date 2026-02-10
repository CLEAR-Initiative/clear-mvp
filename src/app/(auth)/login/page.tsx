import { redirect } from "next/navigation";

import { auth } from "~/server/better-auth";
import { getSession } from "~/server/better-auth/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground text-lg font-bold">
            C
          </div>
          <CardTitle className="text-2xl">Welcome to CLEAR</CardTitle>
          <CardDescription>
            Crisis Learning, Early-warning, Anticipation, and Response
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <form>
            <Button
              className="w-full"
              formAction={async () => {
                "use server";
                const res = await auth.api.signInSocial({
                  body: {
                    provider: "github",
                    callbackURL: "/dashboard",
                  },
                });
                if (!res.url) {
                  throw new Error("No URL returned from signInSocial");
                }
                redirect(res.url);
              }}
            >
              Sign in with GitHub
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground">
            Humanitarian decision support platform developed in partnership with
            the Norwegian Refugee Council.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
