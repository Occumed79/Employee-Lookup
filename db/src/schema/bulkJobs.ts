import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bulkJobsTable = pgTable("bulk_jobs", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("pending"),
  totalItems: integer("total_items").notNull(),
  completedItems: integer("completed_items").notNull().default(0),
  totalProfilesFound: integer("total_profiles_found").notNull().default(0),
  results: jsonb("results").$type<object[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertBulkJobSchema = createInsertSchema(bulkJobsTable).omit({ id: true, createdAt: true });
export type InsertBulkJob = z.infer<typeof insertBulkJobSchema>;
export type BulkJob = typeof bulkJobsTable.$inferSelect;
