import { parsePrompts, getStoredResult, setStoredResult } from "./prompts";
import type { PromptConfig, PromptResult } from "./prompts";
import { sendToSlack, formatPromptDigestMessage } from "./slack";
import { getAnswer } from "./ai";

interface Env {
  TOPICS?: KVNamespace;
  SLACK_WEBHOOK_URL: string;
  BRAVE_ANSWERS_API_KEY: string;
  API_KEY: string;
}

function getDefaultPrompts(): string {
  return `# Daily Digest Prompts

## DDR5 RAM Prices
- query: Describe in a single short sentence the status of DDR5 prices over the last 24 hours.
- topic: DDR5 RAM

## Arizona HB 2809
- query: Describe in a single short sentence the status of Arizona bill HB 2809 over the last week.
- topic: AZ HB 2809
`;
}

function getTodayLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function normalizeAnswer(answer: string): string {
  return answer.replace(/\s+/g, " ").trim();
}

function isAuthorized(request: Request, env: Env): boolean {
  const url = new URL(request.url);
  const providedKey = request.headers.get("x-api-key") || url.searchParams.get("key");
  return Boolean(providedKey && providedKey === env.API_KEY);
}

async function getPromptMarkdown(env: Env): Promise<string> {
  return await env.TOPICS?.get("prompts_config") || getDefaultPrompts();
}

async function runPrompt(prompt: PromptConfig, env: Env): Promise<PromptResult> {
  const answer = await getAnswer(env.BRAVE_ANSWERS_API_KEY, prompt.query, 256);
  const result: PromptResult = {
    topic: prompt.topic || prompt.name,
    result: answer,
    timestamp: new Date().toISOString(),
  };

  if (env.TOPICS) {
    const previous = await getStoredResult(env.TOPICS, result.topic);
    const normalized = normalizeAnswer(result.result);
    const previousNormalized = previous ? normalizeAnswer(previous.result) : "";

    if (!previous || previousNormalized !== normalized) {
      console.log(`Answer changed for ${result.topic}`);
    } else {
      console.log(`Answer unchanged for ${result.topic}`);
    }

    await setStoredResult(env.TOPICS, result);
  }

  return result;
}

async function processAllPrompts(env: Env): Promise<PromptResult[]> {
  const promptsMarkdown = await getPromptMarkdown(env);
  const prompts = parsePrompts(promptsMarkdown);

  console.log(`Processing ${prompts.length} prompt(s)`);

  const results: PromptResult[] = [];

  for (const prompt of prompts) {
    try {
      console.log(`Running prompt: ${prompt.name}`);
      results.push(await runPrompt(prompt, env));
    } catch (error) {
      console.error(`Error processing prompt ${prompt.name}:`, error);
    }
  }

  return results;
}

async function sendPromptDigest(webhookUrl: string, results: PromptResult[]): Promise<boolean> {
  return await sendToSlack(webhookUrl, formatPromptDigestMessage(getTodayLabel(), results));
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log("Daily digest cron triggered at:", new Date().toISOString());

    const results = await processAllPrompts(env);
    const sent = await sendPromptDigest(env.SLACK_WEBHOOK_URL, results);

    if (sent) {
      console.log(`Digest sent: ${results.length} prompt result(s)`);
    } else {
      console.error("Failed to send digest to Slack");
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    if (!isAuthorized(request, env)) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/update-prompts") {
      try {
        const body = await request.json() as { prompts?: string };
        if (body.prompts && env.TOPICS) {
          await env.TOPICS.put("prompts_config", body.prompts);
          return new Response(JSON.stringify({ success: true, message: "Prompts updated" }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ error: "Missing prompts field" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ error: "Invalid request body" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (url.pathname === "/run") {
      try {
        const results = await processAllPrompts(env);
        const sent = await sendPromptDigest(env.SLACK_WEBHOOK_URL, results);

        return new Response(JSON.stringify({
          sent,
          results,
          summary: `${results.length} prompt result(s) sent`,
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

    if (url.pathname === "/test") {
      const testResults: PromptResult[] = [
        {
          topic: "Test Prompt",
          result: "This is a test Brave Answers response to verify your Slack integration is working correctly.",
          timestamp: new Date().toISOString(),
        },
      ];

      const sent = await sendPromptDigest(env.SLACK_WEBHOOK_URL, testResults);
      return new Response(JSON.stringify({ sent }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/prompts") {
      return new Response(JSON.stringify({ prompts: await getPromptMarkdown(env) }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        message: "Daily Digest Worker - Brave Answers Prompt Runner",
        endpoints: {
          "GET /run": "Run all configured prompts and send the daily Slack digest",
          "GET /prompts": "Show the active prompt markdown",
          "POST /update-prompts": "Update prompt config (requires JSON body with 'prompts' field)",
          "GET /test": "Send a test prompt digest to Slack",
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  },
};
