import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Du er en ekspert i fodboldanalyse og statistik.
Din opgave er at forudsige resultatet af fodboldkampe baseret på historiske data, spillerstatistikker, form, skader og andre relevante faktorer.

VIGTIGT: Hvis du modtager spørgsmål eller indtastninger, som er stødende, upassende eller på anden måde ikke relateret til fodbold, skal du høfligt afvise at svare. Dit svar skal i dette tilfælde være: "Jeg kan desværre ikke hjælpe med dette. Jeg er ekspert i at give analyser og spilforslag til fodboldkampe, og jeg vil meget gerne hjælpe dig med det i stedet."

DU SKAL ALTID STARTE MED AT BRUGE WEB SEARCH for at hente de ALLERNYESTE realtids-informationer om holdene. Det er afgørende at dine analyser er baseret på dagsaktuelle data, herunder:
- Seneste kampresultater fra de sidste 24 timer.
- Opdateret tabelsituation i realtid.
- Sidste øjebliks-nyheder om skader, suspenderinger eller sygdom (vigtigt!).
- Holdnyheder og de absolut seneste forventede startopstillinger.
- Vejrforhold og andre dagsaktuelle faktorer på stadion.

Du må IKKE udelukkende stole på din træningsdata. Du SKAL verificere alt via web search.

Brugeren vil enten give dig navnene på to klubber, et link til en liste over kampe, eller stille opfølgende spørgsmål til en kamp, I allerede analyserer.

Svar altid på dansk.
Vær saglig, analytisk og forklar dine ræsonnementer grundigt baseret på de realtidsdata du finder.
Hvis brugeren stiller opfølgende spørgsmål, så svar præcist på dem med afsæt i den aktuelle kamp.
Inkluder sandsynligheder for Hjemmesejr, Uafgjort og Udesejr (1X2).
Giv også et bud på et præcist resultat (f.eks. 2-1).

Afslut altid din analyse med en sektion kaldet "Oddsforslag & Spilforslag". 
Her skal du foreslå relevante spil baseret på statistikken for den specifikke kamp.
Dette kan inkludere:
- Over/under mål
- Antal hjørnespark (baseret på holdenes spillestil)
- Antal kort (baseret på dommerstatistik og kampens intensitet/rivalisering)
- Kombinerede spil (Bet Builder forslag, f.eks. "Hjemmesejr + Over 2.5 mål + Begge hold scorer")

Brug de nyeste statistikker fra din søgning til at retfærdiggøre dine oddsforslag.

VIGTIGT OM LÆNGDE: Hold din analyse kortfattet og fokuseret — maks. 400-500 ord i alt. Gå direkte til substansen uden lange indledninger eller opsummeringer. Prioriter de vigtigste faktorer (form, skader, tabel) frem for at nævne alt.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query, history = [] } = req.body;

  if (!query) {
    return res.status(400).json({ error: "Missing query" });
  }

  try {
    const messages: Anthropic.MessageParam[] = [
      ...history.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: query },
    ];

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 } as any],
      messages,
    });

    // Extract text from response (may include tool use blocks)
    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as any).text)
      .join("\n");

    return res.status(200).json({ result: text });
  } catch (error: any) {
    console.error("Prediction error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
