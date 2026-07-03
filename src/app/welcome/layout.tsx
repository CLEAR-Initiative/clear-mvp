import { TeamProvider } from "~/providers/team-provider";

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return <TeamProvider>{children}</TeamProvider>;
}
