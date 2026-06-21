import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2 } as any],
      system:
        "Du er en sportsredaktør. Brug web search til at finde de mest aktuelle og populære fodboldkampe der spilles I DAG eller i morgen. Dit ENDELIGE svar skal være ET RENT JSON ARRAY og INTET ANDET — ingen indledning, ingen forklaring, ingen markdown-formatering. Bare arrayet. Format: [{\"match\": \"Hold 1 vs Hold 2\"}, ...]. Find 4-5 kampe.",
      messages: [
        {
          role: "user",
          content: "Find de mest interessante fodboldkampe i dag eller i morgen.",
        },
      ],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as any).text)
      .join("");

    // Extract JSON array even if Claude added explanatory text around it
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (!arrayMatch) {
      throw new Error("No JSON array found in response");
    }
    const matches = JSON.parse(arrayMatch[0]);
    return res.status(200).json(matches);
  } catch (error: any) {
    console.error("Matches error:", error);
    // Return empty array on error, not fatal
    return res.status(200).json([]);
  }
}
