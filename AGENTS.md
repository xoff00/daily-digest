# AGENTS.md

## Project Overview

Simple daily digest that monitors topics and sends Slack notifications on changes.

## Architecture

```
Cron → OpenCode → Slack
```

No external APIs needed (OpenCode searches the web directly).

## Setup

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env with your Slack webhook

# 2. Make run script executable
chmod +x run.sh

# 3. Setup cron (daily at 8 AM)
crontab -e
0 8 * * * /path/to/run.sh
```

## Files

| File | Purpose |
|------|---------|
| `topics.md` | Topics to monitor |
| `status.json` | Previous status (auto-created) |
| `.env` | Slack webhook URL |
| `run.sh` | Cron trigger script |

## Topic Format

```markdown
## Topic Name
- type: legislation | product_price | news
- state: AZ (for legislation)
- bill_id: HB 2809 (for legislation)
- product: DDR5 RAM (for product_price)
- topic: AI news (for news)
```

## Status Types

| Type | Status | Description |
|------|--------|-------------|
| Legislation | MOVED, STALLED, NEW INFO, NO CHANGE | Bill progress |
| Product Price | UP, DOWN, FLAT | Price changes |
| News | NEW, UPDATE, SAME | News developments |

## Slack Webhook

Get one at: https://api.slack.com/messaging/webhooks
