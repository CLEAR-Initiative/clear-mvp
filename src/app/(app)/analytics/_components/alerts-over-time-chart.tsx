"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CardSection } from "~/components/ui/card-section";
import { alertsTrendData } from "./analytics-data";

export function AlertsOverTimeChart() {
  return (
    <CardSection
      title="Alerts Over Time"
      subtitle="Generated vs acted upon (6 months)"
    >
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={alertsTrendData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
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
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: "#737373" }}
          />
          <Area
            type="monotone"
            dataKey="generated"
            stroke="#D4D4D4"
            fill="#F5F5F5"
            strokeWidth={2}
            name="Generated"
          />
          <Area
            type="monotone"
            dataKey="actedOn"
            stroke="#E85D3D"
            fill="#FEF2F0"
            strokeWidth={2}
            name="Acted On"
          />
        </AreaChart>
      </ResponsiveContainer>
    </CardSection>
  );
}
