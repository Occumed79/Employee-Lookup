import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { searchesTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { runSingleSearch } from "../lib/searchService.js";

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
      browserless: z.string().optional(),
      openrouter: z.string().optional(),
      gemini: z.string().optional(),
    })
    .optional(),
});

router.post("/search", async (req, res) => {
  const parsed = SearchRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: parsed.error.message });
    return;
  }

  try {
    const result = await runSingleSearch({
      ...parsed.data,
      apiKeys: parsed.data.apiKeys as Record<string, string> | undefined,
    });

    const [saved] = await db
      .insert(searchesTable)
      .values({
        company: parsed.data.company,
        jobTitle: parsed.data.jobTitle,
        profileCount: result.profileCount,
        sourcesUsed: result.sourcesUsed,
        profiles: result.profiles as unknown as object[],
        companyDomain: result.companyDomain,
        totalRawResults: result.totalRawResults,
        durationMs: result.durationMs,
      })
      .returning();

    res.json({
      ...result,
      searchId: saved.id,
    });
  } catch (err) {
    console.error("Search route failed:", err);
    res.status(500).json({ error: "SEARCH_FAILED", message: "Internal server error during search" });
  }
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

router.delete("/history/clear", async (req, res) => {
  await db.delete(searchesTable);
  res.json({ success: true, message: "All history cleared" });
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
