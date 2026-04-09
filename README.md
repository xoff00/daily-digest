# Daily Digest Worker

Cloudflare Worker that runs daily cron jobs to monitor topics and send status updates to Slack when changes are detected.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Cloudflare

```bash
# Login to Cloudflare
npx wrangler login

# Create KV namespace for topics storage
npx wrangler kv:namespace create TOPICS
```

Copy the KV namespace ID and replace `id` in `wrangler.toml`.

### 3. Enable Workers AI

In Cloudflare Dashboard:
1. Go to Workers & Pages
2. Select your worker
3. Click on "AI" tab
4. Enable Workers AI

### 4. Configure Secrets

```bash
# Slack webhook URL
npx wrangler secret put SLACK_WEBHOOK_URL

# Brave Search API key
npx wrangler secret put BRAVE_API_KEY

# Secret for /run endpoint authentication
npx wrangler secret put RUN_SECRET
```

### 5. Deploy

```bash
npm run deploy
```

## Configuration

Edit `topics.md` to add/edit/remove topics:

```markdown
## Topic Name
- type: legislation  # or: product_price, news, general
- search: optional custom search query
# Type-specific fields:
- state: AZ          # for legislation
- bill_id: HB 2809   # for legislation
- year: 2026         # for legislation
- product: DDR5 RAM  # for product_price
- topic: AI news     # for news
```

After editing topics.md, either:
- Wait for next cron run, OR
- Push to KV: `POST /update-topics` with `{"topics": "...markdown..."}`

## Testing

```bash
# Test Slack integration (no auth required)
curl https://your-worker.workers.dev/test

# Run digest with authentication
curl "https://your-worker.workers.dev/run?key=YOUR_RUN_SECRET"

# View logs
npm run tail
```

**Note:** The `/run` endpoint requires `?key=YOUR_RUN_SECRET` query parameter. The daily cron trigger does not require authentication.

## Cron Schedule

Runs daily at 8:00 AM Arizona time (MST/UTC-7 = 15:00 UTC)

To change, edit `crons` in `wrangler.toml`:

```toml
[triggers]
crons = ["0 15 * * *"]  # 3 PM UTC = 8 AM MST
```

## Status Types

| Type | Status | Description |
|------|--------|-------------|
| Legislation | MOVED, STALLED, NEW INFO, NO CHANGE | Bill progress |
| Product Price | UP, DOWN, FLAT, NEW | Price changes |
| News | NEW, UPDATE, SAME | News developments |

Only sends Slack notification when status changes.

## Project Structure

```
.
├── src/
│   ├── index.ts      # Worker entry point, cron handler
│   ├── slack.ts      # Slack message formatting & delivery
│   ├── ai.ts         # Workers AI status analysis
│   └── topics.ts     # Topic parsing & data fetching
├── topics.md         # Editable topic configuration
├── wrangler.toml     # Worker config with cron trigger
└── package.json
```

## Notes

- Workers AI free tier: 10,000 neurons/day
- Brave Search free tier: 2,000 queries/day
- Cron runs at 15:00 UTC (8:00 AM MST)
- Topics are parsed from markdown (comments `<!-- -->` are ignored)

---

<p align="center">
  Vibe coded by <a href="https://opencode.ai">OpenCode</a><br>
  <sub>Powered by Big Pickle</sub>
</p>
