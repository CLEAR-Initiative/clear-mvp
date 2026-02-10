"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Shield, Plus, X } from "lucide-react";
import { Badge } from "~/components/ui/badge";

interface BeneficiaryField {
  key: string;
  value: string;
}

export function CreateReferralForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [beneficiaryFields, setBeneficiaryFields] = useState<BeneficiaryField[]>([
    { key: "fullName", value: "" },
    { key: "age", value: "" },
    { key: "gender", value: "" },
    { key: "nationality", value: "" },
  ]);
  const [newFieldKey, setNewFieldKey] = useState("");

  // Consent state
  const [consentDataSharing, setConsentDataSharing] = useState(false);
  const [consentServiceProvision, setConsentServiceProvision] = useState(false);
  const [consentGrantedBy, setConsentGrantedBy] = useState("");

  const partners = api.referral.listPartners.useQuery();

  const createReferral = api.referral.create.useMutation({
    onSuccess: (data) => {
      router.push(`/referrals/${data.id}`);
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    // Build beneficiary data object
    const beneficiaryData: Record<string, string | number | boolean | null> = {};
    for (const field of beneficiaryFields) {
      if (field.key && field.value) {
        beneficiaryData[field.key] = field.value;
      }
    }

    if (Object.keys(beneficiaryData).length === 0) {
      setError("Please provide at least one beneficiary data field.");
      return;
    }

    // Build consents array
    const consents: {
      consentType: "DATA_SHARING" | "SERVICE_PROVISION";
      isGranted: boolean;
      grantedBy?: string;
    }[] = [];
    if (consentDataSharing) {
      consents.push({
        consentType: "DATA_SHARING",
        isGranted: true,
        grantedBy: consentGrantedBy || undefined,
      });
    }
    if (consentServiceProvision) {
      consents.push({
        consentType: "SERVICE_PROVISION",
        isGranted: true,
        grantedBy: consentGrantedBy || undefined,
      });
    }

    createReferral.mutate({
      referralType: fd.get("referralType") as "INDIVIDUAL_CASE",
      urgency: fd.get("urgency") as "ROUTINE",
      fromOrganizationId: fd.get("fromOrganizationId") as string,
      toOrganizationId: fd.get("toOrganizationId") as string,
      serviceRequested: fd.get("serviceRequested") as string,
      beneficiaryData,
      notes: (fd.get("notes") as string) || undefined,
      consents: consents.length > 0 ? consents : undefined,
    });
  }

  function addField() {
    if (newFieldKey.trim()) {
      setBeneficiaryFields((prev) => [...prev, { key: newFieldKey.trim(), value: "" }]);
      setNewFieldKey("");
    }
  }

  function updateField(index: number, value: string) {
    setBeneficiaryFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, value } : f))
    );
  }

  function removeField(index: number) {
    setBeneficiaryFields((prev) => prev.filter((_, i) => i !== index));
  }

  const partnerOptions = partners.data ?? [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Referral Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="referralType">Referral Type</Label>
              <Select name="referralType" defaultValue="INDIVIDUAL_CASE">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDIVIDUAL_CASE">Individual Case</SelectItem>
                  <SelectItem value="FAMILY_CASE">Family Case</SelectItem>
                  <SelectItem value="GROUP_REFERRAL">Group Referral</SelectItem>
                  <SelectItem value="EMERGENCY_TRANSFER">Emergency Transfer</SelectItem>
                  <SelectItem value="INFORMATION_SHARING">Information Sharing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency</Label>
              <Select name="urgency" defaultValue="ROUTINE">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROUTINE">Routine</SelectItem>
                  <SelectItem value="PRIORITY">Priority</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fromOrganizationId">From Organization</Label>
              <Select name="fromOrganizationId">
                <SelectTrigger>
                  <SelectValue placeholder="Select sending org" />
                </SelectTrigger>
                <SelectContent>
                  {partnerOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="toOrganizationId">To Organization</Label>
              <Select name="toOrganizationId">
                <SelectTrigger>
                  <SelectValue placeholder="Select receiving org" />
                </SelectTrigger>
                <SelectContent>
                  {partnerOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceRequested">Service Requested</Label>
            <Textarea
              id="serviceRequested"
              name="serviceRequested"
              required
              rows={3}
              placeholder="Describe the service or support being requested..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Any additional context..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Beneficiary Data (encrypted) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Beneficiary Data
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            This data will be encrypted using AES-256-GCM before storage.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {beneficiaryFields.map((field, i) => (
            <div key={i} className="flex items-center gap-2">
              <Badge variant="outline" className="w-32 justify-center">
                {field.key}
              </Badge>
              <Input
                value={field.value}
                onChange={(e) => updateField(i, e.target.value)}
                placeholder={`Enter ${field.key}...`}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeField(i)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div className="flex gap-2">
            <Input
              value={newFieldKey}
              onChange={(e) => setNewFieldKey(e.target.value)}
              placeholder="New field name (e.g., phoneNumber)"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addField();
                }
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={addField}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Consent */}
      <Card>
        <CardHeader>
          <CardTitle>Consent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="consent-data"
                checked={consentDataSharing}
                onCheckedChange={(checked) =>
                  setConsentDataSharing(checked === true)
                }
              />
              <Label htmlFor="consent-data">
                Data sharing consent obtained
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="consent-service"
                checked={consentServiceProvision}
                onCheckedChange={(checked) =>
                  setConsentServiceProvision(checked === true)
                }
              />
              <Label htmlFor="consent-service">
                Service provision consent obtained
              </Label>
            </div>
          </div>

          {(consentDataSharing || consentServiceProvision) && (
            <div className="space-y-2">
              <Label htmlFor="consentGrantedBy">Consent Granted By</Label>
              <Input
                id="consentGrantedBy"
                value={consentGrantedBy}
                onChange={(e) => setConsentGrantedBy(e.target.value)}
                placeholder="Name of person granting consent"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={createReferral.isPending}>
          {createReferral.isPending ? "Creating..." : "Create Referral"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
