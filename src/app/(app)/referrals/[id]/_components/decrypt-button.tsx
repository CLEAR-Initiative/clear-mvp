"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Lock, Unlock, AlertTriangle } from "lucide-react";

export function DecryptButton({ referralId }: { referralId: string }) {
  const [decryptedData, setDecryptedData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decrypt = api.referral.decryptData.useMutation({
    onSuccess: (data) => setDecryptedData(data),
    onError: (err) => setError(err.message),
  });

  if (error) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <p className="text-sm">{error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setError(null)}>
          Dismiss
        </Button>
      </div>
    );
  }

  if (decryptedData) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Unlock className="h-4 w-4" />
          Decrypted beneficiary data
        </div>
        <div className="rounded-lg border bg-muted/50 p-4">
          <dl className="grid gap-2 sm:grid-cols-2">
            {Object.entries(decryptedData).map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs font-medium text-muted-foreground">
                  {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                </dt>
                <dd className="mt-0.5 text-sm">
                  {value == null
                    ? "—"
                    : typeof value === "object"
                      ? JSON.stringify(value)
                      : typeof value === "string"
                        ? value
                        : JSON.stringify(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDecryptedData(null)}
        >
          <Lock className="mr-2 h-3 w-3" />
          Re-encrypt
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Beneficiary data is encrypted. Click below to decrypt and view.
      </p>
      <Button
        variant="outline"
        onClick={() => decrypt.mutate({ id: referralId })}
        disabled={decrypt.isPending}
      >
        <Unlock className="mr-2 h-4 w-4" />
        {decrypt.isPending ? "Decrypting..." : "Decrypt Data"}
      </Button>
    </div>
  );
}
