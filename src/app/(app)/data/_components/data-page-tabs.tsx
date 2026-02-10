"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { ReactNode } from "react";

export function DataPageTabs({
  feedsContent,
  sourcesContent,
  gapContent,
}: {
  feedsContent: ReactNode;
  sourcesContent: ReactNode;
  gapContent: ReactNode;
}) {
  return (
    <Tabs defaultValue="feeds" className="space-y-4">
      <TabsList>
        <TabsTrigger value="feeds">Live Feeds</TabsTrigger>
        <TabsTrigger value="sources">Data Sources</TabsTrigger>
        <TabsTrigger value="gaps">Gap Analysis</TabsTrigger>
      </TabsList>

      <TabsContent value="feeds" className="space-y-6">
        {feedsContent}
      </TabsContent>

      <TabsContent value="sources" className="space-y-6">
        {sourcesContent}
      </TabsContent>

      <TabsContent value="gaps" className="space-y-6">
        {gapContent}
      </TabsContent>
    </Tabs>
  );
}
