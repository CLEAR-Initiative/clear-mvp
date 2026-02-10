import { CreateReferralForm } from "./_components/create-referral-form";

export const metadata = { title: "New Referral — CLEAR" };

export default function NewReferralPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Referral</h1>
        <p className="text-muted-foreground">
          Create an encrypted beneficiary referral to a partner organization
        </p>
      </div>
      <CreateReferralForm />
    </div>
  );
}
