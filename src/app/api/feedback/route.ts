import { NextRequest, NextResponse } from "next/server";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_FEEDBACK_DB_ID = process.env.NOTION_FEEDBACK_DB_ID;

interface FeedbackPayload {
  type: "Bug" | "Feature Request" | "General";
  message: string;
  userEmail: string;
  userName: string;
  pageUrl: string;
  consoleLogs?: string[];
}

export async function POST(req: NextRequest) {
  if (!NOTION_TOKEN || !NOTION_FEEDBACK_DB_ID) {
    return NextResponse.json({ error: "Notion not configured" }, { status: 503 });
  }

  const body = (await req.json()) as FeedbackPayload;

  const consoleText = body.consoleLogs?.length
    ? body.consoleLogs.join("\n")
    : null;

  const notionBody = {
    parent: { database_id: NOTION_FEEDBACK_DB_ID },
    properties: {
      Name: {
        title: [{ text: { content: `[${body.type}] ${body.message.slice(0, 80)}` } }],
      },
      Type: { select: { name: body.type } },
      Message: { rich_text: [{ text: { content: body.message.slice(0, 2000) } }] },
      User: { email: body.userEmail },
      "User Name": { rich_text: [{ text: { content: body.userName } }] },
      "Page URL": { url: body.pageUrl },
      ...(consoleText && {
        "Console Logs": {
          rich_text: [{ text: { content: consoleText.slice(0, 2000) } }],
        },
      }),
    },
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
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
