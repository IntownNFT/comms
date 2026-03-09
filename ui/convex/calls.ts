import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {
    limit: v.optional(v.number()),
    direction: v.optional(v.union(v.literal("inbound"), v.literal("outbound"))),
    contactName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let calls = await ctx.db.query("calls").order("desc").collect();

    if (args.direction) calls = calls.filter((c) => c.direction === args.direction);
    if (args.contactName) {
      const q = args.contactName.toLowerCase();
      calls = calls.filter((c) => c.contactName.toLowerCase().includes(q));
    }

    calls.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (args.limit) return calls.slice(0, args.limit);
    return calls;
  },
});

export const getById = query({
  args: { id: v.id("calls") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const add = mutation({
  args: {
    contactId: v.optional(v.string()),
    contactName: v.string(),
    phoneNumber: v.string(),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    status: v.union(v.literal("completed"), v.literal("missed"), v.literal("voicemail")),
    duration: v.number(),
    timestamp: v.string(),
    transcript: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("calls", args);
  },
});

export const updateNotes = mutation({
  args: { id: v.id("calls"), notes: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { notes: args.notes });
    return await ctx.db.get(args.id);
  },
});

export const seed = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("calls").first();
    if (existing) return;

    const seeds = [
      { contactName: "Sarah Chen", phoneNumber: "+1-415-555-0142", direction: "outbound" as const, status: "completed" as const, duration: 847, timestamp: "2026-03-04T14:30:00.000Z", transcript: "Discussed Q2 strategy timeline and deliverables.", notes: "Follow up on partnership pipeline numbers before Thursday." },
      { contactName: "James Wright", phoneNumber: "+1-212-555-0198", direction: "inbound" as const, status: "missed" as const, duration: 0, timestamp: "2026-03-04T11:15:00.000Z", notes: "Missed call — likely about the AI integration proposal." },
      { contactName: "Unknown Caller", phoneNumber: "+1-800-555-0176", direction: "inbound" as const, status: "voicemail" as const, duration: 32, timestamp: "2026-03-03T17:45:00.000Z", transcript: "Hi, this is Rachel from CloudSync. Wanted to follow up on the demo." },
    ];

    for (const s of seeds) {
      await ctx.db.insert("calls", s);
    }
  },
});
