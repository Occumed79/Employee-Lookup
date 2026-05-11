import { openai } from "./openaiClient.js";
import type { RawResult } from "./searchEngines.js";

export interface ExtractedProfile {
  fullName: string;
  firstName: string;
  lastName: string;
  likelyTitle: string;
  confidence: number;
  source: string;
  linkedinVariations: string[];
  emailVariations: string[];
  companyDomain?: string;
  rawSnippet: string;
}

export function generateLinkedInVariations(firstName: string, lastName: string): string[] {
  const f = firstName.toLowerCase().replace(/[^a-z]/g, "");
  const l = lastName.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, "-");
  const lDot = l.replace(/-/g, ".");
  const lPlain = l.replace(/-/g, "");

  return [
    `https://www.linkedin.com/in/${f}-${l}/`,
    `https://www.linkedin.com/in/${f}.${lDot}/`,
    `https://www.linkedin.com/in/${f}${lPlain}/`,
    `https://www.linkedin.com/in/${f[0]}${lPlain}/`,
    `https://www.linkedin.com/in/${f[0]}-${l}/`,
    `https://www.linkedin.com/in/${f}-${l}-1/`,
    `https://www.linkedin.com/in/${f}${l}/`,
  ].filter((v, i, arr) => arr.indexOf(v) === i);
}

export function generateEmailVariations(
  firstName: string,
  lastName: string,
  domain: string
): string[] {
  const f = firstName.toLowerCase().replace(/[^a-z]/g, "");
  const l = lastName.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, "");

  return [
    `${f}.${l}@${domain}`,
    `${f[0]}${l}@${domain}`,
    `${f}@${domain}`,
    `${f}${l}@${domain}`,
    `${f}_${l}@${domain}`,
    `${f[0]}.${l}@${domain}`,
    `${f}${l[0]}@${domain}`,
  ].filter((v, i, arr) => arr.indexOf(v) === i);
}

function deduplicateProfiles(profiles: ExtractedProfile[]): ExtractedProfile[] {
  const seen = new Map<string, ExtractedProfile>();
  for (const p of profiles) {
    const key = p.fullName.toLowerCase().trim();
    const existing = seen.get(key);
    if (!existing || p.confidence > existing.confidence) {
      seen.set(key, p);
    }
  }
  return Array.from(seen.values());
}

async function callOpenRouter(prompt: string, apiKey: string) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://manus.im",
      "X-Title": "Employee Lookup Tool"
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    })
  });
  if (!res.ok) throw new Error(`OpenRouter failed: ${await res.text()}`);
  return await res.json();
}

async function callGemini(prompt: string, apiKey: string) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });
  if (!res.ok) throw new Error(`Gemini failed: ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.candidates[0].content.parts[0].text);
}

export async function extractProfilesWithAI(
  rawResults: RawResult[],
  company: string,
  jobTitle: string,
  companyDomain?: string,
  apiKeys?: { openrouter?: string; gemini?: string }
): Promise<ExtractedProfile[]> {
  if (rawResults.length === 0) return [];

  const combinedText = rawResults
    .slice(0, 60)
    .map((r, i) => `[Result ${i+1}][Source: ${r.source}] ${r.text}`)
    .join("\n\n")
    .slice(0, 25000);

  const prompt = `You are an elite OSINT investigator. Extract CURRENT or RECENT employees at "${company}" for role "${jobTitle}".
Return ONLY a JSON object with an "employees" array.

Example:
{
  "employees": [
    {
      "full_name": "Name",
      "likely_title": "Specific Title",
      "confidence": 95,
      "source": "Source Name",
      "snippet": "Text snippet..."
    }
  ]
}

Search Data:
${combinedText}`;

  let profiles: any[] = [];

  try {
    if (apiKeys?.openrouter) {
      const data = await callOpenRouter(prompt, apiKeys.openrouter);
      profiles = data.choices[0].message.content;
      if (typeof profiles === "string") profiles = JSON.parse(profiles).employees || [];
    } else if (apiKeys?.gemini) {
      const data = await callGemini(prompt, apiKeys.gemini);
      profiles = data.employees || [];
    } else {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        response_format: { type: "json_object" }
      });
      const content = response.choices[0]?.message?.content || "{}";
      profiles = JSON.parse(content).employees || [];
    }
  } catch (err) {
    console.error("AI extraction failed:", err);
    return [];
  }

  if (!Array.isArray(profiles)) return [];

  return deduplicateProfiles(
    profiles
      .filter((p) => p && p.full_name && p.full_name.trim().split(/\s+/).length >= 2)
      .map((p) => {
        const parts = p.full_name.trim().split(/\s+/);
        const firstName = parts[0];
        const lastName = parts.slice(1).join(" ");

        return {
          fullName: p.full_name.trim(),
          firstName,
          lastName,
          likelyTitle: p.likely_title || jobTitle,
          confidence: Math.min(100, Math.max(0, Number(p.confidence) || 50)),
          source: p.source || "AI Extraction",
          linkedinVariations: generateLinkedInVariations(firstName, lastName),
          emailVariations: companyDomain
            ? generateEmailVariations(firstName, lastName, companyDomain)
            : [],
          companyDomain,
          rawSnippet: p.snippet || "",
        };
      })
  );
}
