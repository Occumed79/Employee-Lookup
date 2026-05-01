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
    `https://www.linkedin.com/in/${f[0]}-${l}/`,
    `https://www.linkedin.com/in/${f}${lPlain}/`,
    `https://www.linkedin.com/in/${f}-${l}-1/`,
    `https://www.linkedin.com/in/${f[0]}${lPlain}/`,
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
    `${f}${l}@${domain}`,
    `${f}@${domain}`,
    `${f[0]}${l}@${domain}`,
    `${f[0]}.${l}@${domain}`,
    `${l}.${f}@${domain}`,
    `${l}@${domain}`,
  ].filter((v, i, arr) => arr.indexOf(v) === i);
}

function deduplicateProfiles(profiles: ExtractedProfile[]): ExtractedProfile[] {
  const seen = new Set<string>();
  return profiles.filter((p) => {
    const key = p.fullName.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function extractProfilesWithAI(
  rawResults: RawResult[],
  company: string,
  jobTitle: string,
  companyDomain?: string
): Promise<ExtractedProfile[]> {
  if (rawResults.length === 0) return [];

  const combinedText = rawResults
    .slice(0, 50)
    .map((r) => `[${r.source}] ${r.text}`)
    .join("\n")
    .slice(0, 18000);

  const prompt = `You are an elite OSINT researcher specializing in finding employees at companies.

Company: "${company}"
Target role: "${jobTitle}"

From the following search results, extract unique real people who likely work (or worked) at ${company} in or near the role of "${jobTitle}".

Rules:
- Only include people with reasonable evidence from the text
- Extract full names (first and last name required)
- Do NOT invent names — only extract from the text
- Avoid duplicates
- If someone appears multiple times, use the highest confidence
- Ignore job listings — look for actual people's names

For each person, output a valid JSON array like this:
[
  {
    "full_name": "Sarah Chen",
    "likely_title": "Senior AI Engineer",
    "confidence": 85,
    "source": "linkedin",
    "snippet": "relevant text snippet that confirms this person"
  }
]

Only return the JSON array. No explanations. No markdown. If no people found, return [].

Search results:
${combinedText}`;

  let profiles: Array<{
    full_name: string;
    likely_title: string;
    confidence: number;
    source: string;
    snippet?: string;
  }> = [];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content || "[]";
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    profiles = JSON.parse(cleaned);
  } catch (err) {
    console.error("AI extraction failed:", err);
    return [];
  }

  if (!Array.isArray(profiles)) return [];

  return deduplicateProfiles(
    profiles
      .filter((p) => p.full_name && p.full_name.trim().split(/\s+/).length >= 2)
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
          source: p.source || "unknown",
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
