# Daily Digest Worker

Cloudflare Worker that runs daily cron jobs to monitor topics and send AI summaries to Slack.

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

Copy the KV namespace ID and replace `REPLACE_WITH_YOUR_KV_NAMESPACE_ID` in `wrangler.toml`.

### 3. Enable Workers AI

In Cloudflare Dashboard:
1. Go to Workers & Pages
2. Select your worker (or create one)
3. Click on "AI" tab
4. Enable Workers AI

### 4. Configure Slack

1. Create a Slack webhook at https://api.slack.com/apps
2. Set the webhook URL as a Cloudflare secret:
   ```bash
   npx wrangler secret put SLACK_WEBHOOK_URL
   ```
   (Enter your webhook URL when prompted)

### 5. Deploy

```bash
npm run deploy
```

## Configuration

Edit `topics.md` to add/edit/remove topics:

```markdown
## Topic Name
- type: legislation  # or: product_price, news, general
- summary_length: 3  # sentences
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
# Deploy to development
npm run dev

# Test Slack integration
curl https://your-worker.workers.dev/test

# View logs
npm run tail
```

## Cron Schedule

Runs daily at 8:00 AM Arizona time (MST/UTC-7 = 15:00 UTC)

To change, edit `crons` in `wrangler.toml`:

```toml
[triggers]
crons = ["0 15 * * *"]  # 3 PM UTC = 8 AM MST
```

## Adding Search API (Optional)

The worker includes fallback content if no search API is configured.

For live search results, add Brave Search API:
1. Get API key at https://brave.com/search/api/
2. Uncomment the search code in `src/topics.ts`
3. Add your API key to the headers

## Project Structure

```
.
├── src/
│   ├── index.ts      # Worker entry point, cron handler
│   ├── slack.ts      # Slack message formatting & delivery
│   ├── ai.ts         # Workers AI summarization
│   └── topics.ts     # Topic parsing & data fetching
├── topics.md         # Editable topic configuration
├── wrangler.toml     # Worker config with cron trigger
└── package.json
```

## Notes

- Workers AI free tier: 10,000 neurons/day
- Cron runs at 15:00 UTC (8:00 AM MST)
- Topics are parsed from markdown (comments `<!-- -->` are ignored)
