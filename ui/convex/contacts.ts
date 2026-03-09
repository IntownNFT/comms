import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    let q = ctx.db.query("contacts").order("desc");
    const contacts = await q.collect();
    if (args.limit) return contacts.slice(0, args.limit);
    return contacts;
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("contacts")
      .withSearchIndex("search_contacts", (q) => q.search("name", args.query))
      .collect();
    return results;
  },
});

export const getById = query({
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    tags: v.array(v.string()),
    notes: v.optional(v.string()),
    lastContacted: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    return await ctx.db.insert("contacts", { ...args, updatedAt: now });
  },
});

export const update = mutation({
  args: {
    id: v.id("contacts"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    lastContacted: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, { ...filtered, updatedAt: new Date().toISOString() });
    return await ctx.db.get(id);
  },
});

export const remove = mutation({
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const seed = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("contacts").first();
    if (existing) return;

    const now = new Date().toISOString();
    const seeds = [
      { name: "Sarah Chen", email: "sarah.chen@acmecorp.com", phone: "+1-415-555-0142", company: "Acme Corp", tags: ["client", "enterprise"], notes: "VP of Product. Key decision maker for Q2 partnership.", lastContacted: "2026-03-04T14:30:00.000Z", avatar: "SC" },
      { name: "James Wright", email: "james.wright@venturelabs.io", phone: "+1-212-555-0198", company: "Venture Labs", tags: ["vendor", "ai"], notes: "Founder. Proposed AI integration services — $45K/3mo.", lastContacted: "2026-03-04T16:42:00.000Z", avatar: "JW" },
      { name: "Maya Patel", email: "maya.patel@designhub.co", phone: "+1-628-555-0167", company: "DesignHub", tags: ["team", "design"], notes: "New design lead starting Monday. Previously at Figma.", avatar: "MP" },
      { name: "Carlos Rivera", email: "carlos.rivera@startupfund.vc", phone: "+1-305-555-0134", company: "Startup Fund VC", tags: ["investor", "networking"], notes: "Met at TechCrunch Disrupt. Interested in Series A conversations.", lastContacted: "2026-02-20T10:00:00.000Z", avatar: "CR" },
      { name: "Emily Nakamura", email: "emily.nakamura@cloudsyncinc.com", company: "CloudSync Inc", tags: ["prospect", "saas"], notes: "Requested a demo after conference. Follow up needed.", avatar: "EN" },
    ];

    for (const s of seeds) {
      await ctx.db.insert("contacts", { ...s, updatedAt: now });
    }
  },
});
