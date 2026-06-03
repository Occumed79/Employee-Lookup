import { Router } from "express";
import { z } from "zod";
import { searchRfpOpportunities } from "../lib/rfpPipeline.js";

const router = Router();

const RfpSearchRequestSchema = z.object({
  topic: z.string().min(2),
  maxResults: z.number().int().min(1).max(50).default(15),
  sources: z.array(z.enum(["serper", "brave", "tavily", "jina"])).default(["serper", "brave", "tavily", "jina"]),
  apiKeys: z
    .object({
      serper: z.string().optional(),
      brave: z.string().optional(),
      tavily: z.string().optional(),
      jina: z.string().optional(),
    })
    .optional(),
});

router.post("/rfp/search", async (req, res) => {
  const parsed = RfpSearchRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: parsed.error.message });
    return;
  }

  try {
    const result = await searchRfpOpportunities(parsed.data);
    res.json(result);
  } catch (error) {
    req.log.error({ error }, "RFP intelligence search failed");
    res.status(500).json({ error: "RFP_SEARCH_FAILED", message: "RFP intelligence search failed" });
  }
});

export default router;
