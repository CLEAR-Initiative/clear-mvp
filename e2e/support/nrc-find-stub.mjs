/**
 * Stand-in for NRC Find's RAG API in the hermetic e2e stack.
 *
 * POST /api/v1/rag/answers answers in NRC Find's NDJSON shape (source
 * documents first, then the answer in chunks), with passages carrying NRC
 * Find's "File name: …, Source ID: …" header. The answer echoes the prompt
 * it received, so a spec can see the standalone question the CLEAR Agent
 * actually sent. GET /health is for the compose healthcheck.
 */
import { createServer } from "node:http";

const TOKEN = process.env.NRC_FIND_API_TOKEN ?? "e2e-nrc-find-token";

createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200).end("ok");
    return;
  }
  if (req.method !== "POST" || req.url !== "/api/v1/rag/answers") {
    res.writeHead(404).end();
    return;
  }
  if (req.headers["x-app-authorization"] !== TOKEN) {
    res.writeHead(401).end();
    return;
  }
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const { prompt = "" } = JSON.parse(body || "{}");
    res.writeHead(200, { "Content-Type": "application/x-ndjson" });
    res.write(
      JSON.stringify({
        user_prompt: prompt,
        source_documents: [
          {
            title: "",
            content:
              "File name: E2E North Darfur access report, Source ID: 1\n\nRoads into North Darfur have been closed since June.",
          },
          {
            title: "E2E Protection monitoring brief",
            content:
              "File name: e2e-protection-brief, Source ID: 2, Title: E2E Protection monitoring brief\n\nCheckpoints increased along the main supply route.",
          },
        ],
      }) + "\n",
    );
    for (const word of `NRC Find received: ${prompt}`.split(" ")) {
      res.write(JSON.stringify({ type: "answer", content: `${word} ` }) + "\n");
    }
    res.end();
  });
}).listen(8080, "0.0.0.0");
