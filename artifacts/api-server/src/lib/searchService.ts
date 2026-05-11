import {
  searchDuckDuckGo,
  searchJina,
  searchGitHub,
  searchSerper,
  searchBrave,
  searchTavily,
  searchExa,
  searchFirecrawl,
  scrapeCompanySite,
  discoverCompanyDomain,
} from "./searchEngines.js";
import { extractProfilesWithAI } from "./profileExtractor.js";
import type { RawResult } from "./searchEngines.js";

export interface SearchOptions {
  company: string;
  jobTitle: string;
  maxResults?: number;
  sources?: string[];
  apiKeys?: Record<string, string>;
}

export async function runSingleSearch(options: SearchOptions) {
  const { company, jobTitle, maxResults = 15, sources, apiKeys } = options;
  const startTime = Date.now();

  const activeSourcesFilter = sources || ["duckduckgo", "jina", "github", "company_site", "exa", "tavily", "serper", "firecrawl"];
  const rawResults: RawResult[] = [];
  const sourcesUsed: string[] = [];
  const searchTasks: Promise<void>[] = [];

  const addSourceTask = (name: string, task: Promise<RawResult[]>) => {
    if (activeSourcesFilter.includes(name)) {
      searchTasks.push(
        task.then((r) => {
          if (r.length > 0) {
            rawResults.push(...r);
            sourcesUsed.push(name);
          }
        }).catch(err => {
          console.error(`Source ${name} failed:`, err);
        })
      );
    }
  };

  addSourceTask("duckduckgo", searchDuckDuckGo(company, jobTitle));
  addSourceTask("jina", searchJina(company, jobTitle, apiKeys?.jina));
  addSourceTask("github", searchGitHub(company, jobTitle));
  
  if (apiKeys?.serper) addSourceTask("serper", searchSerper(company, jobTitle, apiKeys.serper));
  if (apiKeys?.brave) addSourceTask("brave", searchBrave(company, jobTitle, apiKeys.brave));
  if (apiKeys?.tavily) addSourceTask("tavily", searchTavily(company, jobTitle, apiKeys.tavily));
  if (apiKeys?.exa) addSourceTask("exa", searchExa(company, jobTitle, apiKeys.exa));
  if (apiKeys?.firecrawl) addSourceTask("firecrawl", searchFirecrawl(company, jobTitle, apiKeys.firecrawl));

  let companyDomain: string | undefined;
  if (activeSourcesFilter.includes("company_site")) {
    searchTasks.push(
      (async () => {
        try {
          const [siteResult, domain] = await Promise.all([
            scrapeCompanySite(company, jobTitle, apiKeys?.browserless),
            discoverCompanyDomain(company),
          ]);
          if (siteResult.results.length > 0) {
            rawResults.push(...siteResult.results);
            sourcesUsed.push("company_site");
          }
          companyDomain = siteResult.domain || domain;
        } catch (err) {
          console.error("Company site scraping failed:", err);
        }
      })()
    );
  }

  await Promise.allSettled(searchTasks);

  const profiles = await extractProfilesWithAI(rawResults, company, jobTitle, companyDomain, {
    openrouter: apiKeys?.openrouter,
    gemini: apiKeys?.gemini
  });
  const limitedProfiles = profiles.slice(0, maxResults);
  const durationMs = Date.now() - startTime;

  return {
    profiles: limitedProfiles,
    totalRawResults: rawResults.length,
    sourcesUsed,
    companyDomain,
    durationMs,
    profileCount: limitedProfiles.length,
  };
}
