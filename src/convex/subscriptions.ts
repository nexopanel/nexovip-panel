import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./admin";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    return await ctx.db.query("subscriptions").collect();
  },
});

export const create = mutation({
  args: {
    clientId: v.id("clients"),
    plan: v.string(),
    trafficLimitGb: v.number(),
    daysValid: v.number(),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    return await ctx.db.insert("subscriptions", {
      clientId: args.clientId,
      plan: args.plan,
      trafficLimitGb: args.trafficLimitGb,
      trafficUsedGb: 0,
      expiresAt: Date.now() + args.daysValid * 24 * 60 * 60 * 1000,
      status: "active",
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("subscriptions"),
    plan: v.string(),
    trafficLimitGb: v.number(),
    expiresAt: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("suspended"),
    ),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireUserId(ctx);
    await ctx.db.patch(id, rest);
  },
});

export const addTraffic = mutation({
  args: {
    id: v.id("subscriptions"),
    gb: v.number(),
  },
  handler: async (ctx, { id, gb }) => {
    await requireUserId(ctx);
    const sub = await ctx.db.get(id);
    if (!sub) throw new Error("Subscription not found");
    const used = Math.max(0, sub.trafficUsedGb + gb);
    let status = sub.status;
    if (sub.trafficLimitGb > 0 && used >= sub.trafficLimitGb) status = "expired";
    if (Date.now() > sub.expiresAt && status === "active") status = "expired";
    await ctx.db.patch(id, { trafficUsedGb: used, status });
  },
});

export const renew = mutation({
  args: { id: v.id("subscriptions"), days: v.number() },
  handler: async (ctx, { id, days }) => {
    await requireUserId(ctx);
    const sub = await ctx.db.get(id);
    if (!sub) throw new Error("Subscription not found");
    await ctx.db.patch(id, {
      expiresAt: Date.now() + days * 24 * 60 * 60 * 1000,
      status: "active",
      trafficUsedGb: 0,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("subscriptions") },
  handler: async (ctx, { id }) => {
    await requireUserId(ctx);
    await ctx.db.delete(id);
  },
});
