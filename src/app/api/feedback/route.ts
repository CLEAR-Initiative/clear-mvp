import { NextRequest, NextResponse } from "next/server";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_FEEDBACK_DB_ID = process.env.NOTION_FEEDBACK_DB_ID;

interface FeedbackPayload {
  type: "Bug" | "Feature Request" | "General";
  message: string;
  userEmail: string;
  pageUrl: string;
  consoleLogs?: string[];
}

export async function POST(req: NextRequest) {
  if (!NOTION_TOKEN || !NOTION_FEEDBACK_DB_ID) {
    return NextResponse.json({ error: "Notion not configured" }, { status: 503 });
  }

  const body = (await req.json()) as FeedbackPayload;

  const children = body.consoleLogs?.length
    ? (() => {
        const CHUNK = 1900;
        const text = body.consoleLogs.join("\n");
        const chunks: string[] = [];
        for (let i = 0; i < text.length && i < 20000; i += CHUNK) {
          chunks.push(text.slice(i, i + CHUNK));
        }
        return [
          {
            object: "block",
            type: "heading_3",
            heading_3: { rich_text: [{ text: { content: "Console Logs" } }] },
          },
          {
            object: "block",
            type: "code",
            code: {
              language: "plain text",
              rich_text: chunks.map((c) => ({ text: { content: c } })),
            },
          },
        ];
      })()
    : undefined;

  const notionBody = {
    parent: { database_id: NOTION_FEEDBACK_DB_ID },
    properties: {
      Title: {
        title: [{ text: { content: body.message.slice(0, 50) } }],
      },
      Type: { select: { name: body.type } },
      Message: { rich_text: [{ text: { content: body.message.slice(0, 2000) } }] },
      Date: { date: { start: new Date().toISOString() } },
      User: { rich_text: [{ text: { content: body.userEmail } }] },
      Page: { url: body.pageUrl },
    },
    ...(children && { children }),
  };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify(notionBody),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[feedback] Notion error:", err);
    return NextResponse.json({ error: "Failed to save feedback", detail: err }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
