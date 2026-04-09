export interface TopicConfig {
  name: string;
  type: string;
  summary_length: number;
  search?: string;
  state?: string;
  bill_id?: string;
  year?: number;
  product?: string;
  topic?: string;
  [key: string]: string | number | undefined;
}

export interface TopicResult {
  topic: string;
  summary: string;
  status: string;
}

function parseTopicFromMarkdown(lines: string[], startIndex: number): TopicConfig | null {
  let name = "";
  const config: Record<string, string | number> = {};

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      name = line.replace("## ", "").trim();
    } else if (line.startsWith("- ")) {
      const colonIndex = line.indexOf(":");
      if (colonIndex !== -1) {
        const key = line.slice(2, colonIndex).trim();
        let value = line.slice(colonIndex + 1).trim();

        if (key === "summary_length") {
          config[key] = parseInt(value, 10) || 3;
        } else {
          config[key] = value;
        }
      }
    } else if (line.trim() === "" && name) {
      break;
    }

    if (line.startsWith("## ") && name && i > startIndex) {
      break;
    }
  }

  if (!name) return null;

  return {
    name,
    type: config.type as string || "general",
    summary_length: (config.summary_length as number) || 3,
    search: config.search as string,
    state: config.state as string,
    bill_id: config.bill_id as string,
    year: config.year as number,
    product: config.product as string,
    topic: config.topic as string,
  };
}

export function parseTopics(markdown: string): TopicConfig[] {
  const lines = markdown.split("\n");
  const topics: TopicConfig[] = [];

  let inComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith("<!--")) {
      inComment = true;
      continue;
    }

    if (line.trim().endsWith("-->")) {
      inComment = false;
      continue;
    }

    if (inComment) continue;

    if (line.startsWith("## ")) {
      const topic = parseTopicFromMarkdown(lines, i);
      if (topic) {
        topics.push(topic);
      }
    }
  }

  return topics;
}

export async function fetchTopicData(
  topic: TopicConfig,
  env: { AI: Ai; BRAVE_API_KEY: string } & { TOPICS?: { get: (key: string) => Promise<string | null> } }
): Promise<{ query: string; results: string }> {
  let searchQuery = topic.search;

  if (!searchQuery) {
    searchQuery = generateSearchQueryFallback(topic);
  }

  const webResults = await fetchWebResults(searchQuery, env.BRAVE_API_KEY);

  return {
    query: searchQuery,
    results: webResults,
  };
}

function generateSearchQueryFallback(topic: TopicConfig): string {
  switch (topic.type) {
    case "legislation":
      return `${topic.state || ""} ${topic.bill_id || ""} ${topic.year || 2026} latest status update`;
    case "product_price":
      return `${topic.product || ""} prices 2026`;
    case "news":
      return `${topic.topic || ""} news 2026`;
    default:
      return `${topic.name} latest updates`;
  }
}

async function fetchWebResults(query: string, braveApiKey: string): Promise<string> {
  try {
    const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;

    const response = await fetch(searchUrl, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": braveApiKey,
      },
    });

    if (response.ok) {
      const data = await response.json() as {
        web?: {
          results?: Array<{
            title?: string;
            description?: string;
            url?: string;
          }>;
        };
      };

      if (data?.web?.results && data.web.results.length > 0) {
        return data.web.results
          .slice(0, 5)
          .map((r, i) => `${i + 1}. ${r.title || ""}\n   ${r.description || ""}\n   Source: ${r.url || ""}`)
          .join("\n\n");
      }
    }

    return getFallbackContent(query);
  } catch (error) {
    console.error("Brave Search API error:", error);
    return getFallbackContent(query);
  }
}

function getFallbackContent(query: string): string {
  return `Search results unavailable for "${query}". Please check manually.`;
}
