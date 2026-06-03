export interface RfpApiKeys {
  serper?: string;
  brave?: string;
  tavily?: string;
  jina?: string;
}

export interface RfpSearchInput {
  topic: string;
  maxResults: number;
  sources: string[];
  apiKeys?: RfpApiKeys;
}

interface RawOpportunityResult {
  title: string;
  snippet: string;
  url?: string;
  source: string;
}

export interface RfpOpportunity {
  title: string;
  agency: string;
  source: string;
  url?: string;
  postedDate?: string;
  dueDate?: string;
  location?: string;
  summary: string;
  rawText: string;
  relevanceScore: number;
  fitReason: string;
  status: "open" | "unknown" | "filtered-risk";
  tags: string[];
}

export interface RfpSearchResponse {
  opportunities: RfpOpportunity[];
  totalRawResults: number;
  totalAfterHardFilters: number;
  sourcesUsed: string[];
  excludedCount: number;
  queryPlan: string[];
  durationMs: number;
}

const PROCUREMENT_TERMS = [
  "rfp",
  "request for proposal",
  "solicitation",
  "bid",
  "contract opportunity",
  "sources sought",
  "sam.gov",
  "procurement",
  "vendor",
  "subcontract",
  "notice id",
  "proposal due",
  "response due",
  "quote",
  "rfq",
  "idiq",
  "performance work statement",
  "pws",
  "statement of work",
  "sow",
  "amendment",
];

const OCCUMED_FIT_TERMS = [
  "occupational health",
  "medical screening",
  "medical exam",
  "physical examination",
  "fitness for duty",
  "deployment",
  "deployed contractor",
  "contractor medical",
  "pre-employment physical",
  "periodic exam",
  "drug testing",
  "drug screen",
  "laboratory testing",
  "labs",
  "x-ray",
  "chest x-ray",
  "ekg",
  "audiology",
  "audiogram",
  "respirator",
  "respiratory clearance",
  "dental exam",
  "dental screening",
  "immunization",
  "vaccination",
  "dod",
  "department of defense",
  "dos",
  "department of state",
  "logcap",
  "centcom",
  "usarc",
  "crc",
];

const HARD_EXCLUDE_TERMS = [
  "job posting",
  "jobs",
  "careers",
  "apply now",
  "hiring",
  "salary",
  "hourly",
  "lvn",
  "lpn",
  "rn job",
  "registered nurse job",
  "nurse practitioner job",
  "physician assistant job",
  "ambulance driver",
  "emt job",
  "paramedic job",
  "indeed.com",
  "ziprecruiter",
  "glassdoor",
  "linkedin.com/jobs",
  "talent.com",
  "simplyhired",
  "monster.com",
  "careerbuilder",
  "expired",
  "closed solicitation",
  "award notice",
  "awarded contract",
  "archive",
  "2023",
  "2022",
  "2021",
];

const OPEN_SIGNAL_TERMS = [
  "open",
  "active",
  "response due",
  "proposal due",
  "due date",
  "closing date",
  "posted",
  "updated",
  "current",
  "synopsis",
  "sources sought",
];

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function countMatches(text: string, terms: string[]): number {
  return terms.reduce((count, term) => (text.includes(term) ? count + 1 : count), 0);
}

function containsHardExclude(text: string): boolean {
  return HARD_EXCLUDE_TERMS.some((term) => text.includes(term));
}

function buildQueryPlan(topic: string): string[] {
  const cleanTopic = topic.trim();
  return [
    `site:sam.gov ${cleanTopic} occupational health medical screening solicitation`,
    `"${cleanTopic}" RFP OR solicitation OR "sources sought" "medical screening"`,
    `"${cleanTopic}" "occupational health" "request for proposal"`,
    `"deployment medical" contractor RFP solicitation "physical exam"`,
    `"drug testing" "physical examination" government contract opportunity`,
  ];
}

