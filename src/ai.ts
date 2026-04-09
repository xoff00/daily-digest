import { Ai } from "@cloudflare/ai";

export interface StatusResult {
  status: string;
  message: string;
}

export async function getStatus(
  ai: Ai,
  topicName: string,
  topicType: string,
  searchResults: string
): Promise<StatusResult> {
  const prompt = buildStatusPrompt(topicType, topicName, searchResults);

  const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      {
        role: "system",
        content:
          "You analyze topics and output a short status update. Follow the format exactly. Be concise and factual.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: 256,
  });

  const result = (response as { response: string }).response.trim();
  return parseStatusResponse(result, topicType);
}

function buildStatusPrompt(topicType: string, topicName: string, searchResults: string): string {
  const basePrompt = `TOPIC: ${topicName}
SEARCH RESULTS:
${searchResults}

Respond with EXACTLY one of these formats (copy the format exactly, fill in your analysis):`;

  switch (topicType) {
    case "legislation":
      return `${basePrompt}

If bill advanced:    MOVED: [1 sentence on where it moved and action taken]
If no progress:     STALLED: [1 sentence on reason - tabled, died, failed, etc]
If new development: NEW INFO: [1 sentence on new development]
If unchanged:        NO CHANGE: [1 sentence confirming no new developments]`;

    case "product_price":
      return `${basePrompt}

If price increased:  UP: [price change amount or percentage]
If price decreased:  DOWN: [price change amount or percentage]
If no change:       FLAT: [no significant price change]
If new product:      NEW: [new product details]`;

    case "news":
      return `${basePrompt}

If major new story:  NEW: [1 sentence on the story]
If existing update:  UPDATE: [1 sentence on update]
If no news:          SAME: [1 sentence confirming no significant news]`;

    default:
      return `${basePrompt}

If changed:          CHANGED: [1 sentence on what changed]
If unchanged:        SAME: [1 sentence confirming no change]`;
  }
}

function parseStatusResponse(response: string, topicType: string): StatusResult {
  const lines = response.split("\n").filter((line) => line.trim());

  if (lines.length === 0) {
    return { status: "UNKNOWN", message: "Unable to determine status" };
  }

  const firstLine = lines[0].trim();

  const statusPatterns: Record<string, RegExp> = {
    MOVED: /^MOVED:\s*(.+)/i,
    STALLED: /^STALLED:\s*(.+)/i,
    "NEW INFO": /^NEW\s*INFO:\s*(.+)/i,
    "NO CHANGE": /^NO\s*CHANGE:\s*(.+)/i,
    CHANGED: /^CHANGED:\s*(.+)/i,
    UP: /^UP:\s*(.+)/i,
    DOWN: /^DOWN:\s*(.+)/i,
    FLAT: /^FLAT:\s*(.+)/i,
    NEW: /^NEW:\s*(.+)/i,
    UPDATE: /^UPDATE:\s*(.+)/i,
    SAME: /^SAME:\s*(.+)/i,
  };

  for (const [status, pattern] of Object.entries(statusPatterns)) {
    const match = firstLine.match(pattern);
    if (match) {
      return {
        status: status.toUpperCase(),
        message: match[1].trim(),
      };
    }
  }

  return {
    status: "UNKNOWN",
    message: response.substring(0, 200),
  };
}

export async function generateSearchQuery(
  ai: Ai,
  topicName: string,
  topicType: string,
  details?: Record<string, string>
): Promise<string> {
  const context = getTopicContext(topicType, details);

  const prompt = `Generate a concise web search query to find the latest status about this topic.

TOPIC: ${topicName}
TYPE: ${topicType}
DETAILS: ${context}

Generate ONLY the search query, nothing else. Make it specific to current status.`;

  const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: 128,
  });

  return (response as { response: string }).response.trim();
}

function getTopicContext(
  topicType: string,
  details?: Record<string, string>
): string {
  switch (topicType) {
    case "legislation":
      return `${details?.state || ""} ${details?.bill_id || ""} ${details?.year || new Date().getFullYear()}`;
    case "product_price":
      return `Product: ${details?.product || ""}`;
    case "news":
      return `Topic: ${details?.topic || ""}`;
    default:
      return JSON.stringify(details || {});
  }
}
