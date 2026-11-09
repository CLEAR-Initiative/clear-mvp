"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Center, Loader } from "@mantine/core";
import { api } from "~/trpc/react";
import { readOnboardingState } from "~/lib/onboarding/storage";
import { resolveWelcomeEntry } from "~/lib/onboarding/resolve-redirect";

// Onboarding progress lives in localStorage, so the step can only be chosen client-side.
export default function WelcomePage() {
  const router = useRouter();
  const { data, isLoading } = api.auth.me.useQuery();
  const userId = data?.user?.id;

  useEffect(() => {
    if (isLoading) return;
    if (!userId) {
      router.replace("/welcome/profile");
      return;
    }
    router.replace(resolveWelcomeEntry(readOnboardingState(userId)));
  }, [isLoading, userId, router]);

  return (
    <Center mih="100vh">
      <Loader size="sm" />
    </Center>
  );
}
