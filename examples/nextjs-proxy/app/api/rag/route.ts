/**
 * Next.js 14 App Router — RAG proxy to SynapseCode FastAPI backend
 *
 * Why this exists: SynapseCode's core backend is FastAPI (Python) for
 * vector/LLM work, but the dashboard can be embedded in a Next.js app.
 * This route proxies /api/rag → FastAPI /api/chat/sessions/{id}/messages
 * with SSE streaming, so the portfolio claim "Next.js / Node.js + FastAPI"
 * is accurate: Next.js is the frontend wrapper, FastAPI is the service.
 *
 * Usage (Next.js 14, output: export NOT used — needs server):
 *   POST /api/rag  { query, sessionId, repositoryId }
 *   -> streams SSE from FastAPI to the browser
 *
 * Env: SYNAPSECODE_API_URL=http://localhost:8000
 *      SYNAPSECODE_JWT=<user token>  (or forward Authorization header)
 */

import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FASTAPI_URL = process.env.SYNAPSECODE_API_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const { query, sessionId, repositoryId, documentId } = await req.json();

  if (!query || !sessionId) {
    return new Response(JSON.stringify({ error: "query and sessionId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const auth = req.headers.get("authorization") || "";
  const llmKey = req.headers.get("x-llm-api-key") || process.env.GEMINI_API_KEY || "";
  const embeddingKey = req.headers.get("x-embedding-api-key") || "";

  // Forward to FastAPI SSE endpoint
  const upstream = await fetch(`${FASTAPI_URL}/api/chat/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: auth,
      "X-LLM-API-Key": llmKey,
      "X-Embedding-API-Key": embeddingKey,
    },
    body: JSON.stringify({ content: query }),
  });

  if (!upstream.ok || !upstream.body) {
    const err = await upstream.text().catch(() => upstream.statusText);
    return new Response(JSON.stringify({ error: err }), {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Pipe SSE directly to the client (Next.js streaming)
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Repository-Id": repositoryId || "",
      "X-Document-Id": documentId || "",
    },
  });
}

// Optional: proxy multi-agent endpoint
export async function GET(req: NextRequest) {
  const toolsRes = await fetch(`${FASTAPI_URL}/api/agents/tools`, {
    headers: { Authorization: req.headers.get("authorization") || "" },
  });
  const data = await toolsRes.json().catch(() => ({ tools: [] }));
  return Response.json(data);
}
