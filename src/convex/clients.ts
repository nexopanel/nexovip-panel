import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./admin";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    return await ctx.db.query("clients").collect();
  },
});

export const create = mutation({
  args: {
    username: v.string(),
    email: v.optional(v.string()),
    telegram: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    const existing = await ctx.db
      .query("clients")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    if (existing) throw new Error("Username already exists");
    return await ctx.db.insert("clients", {
      ...args,
      status: "active",
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("clients"),
    username: v.string(),
    email: v.optional(v.string()),
    telegram: v.optional(v.string()),
    note: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("suspended")),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireUserId(ctx);
    await ctx.db.patch(id, rest);
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("clients"),
    status: v.union(v.literal("active"), v.literal("suspended")),
  },
  handler: async (ctx, { id, status }) => {
    await requireUserId(ctx);
    await ctx.db.patch(id, { status });
  },
});

export const remove = mutation({
  args: { id: v.id("clients") },
  handler: async (ctx, { id }) => {
    await requireUserId(ctx);
    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_client", (q) => q.eq("clientId", id))
      .collect();
    for (const sub of subs) await ctx.db.delete(sub._id);
    const configs = await ctx.db
      .query("configs")
      .withIndex("by_client", (q) => q.eq("clientId", id))
      .collect();
    for (const cfg of configs) await ctx.db.delete(cfg._id);
    await ctx.db.delete(id);
  },
});
