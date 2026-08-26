import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./admin";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    return await ctx.db.query("ips").collect();
  },
});

export const add = mutation({
  args: {
    address: v.string(),
    kind: v.union(v.literal("clean"), v.literal("railway"), v.literal("custom")),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const all = await ctx.db.query("ips").collect();
    if (all.some((ip) => ip.address === args.address)) {
      throw new Error("Address already exists");
    }
    return await ctx.db.insert("ips", { ...args, createdAt: Date.now() });
  },
});

/** Bulk import — skips duplicates, mirrors LUFFY panel's Railway IP button. */
export const addBulk = mutation({
  args: {
    addresses: v.array(v.string()),
    kind: v.union(v.literal("clean"), v.literal("railway"), v.literal("custom")),
  },
  handler: async (ctx, { addresses, kind }) => {
    await requireUserId(ctx);
    const all = await ctx.db.query("ips").collect();
    const known = new Set(all.map((ip) => ip.address));
    let added = 0;
    for (const address of addresses) {
      const trimmed = address.trim();
      if (!trimmed || known.has(trimmed)) continue;
      known.add(trimmed);
      await ctx.db.insert("ips", {
        address: trimmed,
        kind,
        createdAt: Date.now(),
      });
      added++;
    }
    return added;
  },
});

export const remove = mutation({
  args: { id: v.id("ips") },
  handler: async (ctx, { id }) => {
    await requireUserId(ctx);
    await ctx.db.delete(id);
  },
});

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    const all = await ctx.db.query("ips").collect();
    for (const ip of all) await ctx.db.delete(ip._id);
    return all.length;
  },
});
