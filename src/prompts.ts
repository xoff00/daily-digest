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

export async function setStoredResult(
  kv: KVNamespace,
  result: PromptResult
): Promise<void> {
  const key = `result:${result.topic}`;
  await kv.put(key, JSON.stringify(result));
}
