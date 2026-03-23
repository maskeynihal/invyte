import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Add tables here
  events: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
  }),
});