function getHost(url?: string): string {
  if (!url) return "unknown";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

function inferAgency(raw: RawOpportunityResult): string {
  const host = getHost(raw.url);
  if (host.includes("sam.gov")) return "SAM.gov / Federal Contract Opportunity";
  if (host.includes("gov")) return host;
  if (host !== "unknown") return host;
  return raw.source;
}

function extractDate(text: string, labelPatterns: string[]): string | undefined {
  for (const label of labelPatterns) {
    const regex = new RegExp(`${label}[^0-9]*(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|\\d{4}-\\d{2}-\\d{2})`, "i");
    const match = text.match(regex);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

function makeTags(text: string): string[] {
  const tags: string[] = [];
  if (text.includes("sam.gov")) tags.push("SAM.gov");
  if (text.includes("sources sought")) tags.push("Sources Sought");
  if (text.includes("rfp") || text.includes("request for proposal")) tags.push("RFP");
  if (text.includes("drug")) tags.push("Drug Testing");
  if (text.includes("dental")) tags.push("Dental");
  if (text.includes("x-ray") || text.includes("chest x-ray")) tags.push("X-Ray");
  if (text.includes("audi")) tags.push("Audiology");
  if (text.includes("deployment") || text.includes("dod") || text.includes("department of defense")) tags.push("Deployment/DOD");
  if (text.includes("occupational health")) tags.push("Occ Health");
  return Array.from(new Set(tags)).slice(0, 6);
}

function summarize(raw: RawOpportunityResult, score: number, tags: string[]): string {
  const base = raw.snippet || raw.title;
  const clipped = base.length > 260 ? `${base.slice(0, 257)}...` : base;
  if (score >= 80) return `Strong fit. ${clipped}`;
  if (score >= 55) return `Possible fit after review. ${clipped}`;
  return clipped;
}

function scoreResult(raw: RawOpportunityResult): RfpOpportunity | null {
  const combined = `${raw.title} ${raw.snippet} ${raw.url ?? ""}`;
  const text = normalizeText(combined);

  if (containsHardExclude(text)) return null;

  const procurementMatches = countMatches(text, PROCUREMENT_TERMS);
  const fitMatches = countMatches(text, OCCUMED_FIT_TERMS);
  const openMatches = countMatches(text, OPEN_SIGNAL_TERMS);

  let score = 0;
  score += procurementMatches * 18;
  score += fitMatches * 12;
  score += openMatches * 5;

  if (text.includes("sam.gov")) score += 15;
  if (text.includes("request for proposal") || text.includes("solicitation")) score += 12;
  if (text.includes("medical screening") || text.includes("occupational health")) score += 15;
  if (text.includes("deployment") || text.includes("dod") || text.includes("department of defense")) score += 10;

  score = Math.min(100, score);
  if (score < 30) return null;

  const tags = makeTags(text);
  const fitReasonParts: string[] = [];
  if (procurementMatches > 0) fitReasonParts.push("contains procurement/RFP language");
  if (fitMatches > 0) fitReasonParts.push("matches Occu-Med service terms");
  if (openMatches > 0) fitReasonParts.push("has open/current opportunity signals");
  if (fitReasonParts.length === 0) fitReasonParts.push("passed baseline relevance filter");

  return {
    title: raw.title || "Untitled opportunity",
    agency: inferAgency(raw),
    source: raw.source,
    url: raw.url,
    postedDate: extractDate(combined, ["posted", "published", "date posted", "updated"]),
    dueDate: extractDate(combined, ["response due", "proposal due", "due", "closing date", "deadline"]),
    summary: summarize(raw, score, tags),
    rawText: combined.slice(0, 1200),
    relevanceScore: score,
    fitReason: fitReasonParts.join("; "),
    status: openMatches > 0 ? "open" : "unknown",
    tags,
  };
}

function dedupe(results: RfpOpportunity[]): RfpOpportunity[] {
  const seen = new Set<string>();
  const deduped: RfpOpportunity[] = [];
  for (const item of results) {
    const key = normalizeText(item.url || item.title);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

async function safeFetchJson<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function searchSerper(query: string, apiKey: string): Promise<RawOpportunityResult[]> {
  const data = await safeFetchJson<{ organic?: { title?: string; snippet?: string; link?: string }[] }>(
    "https://google.serper.dev/search",
    {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 10 }),
    },
  );

  return (data?.organic ?? []).map((item) => ({
    title: item.title ?? "Untitled result",
    snippet: item.snippet ?? "",
    url: item.link,
    source: "serper",
  }));
}

async function searchBrave(query: string, apiKey: string): Promise<RawOpportunityResult[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`;
  const data = await safeFetchJson<{ web?: { results?: { title?: string; description?: string; url?: string }[] } }>(url, {
    headers: { Accept: "application/json", "X-Subscription-Token": apiKey },
  });

  return (data?.web?.results ?? []).map((item) => ({
    title: item.title ?? "Untitled result",
    snippet: item.description ?? "",
    url: item.url,
    source: "brave",
  }));
}

async function searchTavily(query: string, apiKey: string): Promise<RawOpportunityResult[]> {
  const data = await safeFetchJson<{ results?: { title?: string; content?: string; url?: string }[] }>(
    "https://api.tavily.com/search",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, query, search_depth: "basic", max_results: 10 }),
    },
  );

  return (data?.results ?? []).map((item) => ({
    title: item.title ?? "Untitled result",
    snippet: item.content ?? "",
    url: item.url,
    source: "tavily",
  }));
}

async function searchJina(query: string, apiKey?: string): Promise<RawOpportunityResult[]> {
  const headers: Record<string, string> = { Accept: "application/json", "X-Return-Format": "json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const data = await safeFetchJson<{ data?: { title?: string; content?: string; url?: string }[] }>(
    `https://s.jina.ai/${encodeURIComponent(query)}`,
    { headers },
  );

  return (data?.data ?? []).slice(0, 10).map((item) => ({
    title: item.title ?? "Jina search result",
    snippet: (item.content ?? "").slice(0, 500),
    url: item.url,
    source: "jina",
  }));
}

async function runSourceSearches(query: string, input: RfpSearchInput): Promise<RawOpportunityResult[]> {
  const tasks: Promise<RawOpportunityResult[]>[] = [];
  const sourceSet = new Set(input.sources);

  if (sourceSet.has("serper") && input.apiKeys?.serper) tasks.push(searchSerper(query, input.apiKeys.serper));
  if (sourceSet.has("brave") && input.apiKeys?.brave) tasks.push(searchBrave(query, input.apiKeys.brave));
  if (sourceSet.has("tavily") && input.apiKeys?.tavily) tasks.push(searchTavily(query, input.apiKeys.tavily));
  if (sourceSet.has("jina")) tasks.push(searchJina(query, input.apiKeys?.jina));

  const settled = await Promise.allSettled(tasks);
  return settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

export async function searchRfpOpportunities(input: RfpSearchInput): Promise<RfpSearchResponse> {
  const start = Date.now();
  const queryPlan = buildQueryPlan(input.topic);
  const rawGroups = await Promise.all(queryPlan.map((query) => runSourceSearches(query, input)));
  const rawResults = rawGroups.flat();
  const opportunities = dedupe(
    rawResults
      .map(scoreResult)
      .filter((item): item is RfpOpportunity => item !== null)
      .sort((a, b) => b.relevanceScore - a.relevanceScore),
  ).slice(0, input.maxResults);

  return {
    opportunities,
    totalRawResults: rawResults.length,
    totalAfterHardFilters: opportunities.length,
    excludedCount: rawResults.length - opportunities.length,
    sourcesUsed: Array.from(new Set(rawResults.map((item) => item.source))),
    queryPlan,
    durationMs: Date.now() - start,
  };
}
