"use client";

import { Suspense, use } from "react";
import { BriefComposerPage } from "../_components/brief-composer-page";

/**
 * A Brief's composer. Hidden and admin-only: middleware sends anyone else to
 * /no-access, and every `briefs` procedure refuses them. The Suspense boundary
 * is for the shared Detection filters, which read the search params.
 */
export default function BriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <BriefComposerPage briefId={id} />
    </Suspense>
  );
}
