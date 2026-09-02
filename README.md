# NexusAI — Enterprise Fashion Sales & Support Agent

<div align="center">

![NexusAI Banner](https://img.shields.io/badge/NexusAI-Fashion%20AI%20Assistant-8B5CF6?style=for-the-badge&logo=sparkles&logoColor=white)

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Agentic%20AI-1C3A5F?style=flat-square)](https://langchain-ai.github.io/langgraph/)
[![Groq](https://img.shields.io/badge/Groq-Llama--3-F55036?style=flat-square)](https://groq.com/)
[![Supabase](https://img.shields.io/badge/Supabase-pgvector-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Deployed on Vercel](https://img.shields.io/badge/Frontend-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com/)
[![Deployed on Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render)](https://render.com)

**A production-grade, intelligent fashion assistant powered by LangGraph agentic routing, semantic vector search, and Groq's blazing-fast inference.**

[Live Demo](#) · [Backend API Docs](#) · [Report a Bug](https://github.com)

</div>

---

## ✨ Features

- **🧠 Intelligent 3-Way Routing** — A LangGraph agent classifies every message as Sales, Support, or Out-of-Scope and routes it to the optimal handler.
- **🔍 Semantic Product Search** — Supabase pgvector stores 300+ fashion products as embeddings. Queries are matched by meaning, not just exact words.
- **🏆 AI Re-Ranking** — FlashRank reranks the top 15 semantic results in-process to surface the 3 most relevant products.
- **⚡ Real-Time Streaming** — Responses stream token-by-token via Server-Sent Events (SSE) for a fluid, ChatGPT-style typing experience.
- **🛡️ Zero Hallucinations** — The agent is strictly grounded in the real product catalog and store policies.
- **💬 Conversation Memory** — The last 5 conversation turns are sent with each request, enabling natural follow-up questions.
- **🎨 Premium Dark UI** — A glassmorphic, animated dark-mode interface built with Next.js, Tailwind CSS, and Framer Motion.
- **🖼️ Product Image Proxy** — A Next.js API route transparently proxies Amazon CDN images to bypass hotlinking restrictions.

---

## 🏗️ Architecture Overview

```
User Browser (Next.js on Vercel)
    │
    │  POST /chat (SSE Stream)
    ▼
FastAPI Backend (Render Web Service)
    │
    ├── LangGraph Agent (Router Node)
    │       ├── SALES   → Supabase pgvector search → FlashRank reranker → Groq LLM
    │       ├── SUPPORT → Supabase pgvector search → Groq LLM
    │       └── OOT     → Groq LLM (polite redirect)
    │
    └── Streams JSON chunks back (text_chunk / products / done)
```

---

## 💻 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 15 (App Router), TypeScript | React framework with SSR |
| **Styling** | Tailwind CSS, Framer Motion | Animations & dark glassmorphic UI |
| **AI Agent** | LangGraph (Python) | Stateful 3-way routing workflow |
| **LLM** | Groq API (Llama 3) | Blazing-fast text generation & streaming |
| **Embeddings** | `sentence-transformers` (local) | `all-MiniLM-L6-v2`, runs locally, no API cost |
| **Vector DB** | Supabase (pgvector) | Stores product & FAQ embeddings |
| **Reranker** | FlashRank (local Python) | In-process semantic reranking, unlimited & free |
| **Backend API** | FastAPI + Uvicorn | REST + SSE streaming server |
| **Frontend Host** | Vercel | Global CDN, free hobby tier |
| **Backend Host** | Render | Free Web Service tier |

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js 18+, Python 3.11+
- A [Supabase](https://supabase.com) project with pgvector enabled
- A [Groq API Key](https://console.groq.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/juni2003/nexusai.git
cd nexusai
```

### 2. Set Up the Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate      # Windows
pip install -r requirements.txt
cp .env.example .env         # Then fill in your keys
uvicorn main:app --reload --port 8000
```
API docs available at `http://localhost:8000/docs`.

### 3. Set Up the Frontend
```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://127.0.0.1:8000" > .env.local
npm run dev
```
App live at `http://localhost:3000`.

---

## 🌐 Deployment (100% Free)

### Backend → Render
1. Go to [render.com](https://render.com) → **New +** → **Web Service**
2. Connect your GitHub account and select the `NexusAI-Fashion-Assistant` repository.
3. Configure the deployment:
   - **Root Directory:** `backend`
   - **Environment:** `Python`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Expand **Advanced** and add your Environment Variables:
   - `GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`
   - Add `PYTHON_VERSION` and set it to `3.11.0`
5. Click **Create Web Service**. Wait for the build to finish and copy your Render URL (e.g., `https://nexusai-backend.onrender.com`).

### Frontend → Vercel
1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import `nexusai` from GitHub
2. Set **Root Directory** → `frontend`
3. Add environment variables:
   - `NEXT_PUBLIC_API_URL` = your Hugging Face Space URL
   - `NEXT_PUBLIC_SITE_URL` = your Vercel URL
4. Click **Deploy** ✅

---

## 📁 Project Structure

```
nexusai/
├── backend/
│   ├── Dockerfile         # (Optional) Container config
│   ├── main.py            # FastAPI entry point + /chat SSE endpoint
│   ├── graph.py           # LangGraph agent workflow
│   ├── database.py        # Supabase pgvector query helpers
│   ├── requirements.txt
│   └── .env.example       # Template — NEVER commit .env
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx       # Home page
│   │   ├── layout.tsx     # Root layout with SEO metadata
│   │   ├── globals.css    # Global styles + glassmorphism utilities
│   │   ├── not-found.tsx  # Custom 404 page
│   │   ├── robots.ts      # Auto-generated robots.txt
│   │   ├── chat/
│   │   │   ├── page.tsx   # Chat interface (streaming, product cards)
│   │   │   └── layout.tsx # Chat-specific SEO metadata
│   │   └── api/image/
│   │       └── route.ts   # Image proxy (bypasses Amazon hotlinking)
│   ├── lib/
│   │   └── chat-api.ts    # SSE stream consumer
│   └── components/ui/     # shadcn/ui components
│
└── data_ingestion/        # One-time setup scripts (not deployed)
    ├── ingest.py
    ├── nexuswear_products.csv
    └── supabase_setup.sql
```

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">
Built with ❤️ using LangGraph, Groq, Supabase, and Next.js
</div>
