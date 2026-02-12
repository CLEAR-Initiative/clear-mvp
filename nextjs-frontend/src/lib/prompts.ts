import type { DjangoAlert } from "~/lib/types/django";

/** Minimal alert shape used for prompt construction */
export interface AlertSummary {
  title: string;
  severity: number;
  shock_type?: string | { name: string } | null;
  location?: string;
  text?: string;
}

export const HUMCHAT_SYSTEM_PROMPT = `You are HumChat, an AI assistant for humanitarian operations, developed for the Norwegian Refugee Council (NRC) CLEAR early warning system.

You are knowledgeable about IASC guidelines, Sphere standards, and humanitarian context, particularly in East Africa and the Horn of Africa.

Your capabilities:
- Situation analysis and crisis briefs
- Response planning and resource allocation guidance
- Protocol and guideline references for emergencies
- Coordination support and communications drafting

Guidelines:
- Be concise and actionable
- Use bullet points and structured formatting with markdown
- Reference specific standards (Sphere, IASC) when relevant
- Acknowledge uncertainty when data is incomplete
- Prioritize life-saving recommendations
- Format responses with markdown (bold, lists, headers)
- Keep responses under 400 words unless explicitly asked for more detail`;

export const SITUATION_ANALYSIS_SYSTEM_PROMPT = `You are an AI humanitarian situation analyst for the NRC CLEAR early warning system.

Generate a concise situation analysis based on the provided alert data. Your analysis should:
- Highlight the most critical and urgent issues first
- Reference specific locations, numbers, and timelines from the data
- Identify interconnections between different crises
- Suggest immediate priority actions
- Use clear, professional humanitarian language

Format:
- 2-3 short paragraphs
- Emphasize critical findings with **bold**
- Keep total response under 250 words
- Do not use headers, keep it as flowing text`;

/** Build a prompt for situation analysis, enriched with current alert data */
export function buildSituationAnalysisPrompt(
  country: string,
  alerts: AlertSummary[],
): string {
  if (alerts.length === 0) {
    return `Generate a brief situation overview for ${country}. Note that no active alerts are currently reported.`;
  }

  const alertSummaries = alerts
    .map((a) => {
      const shockName = typeof a.shock_type === "string" ? a.shock_type : a.shock_type?.name ?? "";
      const loc = a.location ?? "";
      return `- ${a.title} (Severity: ${a.severity}/5, Type: ${shockName})\n  Location: ${loc}\n  Details: ${(a.text ?? "").substring(0, 200)}`;
    })
    .join("\n");

  return `Generate a situation analysis for ${country} based on these ${alerts.length} active alerts:\n\n${alertSummaries}\n\nProvide a brief analysis highlighting the most critical issues and recommended priority actions.`;
}

/** Build a HumChat prompt enriched with current alert context */
export function buildHumChatPrompt(
  userMessage: string,
  alerts?: DjangoAlert[],
): string {
  if (!alerts?.length) return userMessage;

  const alertContext = alerts
    .slice(0, 5)
    .map(
      (a) =>
        `- ${a.title} (Severity: ${a.severity}/5): ${a.text.substring(0, 150)}`,
    )
    .join("\n");

  return `Current active alerts for context:\n${alertContext}\n\nUser question: ${userMessage}`;
}
