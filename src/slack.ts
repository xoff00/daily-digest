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

export function formatDigestMessage(
  date: string,
  results: Array<{ topic: string; summary: string; status: string }>
): SlackMessage {
  const headerBlock: SlackBlock = {
    type: "header",
    text: {
      type: "plain_text",
      text: `📋 Daily Digest - ${date}`,
      emoji: true,
    },
  };

  const introBlock: SlackBlock = {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `Good morning! Here's your daily update on ${results.length} topics.`,
    },
  };

  const dividerBlock: SlackBlock = {
    type: "divider",
  };

  const resultBlocks: SlackBlock[] = results.flatMap((result) => [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${result.topic}*\n${result.summary}`,
      },
    } as SlackBlock,
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Status: ${result.status}`,
        },
      ],
    } as SlackBlock,
    {
      type: "divider",
    } as SlackBlock,
  ]);

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
    blocks: [headerBlock, introBlock, dividerBlock, ...resultBlocks, footerBlock],
  };
}
