import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const searchesTable = pgTable("searches", {
  id: serial("id").primaryKey(),
  company: text("company").notNull(),
  jobTitle: text("job_title").notNull(),
  profileCount: integer("profile_count").notNull().default(0),
  sourcesUsed: jsonb("sources_used").$type<string[]>().notNull().default([]),
  profiles: jsonb("profiles").$type<object[]>().notNull().default([]),
  companyDomain: text("company_domain"),
  totalRawResults: integer("total_raw_results").default(0),
  durationMs: integer("duration_ms").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSearchSchema = createInsertSchema(searchesTable).omit({ id: true, createdAt: true });
export type InsertSearch = z.infer<typeof insertSearchSchema>;
export type Search = typeof searchesTable.$inferSelect;
