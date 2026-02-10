import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";
import { LoginForm } from "./_components/login-form";

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted p-4">
      <LoginForm />
    </main>
  );
}
