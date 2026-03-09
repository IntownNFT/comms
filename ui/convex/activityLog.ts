import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const entries = await ctx.db.query("activity").order("desc").collect();
    return entries.slice(0, args.limit ?? 20);
  },
});

export const add = mutation({
  args: {
    type: v.union(
      v.literal("email_sent"),
      v.literal("email_received"),
      v.literal("contact_added"),
      v.literal("approval_resolved")
    ),
    summary: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("activity", args);
    return await ctx.db.get(id);
  },
});
