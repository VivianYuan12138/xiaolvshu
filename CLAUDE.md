# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

小绿书 is an anti-algorithm content curation platform: RSS feeds → AI scoring → AI rewriting into Chinese social-style posts → mobile-first React UI. The pipeline fetches from 18+ sources, filters by quality score, transforms articles with distinct author personas, and discovers new content based on user favorites.

## Commands

```bash
# Start both frontend and backend concurrently
npm run dev

# Start individually
cd server && npm run dev     # Express API on :3001
cd client && npm run dev     # Vite dev server on :5173

# Full pipeline (fetch → score → rewrite → discover)
cd server && npm run pipeline

# Individual pipeline stages for debugging
cd server && npm run fetch      # RSS fetch only
cd server && npm run score      # AI scoring only
cd server && npm run rewrite    # AI rewriting only
cd server && npm run discover   # Content discovery only
cd server && npm run stats      # Database statistics
cd server && npm run show       # Inspect article content quality

# Build
cd server && npm run build      # TypeScript → dist/
cd client && npm run build      # tsc + vite build

# Lint (frontend only)
cd client && npm run lint
```

## Architecture

```
RSS Sources (18+) → Fetch (5 concurrent) → AI Score (1-10) → Filter (≥5) → AI Rewrite (4 personas) → API → React UI
                                                                    ↑
                                              User favorites → Discovery engine → Google News RSS
```

**Backend** (`server/src/`): Express 5 + SQLite (better-sqlite3) + OpenAI SDK (multi-provider)
- `index.ts` — Express server entry point (port 3001)
- `services/ai-client.ts` — **Single LLM gateway**. All providers (DeepSeek/Gemini/Qwen/OpenAI) adapted here via OpenAI-compatible format. Built-in retry with exponential backoff for 429s
- `services/ai.ts` — Article scoring. Reads user preferences from favorites to inject relevance scoring
- `services/author-agent.ts` — Article rewriting with 4 author personas
- `services/discovery.ts` — Favorites → keyword extraction → Google News RSS → dynamic feeds (`is_dynamic=1`, 7-day TTL)
- `services/rss.ts` — RSS fetching + content extraction (Mozilla Readability + linkedom)
- `routes/` — REST API: articles (CRUD, search, favorites, comments), feeds (CRUD, refresh), chat (SSE streaming)
- `prompts/` — Version-managed prompt templates. All exports via `prompts/index.ts`
- `run-rewrite.ts` — Full pipeline orchestration entry point

**Frontend** (`client/src/`): React 19 + Tailwind CSS 4 + Vite
- `App.tsx` — Main component, tab navigation (Discover/Favorites/Settings), state management
- `api.ts` — **Single HTTP client layer**. All API calls go through here
- `storage.ts` — localStorage helpers (favorites key: `xlvs_favs`, daily read count)
- `components/` — ArticleCard (waterfall grid), ArticleDetail (full-screen slide-in + comments), BottomNav, FeedManager, TagFilter, etc.

## Hard Constraints

1. **All AI calls must go through `ai-client.ts`** — never instantiate `new OpenAI()` elsewhere
2. **SQLite is the sole data store** — always pair `getDb()` with `db.close()`
3. **Frontend API calls must go through `api.ts`** — no direct `fetch()` in components
4. **UI language is Chinese**
5. **Quality Score (`ai_score`) is the guardrail** — non-negotiable objective quality filter
6. **Relevance Score (`ai_relevance`) is the steering wheel** — adjustable based on user preference
7. **Scoring criteria → edit `prompts/scoring.ts`**, not `ai.ts`
8. **Rewriting rules → edit `prompts/rewriting.ts`**, not `author-agent.ts`
9. **`articles.link` is UNIQUE** — this is the deduplication mechanism, do not remove
10. **New columns must use `ALTER TABLE ADD COLUMN`** with defaults or nullable (see `db/schema.ts` migration pattern)

## Dual Scoring System

- **Quality Score** (`ai_score`, 1-10): 5 dimensions — information density (highest weight) > originality > usefulness > anti-anxiety > anti-clickbait. Temperature 0.2. Content <100 chars gets auto-score of 2.
- **Relevance Score** (`ai_relevance`, 1-10): Injected into scoring prompt when user has ≥3 favorites. Defaults to 5 (neutral) when absent.
- **Sort formula**: `ai_score * COALESCE(ai_relevance, 5) / 10.0 DESC`

## Author Personas (Rewriting)

| Persona | Theme | Color |
|---------|-------|-------|
| 科技小明 | Tech | Blue ⚡ |
| 投资笔记 | Investing | Amber 📈 |
| 生活观察 | Lifestyle | Pink 🌿 |
| 深度阅读 | Long-form | Purple 📖 |

Temperature 0.6. Only articles with score ≥5 and content ≥80 chars get rewritten. The 2 few-shot examples in `prompts/rewriting.ts` are load-bearing — edits must match the JSON schema.

## Frontend Conventions

- Color system: primary `emerald-500/600`, background `#f2f2f2`, text `#1a1a1a/#333/#999`
- Glass effect: `.glass` utility class (backdrop-blur + semi-transparent white)
- Press feedback: `.press-scale` utility class
- State: pure `useState` + `localStorage`, no global state library
- Display priority: `rewritten_title`/`rewritten_content` first, fall back to original fields

## Environment Variables (`.env`)

```
AI_PROVIDER=deepseek          # deepseek | gemini | qwen | openai
DEEPSEEK_API_KEY=sk-xxx       # Key for the selected provider
```
