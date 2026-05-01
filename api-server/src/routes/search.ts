import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { searchesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import {
  searchDuckDuckGo,
  searchJina,
  searchGitHub,
  searchSerper,
  searchBrave,
  searchTavily,
  scrapeCompanySite,
  discoverCompanyDomain,
} from "../lib/searchEngines.js";
import { extractProfilesWithAI } from "../lib/profileExtractor.js";
import type { RawResult } from "../lib/searchEngines.js";

const router = Router();

const SearchRequestSchema = z.object({
  company: z.string().min(1),
  jobTitle: z.string().min(1),
  maxResults: z.number().int().min(1).max(50).default(15),
  sources: z.array(z.string()).optional(),
  apiKeys: z
    .object({
      serper: z.string().optional(),
      groq: z.string().optional(),
      exa: z.string().optional(),
      firecrawl: z.string().optional(),
      brave: z.string().optional(),
      jina: z.string().optional(),
      tavily: z.string().optional(),
    })
    .optional(),
});

router.post("/search", async (req, res) => {
  const parsed = SearchRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: parsed.error.message });
    return;
  }

  const { company, jobTitle, maxResults, sources, apiKeys } = parsed.data;
  const startTime = Date.now();

  const activeSourcesFilter = sources || ["duckduckgo", "jina", "github", "company_site"];

  const rawResults: RawResult[] = [];
  const sourcesUsed: string[] = [];

  const searchTasks: Promise<void>[] = [];

  if (activeSourcesFilter.includes("duckduckgo")) {
    searchTasks.push(
      searchDuckDuckGo(company, jobTitle).then((r) => {
        if (r.length > 0) {
          rawResults.push(...r);
          sourcesUsed.push("duckduckgo");
        }
      })
    );
  }

  if (activeSourcesFilter.includes("jina")) {
    searchTasks.push(
      searchJina(company, jobTitle, apiKeys?.jina).then((r) => {
        if (r.length > 0) {
          rawResults.push(...r);
          sourcesUsed.push("jina");
        }
      })
    );
  }

  if (activeSourcesFilter.includes("github")) {
    searchTasks.push(
      searchGitHub(company, jobTitle).then((r) => {
        if (r.length > 0) {
          rawResults.push(...r);
          sourcesUsed.push("github");
        }
      })
    );
  }

  if (activeSourcesFilter.includes("serper") && apiKeys?.serper) {
    searchTasks.push(
      searchSerper(company, jobTitle, apiKeys.serper).then((r) => {
        if (r.length > 0) {
          rawResults.push(...r);
          sourcesUsed.push("serper");
        }
      })
    );
  }

  if (activeSourcesFilter.includes("brave") && apiKeys?.brave) {
    searchTasks.push(
      searchBrave(company, jobTitle, apiKeys.brave).then((r) => {
        if (r.length > 0) {
          rawResults.push(...r);
          sourcesUsed.push("brave");
        }
      })
    );
  }

  if (activeSourcesFilter.includes("tavily") && apiKeys?.tavily) {
    searchTasks.push(
      searchTavily(company, jobTitle, apiKeys.tavily).then((r) => {
        if (r.length > 0) {
          rawResults.push(...r);
          sourcesUsed.push("tavily");
        }
      })
    );
  }

  let companyDomain: string | undefined;

  if (activeSourcesFilter.includes("company_site")) {
    searchTasks.push(
      (async () => {
        const [siteResult, domain] = await Promise.all([
          scrapeCompanySite(company, jobTitle),
          discoverCompanyDomain(company),
        ]);
        if (siteResult.results.length > 0) {
          rawResults.push(...siteResult.results);
          sourcesUsed.push("company_site");
        }
        companyDomain = siteResult.domain || domain;
      })()
    );
  }

  await Promise.allSettled(searchTasks);

  const profiles = await extractProfilesWithAI(rawResults, company, jobTitle, companyDomain);
  const limitedProfiles = profiles.slice(0, maxResults);

  const durationMs = Date.now() - startTime;

  const [saved] = await db
    .insert(searchesTable)
    .values({
      company,
      jobTitle,
      profileCount: limitedProfiles.length,
      sourcesUsed,
      profiles: limitedProfiles as unknown as object[],
      companyDomain,
      totalRawResults: rawResults.length,
      durationMs,
    })
    .returning();

  res.json({
    profiles: limitedProfiles,
    totalRawResults: rawResults.length,
    sourcesUsed,
    companyDomain,
    searchId: saved.id,
    durationMs,
  });
});

