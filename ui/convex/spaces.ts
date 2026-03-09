import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const templateValidator = v.object({
  name: v.string(),
  subject: v.string(),
  body: v.string(),
});

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("spaces").collect();
  },
});

export const getById = query({
  args: { id: v.id("spaces") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    tone: v.string(),
    defaultRecipients: v.array(v.string()),
    emailSignature: v.string(),
    templates: v.array(templateValidator),
    autoApprove: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("spaces", {
      ...args,
      updatedAt: new Date().toISOString(),
    });
    return await ctx.db.get(id);
  },
});

export const update = mutation({
  args: {
    id: v.id("spaces"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    tone: v.optional(v.string()),
    defaultRecipients: v.optional(v.array(v.string())),
    emailSignature: v.optional(v.string()),
    templates: v.optional(v.array(templateValidator)),
    autoApprove: v.optional(v.array(v.string())),
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
  args: { id: v.id("spaces") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const seed = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("spaces").first();
    if (existing) return;

    const now = new Date().toISOString();
    const seeds = [
      { name: "Sales Outreach", description: "Cold outreach, follow-ups, and deal communications", tone: "Professional, confident, and concise.", defaultRecipients: [] as string[], emailSignature: "Best regards,\n\n— Sent via Comms", templates: [{ name: "Cold Outreach", subject: "Quick question about {{company}}", body: "Hi {{name}},\n\nI came across {{company}} and was impressed.\n\nWould you be open to a 15-minute call this week?" }], autoApprove: ["search_contacts", "get_inbox"] },
      { name: "Support", description: "Customer support responses and issue resolution", tone: "Empathetic, helpful, and solution-oriented.", defaultRecipients: [] as string[], emailSignature: "Happy to help!\n\n— Support Team", templates: [{ name: "Issue Acknowledgment", subject: "Re: {{issue}} — We're on it", body: "Hi {{name}},\n\nThank you for reaching out about {{issue}}. We're looking into it right away." }], autoApprove: ["search_contacts", "get_inbox", "get_calls"] },
      { name: "Personal", description: "Personal emails, networking, and casual correspondence", tone: "Warm, friendly, and authentic.", defaultRecipients: [] as string[], emailSignature: "Cheers!", templates: [{ name: "Catch Up", subject: "Long time no talk!", body: "Hey {{name}},\n\nIt's been a while! Would love to grab coffee sometime." }], autoApprove: ["search_contacts"] },
    ];

    for (const s of seeds) {
      await ctx.db.insert("spaces", { ...s, updatedAt: now });
    }
  },
});
