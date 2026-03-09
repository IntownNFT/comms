import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const DEFAULTS = {
  key: "global" as const,
  agentModes: {
    search_contacts: "auto",
    add_contact: "auto",
    update_contact: "auto",
    delete_contact: "manual",
    get_inbox: "auto",
    get_email: "auto",
    send_email: "draft",
    reply_to_email: "draft",
    mark_read: "auto",
    toggle_flag: "auto",
    move_to_folder: "auto",
    get_unread_count: "auto",
    summarize_inbox: "auto",
    get_calls: "auto",
    get_call: "auto",
    add_call: "auto",
    update_call_notes: "auto",
    initiate_call: "draft",
    get_spaces: "auto",
    get_space: "auto",
    create_space: "auto",
    update_space: "auto",
    delete_space: "manual",
    get_threads: "auto",
    get_messages: "auto",
    get_approval_queue: "auto",
    approve_action: "auto",
    get_settings: "auto",
    update_settings: "auto",
    get_activity: "auto",
  },
  fromEmail: "you@example.com",
  anthropicModel: "claude-sonnet-4-20250514",
  temperature: 0.7,
  notificationsEnabled: true,
};

export const get = query({
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();
    if (!settings) return DEFAULTS;
    return settings;
  },
});

export const update = mutation({
  args: {
    agentModes: v.optional(v.any()),
    fromEmail: v.optional(v.string()),
    anthropicModel: v.optional(v.string()),
    temperature: v.optional(v.number()),
    voiceProvider: v.optional(v.string()),
    voiceApiKey: v.optional(v.string()),
    notificationsEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    const filtered = Object.fromEntries(
      Object.entries(args).filter(([, v]) => v !== undefined)
    );

    if (existing) {
      if (args.agentModes) {
        filtered.agentModes = { ...existing.agentModes, ...args.agentModes };
      }
      await ctx.db.patch(existing._id, filtered);
      return await ctx.db.get(existing._id);
    }

    const id = await ctx.db.insert("settings", { ...DEFAULTS, ...filtered });
    return await ctx.db.get(id);
  },
});