router.get("/history", async (req, res) => {
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const items = await db
    .select()
    .from(searchesTable)
    .orderBy(desc(searchesTable.createdAt))
    .limit(limit);

  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(searchesTable)
    .then((rows) => Number(rows[0]?.count ?? 0));

  res.json({
    items: items.map((s) => ({
      id: s.id,
      company: s.company,
      jobTitle: s.jobTitle,
      profileCount: s.profileCount,
      sourcesUsed: s.sourcesUsed,
      profiles: s.profiles,
      createdAt: s.createdAt,
    })),
    total,
  });
});

router.get("/history/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "BAD_REQUEST", message: "Invalid ID" });
    return;
  }

  const [item] = await db.select().from(searchesTable).where(eq(searchesTable.id, id)).limit(1);
  if (!item) {
    res.status(404).json({ error: "NOT_FOUND", message: "Search not found" });
    return;
  }

  res.json({
    id: item.id,
    company: item.company,
    jobTitle: item.jobTitle,
    profileCount: item.profileCount,
    sourcesUsed: item.sourcesUsed,
    profiles: item.profiles,
    createdAt: item.createdAt,
  });
});

router.delete("/history/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "BAD_REQUEST", message: "Invalid ID" });
    return;
  }

  const deleted = await db.delete(searchesTable).where(eq(searchesTable.id, id)).returning();
  if (deleted.length === 0) {
    res.status(404).json({ error: "NOT_FOUND", message: "Search not found" });
    return;
  }

  res.json({ success: true });
});

router.delete("/history/clear", async (req, res) => {
  await db.delete(searchesTable);
  res.json({ success: true, message: "All history cleared" });
});

router.get("/export/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "BAD_REQUEST", message: "Invalid ID" });
    return;
  }

  const [item] = await db.select().from(searchesTable).where(eq(searchesTable.id, id)).limit(1);
  if (!item) {
    res.status(404).json({ error: "NOT_FOUND", message: "Search not found" });
    return;
  }

  const profiles = item.profiles as Array<{
    fullName?: string;
    likelyTitle?: string;
    confidence?: number;
    source?: string;
    linkedinVariations?: string[];
    emailVariations?: string[];
    companyDomain?: string;
  }>;

  const rows = [
    ["Full Name", "Likely Title", "Confidence", "Source", "LinkedIn URLs", "Email Variations", "Company Domain"].join(
      ","
    ),
    ...profiles.map((p) =>
      [
        `"${p.fullName || ""}"`,
        `"${p.likelyTitle || ""}"`,
        p.confidence ?? "",
        `"${p.source || ""}"`,
        `"${(p.linkedinVariations || []).join(" | ")}"`,
        `"${(p.emailVariations || []).join(" | ")}"`,
        `"${p.companyDomain || ""}"`,
      ].join(",")
    ),
  ].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${item.company}_${item.jobTitle}_profiles.csv"`
  );
  res.send(rows);
});

router.get("/stats", async (req, res) => {
  const searches = await db.select().from(searchesTable);

  const totalSearches = searches.length;
  const totalProfilesFound = searches.reduce((sum, s) => sum + (s.profileCount || 0), 0);

  const companyCounts: Record<string, number> = {};
  const sourceBreakdown: Record<string, number> = {};
  let totalConfidence = 0;
  let confidenceCount = 0;

  for (const s of searches) {
    companyCounts[s.company] = (companyCounts[s.company] || 0) + 1;

    for (const src of (s.sourcesUsed as string[]) || []) {
      sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1;
    }

    const profiles = s.profiles as Array<{ confidence?: number }>;
    for (const p of profiles) {
      if (typeof p.confidence === "number") {
        totalConfidence += p.confidence;
        confidenceCount++;
      }
    }
  }

  const topCompanies = Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([company, count]) => ({ company, count }));

  res.json({
    totalSearches,
    totalProfilesFound,
    topCompanies,
    sourceBreakdown,
    avgConfidence: confidenceCount > 0 ? Math.round(totalConfidence / confidenceCount) : 0,
  });
});

export default router;
