# Daily Digest Worker

Cloudflare Worker that supports a daily cron-driven digest, sends configured Brave Answers prompts, and posts the latest answers to Slack. The cron trigger is currently disabled.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Cloudflare

```bash
# Login to Cloudflare
npx wrangler login

# Create KV namespace for prompt config and stored results
npx wrangler kv:namespace create TOPICS
```

Copy the KV namespace ID and replace `id` in `wrangler.toml`.

### 3. Configure Secrets

```bash
# Slack webhook URL
npx wrangler secret put SLACK_WEBHOOK_URL

# Brave Answers API key
npx wrangler secret put BRAVE_ANSWERS_API_KEY

# Shared API key for all HTTP endpoints
npx wrangler secret put API_KEY
```

### 4. Deploy

```bash
npm run deploy
```

## Prompt Configuration

Edit `prompts.md` to change the bundled fallback prompt set:

```markdown
## Prompt Name
- query: Reply in exactly one sentence, 25 words or fewer, with no preamble: what changed in DDR5 RAM prices over the last 24 hours?
- topic: DDR5 RAM
```

Config precedence:
- The worker first checks KV key `prompts_config`
- If that key is missing, it falls back to the bundled `prompts.md` content in the deployed code

Updating `prompts.md` changes the fallback used on the next deploy.
Updating KV through `POST /update-prompts` changes the active runtime config immediately.

All HTTP endpoints require an API key in the `x-api-key` header.

## Testing

```bash
# Test Slack integration
curl -H "x-api-key: YOUR_API_KEY" https://your-worker.workers.dev/test

# Run the daily prompt digest manually
curl -H "x-api-key: YOUR_API_KEY" https://your-worker.workers.dev/run

# Inspect the active prompt config
curl -H "x-api-key: YOUR_API_KEY" https://your-worker.workers.dev/prompts

# Update the active prompt config in KV immediately
curl -X POST https://your-worker.workers.dev/update-prompts \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  --data '{"prompts":"# Daily Digest Prompts\n\n## Example\n- query: Give me one short sentence about Arizona housing policy news today.\n- topic: Arizona Housing"}'

# View logs
npm run tail
```

**Note:** The Worker is currently deployed without a daily cron trigger. Manual runs through `GET /run` still work. When enabled, the daily cron trigger calls `scheduled()` internally and does not require an API key. Every HTTP endpoint does.

## Cron Schedule

The daily cron is currently disabled. When enabled, it runs daily at 8:00 AM Arizona time (MST/UTC-7 = 15:00 UTC).

To re-enable it, restore the cron trigger in `wrangler.toml`:

```toml
[triggers]
crons = ["0 15 * * *"]  # 3 PM UTC = 8 AM MST
```

Then redeploy the Worker:

```bash
npm run deploy
```

After deploy, confirm the trigger is present in Cloudflare or via Wrangler.

## Runtime Behavior

- When the cron trigger is enabled, runs each configured prompt once per day
- Sends the latest answer for every configured prompt to Slack
- Stores the latest result for each prompt in KV for inspection and future comparisons
- All HTTP endpoints require `API_KEY`; only the scheduled cron trigger is unauthenticated when enabled

## Project Structure

```
.
├── src/
│   ├── index.ts      # Worker entry point and scheduled handler
│   ├── slack.ts      # Slack message formatting & delivery
│   ├── ai.ts         # Brave Answers API helpers
│   └── prompts.ts    # Prompt parsing & result storage
├── prompts.md        # Editable prompt configuration
├── .dev.vars.example # Local secret template (not committed as live secrets)
├── wrangler.toml     # Worker config; cron trigger currently disabled
└── package.json
```

## Notes

- Active prompts come from KV key `prompts_config` when present, otherwise from bundled `prompts.md`
- Cron is currently disabled
- When enabled, cron runs at 15:00 UTC (8:00 AM MST)
- Prompts are parsed from markdown (comments `<!-- -->` are ignored)

---

<p align="center">
  <sub>Vibe coded by OpenCode with Big Pickle and ChatGPT</sub>
</p>
