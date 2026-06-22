export interface PromptConfig {
  name: string;
  query: string;
  topic: string;
}

export interface PromptResult {
  topic: string;
  result: string;
  timestamp: string;
}

const MAX_PROMPT_COUNT = 25;
const MAX_NAME_LENGTH = 120;
const MAX_TOPIC_LENGTH = 120;
const MAX_QUERY_LENGTH = 2000;

function parsePromptFromMarkdown(lines: string[], startIndex: number): PromptConfig | null {
  let name = "";
  const config: Record<string, string> = {};

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      name = line.replace("## ", "").trim();
    } else if (line.startsWith("- ")) {
      const colonIndex = line.indexOf(":");
      if (colonIndex !== -1) {
        const key = line.slice(2, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        config[key] = value;
      }
    } else if (line.trim() === "" && name) {
      break;
    }

    if (line.startsWith("## ") && name && i > startIndex) {
      break;
    }
  }

  if (!name || !config.query) return null;

  return {
    name,
    query: config.query as string,
    topic: config.topic as string,
  };
}

export function parsePrompts(markdown: string): PromptConfig[] {
  const lines = markdown.split("\n");
  const prompts: PromptConfig[] = [];

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
      const prompt = parsePromptFromMarkdown(lines, i);
      if (prompt) {
        prompts.push(prompt);
      }
    }
  }

  return prompts;
}

export function validatePromptMarkdown(markdown: string): string | null {
  if (!markdown.trim()) {
    return "Prompts markdown cannot be empty";
  }

  if (markdown.length > 20000) {
    return "Prompts markdown exceeds 20000 characters";
  }

  const prompts = parsePrompts(markdown);

  if (prompts.length === 0) {
    return "Prompts markdown must include at least one valid prompt";
  }

  if (prompts.length > MAX_PROMPT_COUNT) {
    return `Prompts markdown exceeds ${MAX_PROMPT_COUNT} prompts`;
  }

  for (const prompt of prompts) {
    if (!prompt.name.trim()) {
      return "Prompt name cannot be empty";
    }

    if (prompt.name.length > MAX_NAME_LENGTH) {
      return `Prompt name exceeds ${MAX_NAME_LENGTH} characters`;
    }

    if (!prompt.query.trim()) {
      return `Prompt query is missing for ${prompt.name}`;
    }

    if (prompt.query.length > MAX_QUERY_LENGTH) {
      return `Prompt query exceeds ${MAX_QUERY_LENGTH} characters for ${prompt.name}`;
    }

    if (prompt.topic && prompt.topic.length > MAX_TOPIC_LENGTH) {
      return `Prompt topic exceeds ${MAX_TOPIC_LENGTH} characters for ${prompt.name}`;
    }
  }

  return null;
}

export async function setStoredResult(
  kv: KVNamespace,
  result: PromptResult
): Promise<void> {
  const key = `result:${result.topic}`;
  await kv.put(key, JSON.stringify(result));
}
