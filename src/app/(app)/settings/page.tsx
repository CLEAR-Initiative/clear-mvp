import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { KoboConnectionCard } from "./_components/kobo-connection-card";
import { KoboDeploymentsCard } from "./_components/kobo-deployments-card";

export const metadata = { title: "Settings — CLEAR" };

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure integrations and platform preferences.
        </p>
      </div>

      <Tabs defaultValue="kobo">
        <TabsList>
          <TabsTrigger value="kobo">KoBoToolbox</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>

        <TabsContent value="kobo" className="space-y-6 pt-4">
          <KoboConnectionCard />
          <KoboDeploymentsCard />
        </TabsContent>

        <TabsContent value="general" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Platform-wide configuration options.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Additional settings will be available in future releases.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
