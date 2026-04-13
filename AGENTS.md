# AGENTS.md

## Project Overview

Cloudflare Worker that runs daily cron jobs to monitor topics and send status updates to Slack when changes are detected.

## Tech Stack

- **Runtime**: Cloudflare Workers (TypeScript)
- **AI**: @cloudflare/ai (Workers AI)
- **Search**: Brave Search API
- **Notifications**: Slack webhooks
- **Build**: Wrangler v4

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Local development
npm run deploy    # Deploy to Cloudflare
npm run tail      # View live logs
```

## Code Conventions

- **Language**: TypeScript with strict mode enabled
- **Module system**: ESNext modules
- **Target**: ES2022
- **Type checking**: All Cloudflare bindings (AI, KV, secrets) must be declared in the `Env` interface in `src/index.ts`
- **Error handling**: Use try/catch with console.error for logging
- **Async**: All handlers use async/await

## Project Structure

```
src/
├── index.ts   # Worker entry point, cron handler, HTTP endpoints
├── slack.ts   # Slack message formatting & delivery
├── ai.ts      # Workers AI status analysis
└── topics.ts  # Topic parsing & data fetching
topics.md      # Editable topic configuration
wrangler.toml  # Worker config with cron trigger
```

## Important Patterns

- Secrets are injected via `npx wrangler secret put <NAME>`
- KV namespace bindings are configured in `wrangler.toml`
- Topics are parsed from markdown (HTML comments `<!-- -->` are ignored)
- Status changes are stored in KV and compared on each run
- Only notify Slack when status actually changes

## Status Types

| Type | Status | Description |
|------|--------|-------------|
| Legislation | MOVED, STALLED, NEW INFO, NO CHANGE | Bill progress |
| Product Price | UP, DOWN, FLAT, NEW | Price changes |
| News | NEW, UPDATE, SAME | News developments |

## Endpoints

- `GET /` - Health check
- `GET /test` - Send test message to Slack
- `GET /run?key=<RUN_SECRET>` - Manual trigger
- `POST /update-topics` - Update topics config (JSON body with `topics` field)

## Cron Schedule

Daily at 15:00 UTC (8:00 AM MST). Edit `crons` in `wrangler.toml` to change.
