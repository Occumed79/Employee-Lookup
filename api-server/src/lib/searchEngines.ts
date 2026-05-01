import * as cheerio from "cheerio";

export interface RawResult {
  text: string;
  url?: string;
  source: string;
}

export interface ApiKeys {
  serper?: string;
  groq?: string;
  exa?: string;
  firecrawl?: string;
  brave?: string;
  jina?: string;
  tavily?: string;
}

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function safeFetch(url: string, opts?: RequestInit): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch {
    return null;
  }
}

export async function searchDuckDuckGo(
  company: string,
  jobTitle: string
): Promise<RawResult[]> {
  const queries = [
    `"${company}" "${jobTitle}" site:linkedin.com/in`,
    `"${company}" "${jobTitle}" team OR leadership OR "about us"`,
    `"${company}" "${jobTitle}" -inurl:jobs -inurl:careers`,
  ];

  const results: RawResult[] = [];

  for (const q of queries) {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
    const res = await safeFetch(url, { headers: DEFAULT_HEADERS });
    if (!res) continue;

    const html = await res.text();
    const $ = cheerio.load(html);

    $(".result__a, .result__snippet").each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href") || "";
      if (text.length > 10) {
        results.push({ text, url: href, source: "duckduckgo" });
      }
    });

    await sleep(1500);
  }

  return results;
}

export async function searchJina(
  company: string,
  jobTitle: string,
  apiKey?: string
): Promise<RawResult[]> {
  const query = encodeURIComponent(`${jobTitle} ${company} employee`);
  const url = `https://s.jina.ai/${query}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Return-Format": "json",
    "X-With-Links-Summary": "true",
  };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const res = await safeFetch(url, { headers });
  if (!res || !res.ok) return [];

  const results: RawResult[] = [];

  try {
    const data = await res.json() as { data?: { content?: string; url?: string }[] };
    if (Array.isArray(data?.data)) {
      for (const item of data.data.slice(0, 10)) {
        if (item.content) {
          results.push({ text: item.content.slice(0, 800), url: item.url, source: "jina" });
        }
      }
    }
  } catch {
    const text = await res.text().catch(() => "");
    if (text) results.push({ text: text.slice(0, 3000), source: "jina" });
  }

  return results;
}

export async function searchGitHub(
  company: string,
  jobTitle: string
): Promise<RawResult[]> {
  const results: RawResult[] = [];

  const orgQuery = company.toLowerCase().replace(/\s+/g, "");
  const url = `https://api.github.com/search/users?q=${encodeURIComponent(`${jobTitle} org:${orgQuery}`)}&per_page=20`;

  const res = await safeFetch(url, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "nuclear-finder" },
  });

  if (res?.ok) {
    try {
      const data = await res.json() as { items?: { login?: string; html_url?: string; name?: string }[] };
      if (Array.isArray(data?.items)) {
        for (const user of data.items.slice(0, 15)) {
          results.push({
            text: `${user.name || user.login} ${jobTitle} ${company}`,
            url: user.html_url,
            source: "github",
          });
        }
      }
    } catch {}
  }

  const repoQuery = `${company.toLowerCase().replace(/\s+/g, "-")}`;
  const membersUrl = `https://api.github.com/orgs/${repoQuery}/members?per_page=30`;
  const membersRes = await safeFetch(membersUrl, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "nuclear-finder" },
  });
  if (membersRes?.ok) {
    try {
      const members = await membersRes.json() as { login?: string; html_url?: string }[];
      if (Array.isArray(members)) {
        for (const m of members.slice(0, 20)) {
          results.push({
            text: `${m.login} ${company} developer engineer`,
            url: m.html_url,
            source: "github",
          });
        }
      }
    } catch {}
  }

  return results;
}

export async function searchSerper(
  company: string,
  jobTitle: string,
  apiKey: string
): Promise<RawResult[]> {
  const queries = [
    `"${company}" "${jobTitle}" site:linkedin.com/in`,
    `"${company}" "${jobTitle}" team OR "about us" OR leadership`,
    `intitle:"${jobTitle}" "${company}"`,
  ];

  const results: RawResult[] = [];

  for (const q of queries) {
    const res = await safeFetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q, num: 20 }),
    });

    if (!res?.ok) continue;

    try {
      const data = await res.json() as { organic?: { title?: string; snippet?: string; link?: string }[] };
      for (const item of data?.organic || []) {
        const text = `${item.title || ""} ${item.snippet || ""}`.trim();
        if (text.length > 10) {
          results.push({ text, url: item.link, source: "serper" });
        }
      }
    } catch {}

    await sleep(500);
  }

  return results;
}

export async function searchBrave(
  company: string,
  jobTitle: string,
  apiKey: string
): Promise<RawResult[]> {
  const q = `"${company}" "${jobTitle}" linkedin`;
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=20`;

  const res = await safeFetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!res?.ok) return [];

  const results: RawResult[] = [];
  try {
    const data = await res.json() as { web?: { results?: { title?: string; description?: string; url?: string }[] } };
    for (const item of data?.web?.results || []) {
      const text = `${item.title || ""} ${item.description || ""}`.trim();
      if (text.length > 10) {
        results.push({ text, url: item.url, source: "brave" });
      }
    }
  } catch {}

  return results;
}

export async function searchTavily(
  company: string,
  jobTitle: string,
  apiKey: string
): Promise<RawResult[]> {
  const res = await safeFetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query: `${jobTitle} at ${company} linkedin profile`,
      search_depth: "basic",
      max_results: 15,
    }),
  });

  if (!res?.ok) return [];

  const results: RawResult[] = [];
  try {
    const data = await res.json() as { results?: { content?: string; url?: string }[] };
    for (const item of data?.results || []) {
      if (item.content) {
        results.push({ text: item.content.slice(0, 800), url: item.url, source: "tavily" });
      }
    }
  } catch {}

  return results;
}

export async function scrapeCompanySite(
  company: string,
  jobTitle: string
): Promise<{ results: RawResult[]; domain?: string }> {
  const domainGuesses = [
    `${company.toLowerCase().replace(/\s+/g, "")}.com`,
    `${company.toLowerCase().replace(/\s+/g, "-")}.com`,
    `${company.toLowerCase().replace(/[^a-z]/g, "")}.com`,
  ];

  const teamPaths = ["/team", "/about", "/about-us", "/leadership", "/people", "/company/team"];

  for (const domain of domainGuesses) {
    for (const path of teamPaths.slice(0, 3)) {
      const url = `https://${domain}${path}`;
      const res = await safeFetch(url, { headers: DEFAULT_HEADERS });
      if (!res?.ok) continue;

      const html = await res.text();
      const $ = cheerio.load(html);
      const bodyText = $("body").text().replace(/\s+/g, " ").trim();

      if (bodyText.length > 200) {
        return {
          results: [{ text: bodyText.slice(0, 5000), url, source: "company_site" }],
          domain,
        };
      }
    }
  }

  return { results: [] };
}

export async function discoverCompanyDomain(company: string): Promise<string | undefined> {
  const certUrl = `https://crt.sh/?q=${encodeURIComponent(company.toLowerCase().replace(/\s+/g, ""))}&output=json`;
  const res = await safeFetch(certUrl);
  if (!res?.ok) return undefined;

  try {
    const certs = await res.json() as { common_name?: string }[];
    if (Array.isArray(certs) && certs.length > 0) {
      const names = certs
        .map((c) => c.common_name || "")
        .filter((n) => n && !n.startsWith("*") && n.includes("."))
        .slice(0, 5);
      return names[0];
    }
  } catch {}

  return undefined;
}
