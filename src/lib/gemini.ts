export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function getTodaysMatches(): Promise<{ match: string }[]> {
  try {
    const res = await fetch("/api/matches");
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function predictMatch(
  input: string,
  history: ChatMessage[] = []
): Promise<string> {
  const res = await fetch("/api/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: input, history }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Serverfejl – prøv igen");
  }

  const data = await res.json();
  return data.result || "Ingen analyse modtaget.";
}
