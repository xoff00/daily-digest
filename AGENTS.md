# AGENTS.md

## Project Overview

Cloudflare Worker that runs a daily prompt-driven digest and sends Brave Answers summaries to Slack.

## Architecture

```
Cloudflare Cron → Worker → Brave Answers → Slack
```

Runtime prompt definitions come from KV key `prompts_config`, with bundled `prompts.md` as the deploy-time fallback.

## Files

| File | Purpose |
|------|---------|
| `prompts.md` | Default prompt configuration |
| `src/index.ts` | Worker cron and HTTP handlers |
| `src/prompts.ts` | Prompt parsing and KV result storage |
| `wrangler.toml` | Worker name, cron, and bindings |

## Prompt Format

```markdown
## Prompt Name
- query: Reply in exactly one sentence, 25 words or fewer, with no preamble: what changed in DDR5 RAM prices over the last 24 hours?
- topic: DDR5 RAM
```

## Endpoints

- `GET /run` runs the prompt digest immediately
- `GET /prompts` returns the active prompt markdown
- `POST /update-prompts` replaces the stored prompt markdown
- `GET /test` sends a test Slack message

All HTTP endpoints require `API_KEY`. The scheduled cron trigger does not.

## Slack Webhook

Get one at: https://api.slack.com/messaging/webhooks
