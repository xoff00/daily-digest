#!/bin/bash
# Daily Digest - Run via cron or manually
# 
# Setup cron:
#   crontab -e
#   0 8 * * * /path/to/daily-digest/run.sh
#
# Or use launchd on macOS for more reliability

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load .env if exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# The task for OpenCode
opencode --task "Check topics.md for status changes. For each topic:
1. Search the web for recent updates
2. Compare with previous status in status.json
3. If status changed, send Slack notification to \$SLACK_WEBHOOK_URL
4. Update status.json with current status

Use the topic type (legislation, product_price, news) to craft appropriate search queries. Format Slack messages clearly."
