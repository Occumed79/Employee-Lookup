import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { bulkJobsTable, searchesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { runSingleSearch } from "../lib/searchService.js";

const router = Router();

const BulkSearchItemSchema = z.object({
  company: z.string().min(1),
  jobTitle: z.string().min(1),
});

const BulkSearchRequestSchema = z.object({
  items: z.array(BulkSearchItemSchema).min(1).max(25),
  maxResultsPerSearch: z.number().int().min(1).max(20).default(10),
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

router.post("/bulk", async (req, res) => {
  const parsed = BulkSearchRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: parsed.error.message });
    return;
  }

  const { items, maxResultsPerSearch, sources, apiKeys } = parsed.data;

  const [job] = await db
    .insert(bulkJobsTable)
    .values({
      status: "running",
      totalItems: items.length,
      completedItems: 0,
      totalProfilesFound: 0,
      results: items.map((item) => ({
        ...item,
        status: "pending",
        profiles: [],
        profileCount: 0,
        sourcesUsed: [],
      })) as unknown as object[],
    })
    .returning();

  // Return job ID immediately to avoid timeouts
  res.json({ id: job.id, status: "running" });

  // Run the background processing
  (async () => {
    const finalResults: object[] = [];
    let totalProfiles = 0;
    let completed = 0;

    for (const item of items) {
      try {
        const result = await runSingleSearch({
          company: item.company,
          jobTitle: item.jobTitle,
          maxResults: maxResultsPerSearch,
          sources,
          apiKeys: apiKeys as Record<string, string> | undefined,
        });

        // Save individual search to history too
        await db.insert(searchesTable).values({
          company: item.company,
          jobTitle: item.jobTitle,
          profileCount: result.profileCount,
          sourcesUsed: result.sourcesUsed,
          profiles: result.profiles as unknown as object[],
          companyDomain: result.companyDomain,
          totalRawResults: result.totalRawResults,
          durationMs: result.durationMs,
        });

        finalResults.push({ ...item, ...result, status: "done" });
        totalProfiles += result.profileCount;
      } catch (err) {
        console.error(`Bulk search item failed (${item.company}):`, err);
        finalResults.push({
          ...item,
          status: "failed",
          profiles: [],
          profileCount: 0,
          sourcesUsed: [],
          error: err instanceof Error ? err.message : "Unknown error",
          durationMs: 0,
        });
      }
      completed++;

      // Update progress in DB
      await db
        .update(bulkJobsTable)
        .set({
          completedItems: completed,
          totalProfilesFound: totalProfiles,
          results: finalResults as unknown as object[],
        })
        .where(eq(bulkJobsTable.id, job.id));
    }

    await db
      .update(bulkJobsTable)
      .set({
        status: "done",
        completedAt: new Date(),
      })
      .where(eq(bulkJobsTable.id, job.id));
  })().catch(err => {
    console.error("Bulk background job failed:", err);
    db.update(bulkJobsTable)
      .set({ status: "failed" })
      .where(eq(bulkJobsTable.id, job.id))
      .catch(console.error);
  });
});

router.get("/bulk", async (req, res) => {
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const jobs = await db
    .select()
    .from(bulkJobsTable)
    .orderBy(desc(bulkJobsTable.createdAt))
    .limit(limit);

  res.json({
    items: jobs.map((j) => ({
      id: j.id,
      status: j.status,
      totalItems: j.totalItems,
      completedItems: j.completedItems,
      totalProfilesFound: j.totalProfilesFound,
      results: j.results,
      createdAt: j.createdAt,
      completedAt: j.completedAt,
    })),
    total: jobs.length,
  });
});

router.get("/bulk/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "BAD_REQUEST", message: "Invalid ID" });
    return;
  }

  const [job] = await db.select().from(bulkJobsTable).where(eq(bulkJobsTable.id, id)).limit(1);
  if (!job) {
    res.status(404).json({ error: "NOT_FOUND", message: "Bulk job not found" });
    return;
  }

  res.json({
    id: job.id,
    status: job.status,
    totalItems: job.totalItems,
    completedItems: job.completedItems,
    totalProfilesFound: job.totalProfilesFound,
    results: job.results,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  });
});

router.delete("/bulk/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "BAD_REQUEST", message: "Invalid ID" });
    return;
  }

  const deleted = await db.delete(bulkJobsTable).where(eq(bulkJobsTable.id, id)).returning();
  if (deleted.length === 0) {
    res.status(404).json({ error: "NOT_FOUND", message: "Bulk job not found" });
    return;
  }

  res.json({ success: true });
});

router.get("/export/bulk/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "BAD_REQUEST", message: "Invalid ID" });
    return;
  }

  const [job] = await db.select().from(bulkJobsTable).where(eq(bulkJobsTable.id, id)).limit(1);
  if (!job) {
    res.status(404).json({ error: "NOT_FOUND", message: "Bulk job not found" });
    return;
  }

  const results = job.results as Array<{
    company?: string;
    jobTitle?: string;
    profiles?: Array<{
      fullName?: string;
      likelyTitle?: string;
      confidence?: number;
      source?: string;
      linkedinVariations?: string[];
      emailVariations?: string[];
      companyDomain?: string;
    }>;
  }>;

  const rows: string[] = [
    ["Company", "Job Title", "Full Name", "Likely Title", "Confidence", "Source", "LinkedIn URLs", "Email Variations", "Company Domain"].join(","),
  ];

  for (const resultItem of results) {
    for (const p of resultItem.profiles || []) {
      rows.push(
        [
          `"${resultItem.company || ""}"`,
          `"${resultItem.jobTitle || ""}"`,
          `"${p.fullName || ""}"`,
          `"${p.likelyTitle || ""}"`,
          p.confidence ?? "",
          `"${p.source || ""}"`,
          `"${(p.linkedinVariations || []).join(" | ")}"`,
          `"${(p.emailVariations || []).join(" | ")}"`,
          `"${p.companyDomain || ""}"`,
        ].join(",")
      );
    }
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="bulk-job-${id}-profiles.csv"`);
  res.send(rows.join("\n"));
});

export default router;
