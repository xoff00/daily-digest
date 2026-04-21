import type { PromptResult } from "./prompts";

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
  elements?: Array<{
    type: string;
    text: string;
  }>;
}

export interface SlackMessage {
  blocks: SlackBlock[];
}

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

export function formatPromptDigestMessage(date: string, results: PromptResult[]): SlackMessage {
  const promptBlocks: SlackBlock[] = results.map((result) => ({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*${result.topic}*\n${result.result}`,
    },
  }));

  return {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `Daily Brave Answers - ${date}`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Completed ${results.length} prompt run(s).`,
        },
      },
      {
        type: "divider",
      },
      ...promptBlocks,
      {
        type: "divider",
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "Powered by Brave Answers | Prompts configured in prompts.md",
          },
        ],
      },
    ],
  };
}
