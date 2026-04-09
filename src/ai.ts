import { Ai } from "@cloudflare/ai";

export interface SummarizeOptions {
  topicName: string;
  searchQuery: string;
  searchResults: string;
  summaryLength?: number;
}

export async function summarizeWithAI(
  ai: Ai,
  options: SummarizeOptions
): Promise<string> {
  const { topicName, searchQuery, searchResults, summaryLength = 3 } = options;

  const prompt = `You are a daily digest assistant. Summarize the latest information for the following topic:

TOPIC: ${topicName}
SEARCH QUERY: ${searchQuery}

SEARCH RESULTS:
${searchResults}

INSTRUCTIONS:
- Provide ${summaryLength} sentences summarizing the most recent and relevant information
- Focus on key developments, updates, or changes
- Be factual and concise
- If information is outdated or unavailable, say so
- Do not invent information not present in the results

SUMMARY:`;

  const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that summarizes news and information concisely. Always be accurate and only use information provided.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: 512,
  });

  return (response as { response: string }).response.trim();
}

export async function generateSearchQuery(
  ai: Ai,
  topicName: string,
  topicType: string,
  details?: Record<string, string>
): Promise<string> {
  const context = getTopicContext(topicType, details);

  const prompt = `Generate a concise web search query to find the latest information about this topic.

TOPIC: ${topicName}
TYPE: ${topicType}
DETAILS: ${context}

Generate ONLY the search query, nothing else. Make it specific enough to find recent updates.`;

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
