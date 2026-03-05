"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CardSection } from "~/components/ui/card-section";
import { dataSourcesData } from "./analytics-data";

export function DataSourcesChart() {
  return (
    <CardSection
      title="Data Sources"
      subtitle="Records ingested by source type"
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={dataSourcesData} layout="vertical">
          <XAxis
            type="number"
            tick={{ fontSize: 12, fill: "#737373" }}
            axisLine={{ stroke: "#E5E5E5" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: "#525252" }}
            axisLine={false}
            tickLine={false}
            width={120}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              border: "1px solid #E5E5E5",
              borderRadius: 6,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
            formatter={(value) => [Number(value).toLocaleString(), "Records"]}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Records">
            {dataSourcesData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </CardSection>
  );
}
