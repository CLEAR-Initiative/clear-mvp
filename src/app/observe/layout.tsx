import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Observe — CLEAR",
  description: "Submit a field signal to the CLEAR humanitarian intelligence platform",
};

export default function ObserveLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
