# Next.js Proxy Example — SynapseCode

This directory shows how SynapseCode (FastAPI + Qdrant) integrates with a **Next.js 14 App Router** frontend.

**Architecture**

```
Next.js (Node.js, port 3000)  -- /api/rag -->  FastAPI (Python, port 8000)
   app/api/rag/route.ts                    app/api/chat.py (SSE streaming)
   + auth proxy                            + Qdrant + Redis + Postgres
```

- **Frontend**: Next.js 14 (App Router, TypeScript, Node.js) — dashboard + marketing pages
- **Backend**: FastAPI — RAG retrieval, embeddings, LLM streaming
- **Vector DB**: Qdrant
- **Streaming**: Server-Sent Events (SSE) — Next.js `route.ts` pipes FastAPI SSE to the browser

So the portfolio stack claim `["TypeScript","Next.js","Node.js","Python","FastAPI","Qdrant"]` is justified:
`Next.js/Node` is the proxy/dashboard layer, `Python/FastAPI/Qdrant` is the service layer. See `app/api/rag/route.ts` for the actual wrapper.

**Run**

```bash
# 1. Start SynapseCode backend (FastAPI)
cd ../../backend
docker compose up --build   # or uvicorn app.main:app --reload

# 2. Start Next.js proxy (requires Node 20+)
cd ../examples/nextjs-proxy
npm install
SYNAPSECODE_API_URL=http://localhost:8000 npm run dev
```

**Env**

```dotenv
SYNAPSECODE_API_URL=http://localhost:8000
GEMINI_API_KEY=gsk_or_gemini_key  # forwarded as X-LLM-API-Key
```
