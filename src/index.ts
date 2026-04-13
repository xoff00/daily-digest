import { parseTopics, fetchTopicData, getStoredStatus, setStoredStatus, TopicConfig, TopicStatus } from "./topics";
import { sendToSlack, formatStatusChangeMessage, formatNoChangesMessage } from "./slack";
import { getStatus } from "./ai";

interface Env {
  TOPICS?: {
    get: (key: string) => Promise<string | null>;
    put: (key: string, value: string) => Promise<void>;
  };
  SLACK_WEBHOOK_URL: string;
  BRAVE_API_KEY: string;
  BRAVE_ANSWERS_API_KEY: string;
  RUN_SECRET: string;
}

function getDefaultTopics(): string {
  return `# Daily Digest Topics

## Arizona HB 2809
- type: legislation
- state: AZ
- bill_id: HB 2809
- year: 2026
`;
}

async function processAllTopics(env: Env): Promise<{ changes: TopicStatus[]; isInitial: boolean }> {
  const topicsMarkdown = await env.TOPICS?.get("topics_config") || getDefaultTopics();
  const topics = parseTopics(topicsMarkdown);
  
  console.log(`Processing ${topics.length} topics`);

  const changes: TopicStatus[] = [];
  let isInitial = false;

  for (const topic of topics) {
    try {
      console.log(`Checking status: ${topic.name}`);
      const result = await checkTopicStatus(topic, env);
      
      if (result.changed) {
        changes.push(result.currentStatus);
        console.log(`Status changed: ${topic.name} -> ${result.currentStatus.status}`);
      } else {
        console.log(`No change: ${topic.name}`);
      }

      if (!result.previousStatus) {
        isInitial = true;
      }
    } catch (error) {
      console.error(`Error processing topic ${topic.name}:`, error);
    }
  }

  return { changes, isInitial };
}

async function checkTopicStatus(
  topic: TopicConfig,
  env: Env
): Promise<{ changed: boolean; previousStatus: TopicStatus | null; currentStatus: TopicStatus }> {
  const { query, results: searchResults } = await fetchTopicData(topic, env);

  const { status, message } = await getStatus(env.BRAVE_ANSWERS_API_KEY, topic.name, topic.type, searchResults);

  const currentStatus: TopicStatus = {
    topic: topic.name,
    status,
    message,
    lastChecked: new Date().toISOString(),
    timestamp: new Date().toISOString(),
  };

  const previousStatus = env.TOPICS ? await getStoredStatus(env.TOPICS, topic.name) : null;

  let changed = false;
  
  if (!previousStatus) {
    changed = true;
  } else if (previousStatus.status !== currentStatus.status) {
    changed = true;
  }

  if (env.TOPICS) {
    await setStoredStatus(env.TOPICS, currentStatus);
  }

  return { changed, previousStatus, currentStatus };
}

async function sendDigest(webhookUrl: string, changes: TopicStatus[], isInitial: boolean): Promise<boolean> {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let message;
  
  if (changes.length === 0) {
    message = formatNoChangesMessage(today);
  } else {
    message = formatStatusChangeMessage(today, changes, isInitial);
  }

  return await sendToSlack(webhookUrl, message);
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log("Daily digest cron triggered at:", new Date().toISOString());

    const { changes, isInitial } = await processAllTopics(env);
    
    const sent = await sendDigest(env.SLACK_WEBHOOK_URL, changes, isInitial);

    if (sent) {
      console.log(`Digest sent: ${changes.length} change(s), initial: ${isInitial}`);
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
      const url = new URL(request.url);
      if (url.searchParams.get("key") !== env.RUN_SECRET) {
        return new Response("Unauthorized", { status: 401 });
      }

      try {
        const { changes, isInitial } = await processAllTopics(env);
        const sent = await sendDigest(env.SLACK_WEBHOOK_URL, changes, isInitial);

        return new Response(JSON.stringify({ 
          sent, 
          changes,
          isInitial,
          summary: changes.length === 0 
            ? "No changes detected" 
            : `${changes.length} status change(s) detected`
        }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Error in /run:", error);
        return new Response(JSON.stringify({ error: "Processing failed" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (new URL(request.url).pathname === "/test") {
      const testChanges: TopicStatus[] = [
        {
          topic: "Test Topic",
          status: "MOVED",
          message: "This is a test message to verify your Slack integration is working correctly.",
          lastChecked: new Date().toISOString(),
          timestamp: new Date().toISOString(),
        },
      ];

      const sent = await sendDigest(env.SLACK_WEBHOOK_URL, testChanges, false);
      return new Response(JSON.stringify({ sent }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        message: "Daily Digest Worker - Status Tracker",
        endpoints: {
          "GET /run": "Check all topics for status changes and send to Slack",
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
