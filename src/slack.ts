import type { TopicStatus } from "./topics";

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
}

export interface SlackMessage {
  blocks: SlackBlock[];
}

const STATUS_EMOJI: Record<string, string> = {
  MOVED: "🟢",
  STALLED: "🔴",
  "NEW INFO": "🟡",
  "NO CHANGE": "⚪",
  CHANGED: "🟡",
  SAME: "⚪",
  UP: "📈",
  DOWN: "📉",
  FLAT: "➡️",
  NEW: "🆕",
  UPDATE: "🔄",
  UNKNOWN: "❓",
};

const STATUS_LABELS: Record<string, string> = {
  MOVED: "MOVED",
  STALLED: "STALLED",
  "NEW INFO": "NEW INFO",
  "NO CHANGE": "NO CHANGE",
  CHANGED: "CHANGED",
  SAME: "SAME",
  UP: "PRICE UP",
  DOWN: "PRICE DOWN",
  FLAT: "FLAT",
  NEW: "NEW",
  UPDATE: "UPDATE",
  UNKNOWN: "UNKNOWN",
};

export async function sendToSlack(
  webhookUrl: string,
  message: SlackMessage
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error(`Slack webhook failed: ${response.status} ${response.statusText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending to Slack:", error);
    return false;
  }
}

export function formatStatusChangeMessage(
  date: string,
  changes: TopicStatus[],
  isInitial: boolean = false
): SlackMessage {
  const headerText = isInitial
    ? `📋 Initial Status Check - ${date}`
    : `📋 Status Changes - ${date}`;

  const headerBlock: SlackBlock = {
    type: "header",
    text: {
      type: "plain_text",
      text: headerText,
      emoji: true,
    },
  };

  const introText = isInitial
    ? `First status check completed for ${changes.length} topic(s).`
    : `${changes.length} status change(s) detected.`;

  const introBlock: SlackBlock = {
    type: "section",
    text: {
      type: "mrkdwn",
      text: introText,
    },
  };

  const dividerBlock: SlackBlock = {
    type: "divider",
  };

  const changeBlocks: SlackBlock[] = changes.map((change) => {
    const emoji = STATUS_EMOJI[change.status] || "⚪";
    const label = STATUS_LABELS[change.status] || change.status;

    return {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${emoji} *${change.topic}* - ${label}\n${change.message}`,
      },
    } as SlackBlock;
  });

  const dividerBeforeFooter: SlackBlock = {
    type: "divider",
  };

  const footerBlock: SlackBlock = {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: "Powered by Cloudflare Workers AI | Topics configured in topics.md",
      },
    ],
  };

  return {
    blocks: [headerBlock, introBlock, dividerBlock, ...changeBlocks, dividerBeforeFooter, footerBlock],
  };
}

export function formatNoChangesMessage(date: string): SlackMessage {
  return {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `✅ No Changes - ${date}`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "All topics checked - no status changes detected.",
        },
      },
      {
        type: "divider",
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "Powered by Cloudflare Workers AI",
          },
        ],
      },
    ],
  };
}
