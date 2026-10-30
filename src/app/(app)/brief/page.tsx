"use client";

import { Suspense } from "react";
import { BriefListPage } from "./_components/brief-list-page";

/**
 * Briefs: hidden (no nav entry) and admin-only. Middleware sends anyone else
 * to /no-access, and every `briefs` procedure refuses them.
 */
export default function BriefsPage() {
  return (
    <Suspense>
      <BriefListPage />
    </Suspense>
  );
}
