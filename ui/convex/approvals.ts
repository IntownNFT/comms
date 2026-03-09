import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {
    status: v.optional(
      v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))
    ),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("approvals")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    }
    return await ctx.db.query("approvals").collect();
  },
});

export const getById = query({
  args: { id: v.id("approvals") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    type: v.union(
      v.literal("send_email"),
      v.literal("reply_to_email"),
      v.literal("initiate_call"),
      v.literal("add_contact"),
      v.literal("update_contact")
    ),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("approvals", {
      type: args.type,
      status: "pending",
      data: args.data,
    });
    return await ctx.db.get(id);
  },
});

export const resolve = mutation({
  args: {
    id: v.id("approvals"),
    resolution: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item || item.status !== "pending") return null;
    await ctx.db.patch(args.id, {
      status: args.resolution,
      resolvedAt: new Date().toISOString(),
    });
    return await ctx.db.get(args.id);
  },
});
