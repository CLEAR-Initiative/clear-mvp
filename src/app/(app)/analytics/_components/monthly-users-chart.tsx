"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CardSection } from "~/components/ui/card-section";
import { monthlyUsersData } from "./analytics-data";

export function MonthlyUsersChart() {
  return (
    <CardSection
      title="Monthly Active Users"
      subtitle="Platform adoption trend"
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={monthlyUsersData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: "#737373" }}
            axisLine={{ stroke: "#E5E5E5" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#737373" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              border: "1px solid #E5E5E5",
              borderRadius: 6,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          />
          <Bar
            dataKey="users"
            fill="#E85D3D"
            radius={[4, 4, 0, 0]}
            name="Active Users"
          />
        </BarChart>
      </ResponsiveContainer>
    </CardSection>
  );
}
