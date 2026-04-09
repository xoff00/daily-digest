import { Ai } from "@cloudflare/ai";
import { parseTopics, fetchTopicData, TopicConfig, TopicResult } from "./topics";
import { sendToSlack, formatDigestMessage } from "./slack";
import { summarizeWithAI } from "./ai";

interface Env {
  AI: Ai;
  TOPICS?: {
    get: (key: string) => Promise<string | null>;
    put: (key: string, value: string) => Promise<void>;
  };
  SLACK_WEBHOOK_URL: string;
  BRAVE_API_KEY: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log("Daily digest cron triggered at:", new Date().toISOString());

    const webhookUrl = env.SLACK_WEBHOOK_URL;
    const results: TopicResult[] = [];

    const topicsMarkdown = await env.TOPICS?.get("topics_config") || getDefaultTopics();
    const topics = parseTopics(topicsMarkdown);
    console.log(`Processing ${topics.length} topics`);

    for (const topic of topics) {
      try {
        console.log(`Processing topic: ${topic.name}`);
        const { query, results: searchResults } = await fetchTopicData(topic, { AI: env.AI, BRAVE_API_KEY: env.BRAVE_API_KEY });

        const summary = await summarizeWithAI(env.AI, {
          topicName: topic.name,
          searchQuery: query,
          searchResults: searchResults,
          summaryLength: topic.summary_length,
        });

        results.push({
          topic: topic.name,
          summary,
          status: "Success",
        });

        console.log(`Completed: ${topic.name}`);
      } catch (error) {
        console.error(`Error processing topic ${topic.name}:`, error);
        results.push({
          topic: topic.name,
          summary: "Failed to fetch summary. Check worker logs for details.",
          status: "Error",
        });
      }
    }

    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const message = formatDigestMessage(today, results);
    const sent = await sendToSlack(webhookUrl, message);

    if (sent) {
      console.log("Digest sent to Slack successfully");
    } else {
      console.error("Failed to send digest to Slack");
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "POST" && new URL(request.url).pathname === "/update-topics") {
      try {
        const body = await request.json() as { topics?: string };
        if (body.topics && env.TOPICS) {
          await env.TOPICS.put("topics_config", body.topics);
          return new Response(JSON.stringify({ success: true, message: "Topics updated" }), {
            headers: { "Content-Type": "application/json" },
          });
        }
      } catch {
        return new Response(JSON.stringify({ error: "Invalid request body" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (new URL(request.url).pathname === "/run") {
      const webhookUrl = env.SLACK_WEBHOOK_URL;
      const results: TopicResult[] = [];

      const topicsMarkdown = await env.TOPICS?.get("topics_config") || getDefaultTopics();
      const topics = parseTopics(topicsMarkdown);
      console.log(`Processing ${topics.length} topics`);

      for (const topic of topics) {
        try {
          console.log(`Processing topic: ${topic.name}`);
          const { query, results: searchResults } = await fetchTopicData(topic, { AI: env.AI, BRAVE_API_KEY: env.BRAVE_API_KEY });

          const summary = await summarizeWithAI(env.AI, {
            topicName: topic.name,
            searchQuery: query,
            searchResults: searchResults,
            summaryLength: topic.summary_length,
          });

          results.push({
            topic: topic.name,
            summary,
            status: "Success",
          });

          console.log(`Completed: ${topic.name}`);
        } catch (error) {
          console.error(`Error processing topic ${topic.name}:`, error);
          results.push({
            topic: topic.name,
            summary: "Failed to fetch summary. Check worker logs for details.",
            status: "Error",
          });
        }
      }

      const today = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const message = formatDigestMessage(today, results);
      const sent = await sendToSlack(webhookUrl, message);

      return new Response(JSON.stringify({ sent, results }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (new URL(request.url).pathname === "/test") {
      const webhookUrl = env.SLACK_WEBHOOK_URL;
      const testMessage = formatDigestMessage("Test Message", [
        {
          topic: "Test Topic",
          summary: "This is a test message to verify your Slack integration is working correctly.",
          status: "Test",
        },
      ]);

      const sent = await sendToSlack(webhookUrl, testMessage);
      return new Response(JSON.stringify({ sent }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        message: "Daily Digest Worker",
        endpoints: {
          "GET /run": "Run digest with current topics (processes and sends to Slack)",
          "POST /update-topics": "Update topics config (requires JSON body with 'topics' field)",
          "GET /test": "Send a test message to Slack",
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  },
};

function getDefaultTopics(): string {
  return `# Daily Digest Topics

## Arizona HB 2809
- type: legislation
- state: AZ
- bill_id: HB 2809
- year: 2026
- summary_length: 3 sentences
`;
}
