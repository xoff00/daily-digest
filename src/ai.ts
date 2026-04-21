export async function getAnswer(
  braveAnswersApiKey: string,
  prompt: string,
  maxTokens: number = 256
): Promise<string> {
  const response = await fetch("https://api.search.brave.com/res/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${braveAnswersApiKey}`,
    },
    body: JSON.stringify({
      model: "brave",
      stream: false,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    console.error("Brave Answers API error:", response.status, await response.text());
    throw new Error("Failed to get answer from Brave Answers");
  }

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() || "";
}
