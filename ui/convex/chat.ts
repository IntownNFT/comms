import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listThreads = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("chatThreads")
      .withIndex("by_updatedAt")
      .order("desc")
      .collect();
  },
});

export const getThread = query({
  args: { id: v.id("chatThreads") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getMessages = query({
  args: { threadId: v.id("chatThreads") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();
  },
});

export const createThread = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const id = await ctx.db.insert("chatThreads", {
      title: args.title,
      lastMessage: "",
      updatedAt: now,
    });
    return await ctx.db.get(id);
  },
});

export const addMessage = mutation({
  args: {
    threadId: v.id("chatThreads"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const id = await ctx.db.insert("chatMessages", {
      threadId: args.threadId,
      role: args.role,
      content: args.content,
      timestamp: now,
    });

    await ctx.db.patch(args.threadId, {
      lastMessage: args.content.slice(0, 120),
      updatedAt: now,
    });

    return await ctx.db.get(id);
  },
});

export const updateThreadTitle = mutation({
  args: { id: v.id("chatThreads"), title: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      title: args.title,
      updatedAt: new Date().toISOString(),
    });
    return await ctx.db.get(args.id);
  },
});
