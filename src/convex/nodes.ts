import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./admin";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    return await ctx.db.query("nodes").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    host: v.string(),
    location: v.string(),
    flag: v.string(),
    capacity: v.number(),
    status: v.union(
      v.literal("online"),
      v.literal("offline"),
      v.literal("maintenance"),
    ),
  },
  handler: async (ctx, args) => {
    await requireUserId(ctx);
    return await ctx.db.insert("nodes", {
      ...args,
      cpu: 0,
      memory: 0,
      uptimeHours: 0,
      lastSeen: Date.now(),
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("nodes"),
    name: v.string(),
    host: v.string(),
    location: v.string(),
    flag: v.string(),
    capacity: v.number(),
    status: v.union(
      v.literal("online"),
      v.literal("offline"),
      v.literal("maintenance"),
    ),
  },
  handler: async (ctx, { id, ...rest }) => {
    await requireUserId(ctx);
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("nodes") },
  handler: async (ctx, { id }) => {
    await requireUserId(ctx);
    // Detach configs pointing at this node instead of orphaning them.
    const configs = await ctx.db
      .query("configs")
      .withIndex("by_node", (q) => q.eq("nodeId", id))
      .collect();
    for (const cfg of configs) {
      await ctx.db.delete(cfg._id);
    }
    await ctx.db.delete(id);
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("nodes"),
    status: v.union(
      v.literal("online"),
      v.literal("offline"),
      v.literal("maintenance"),
    ),
  },
  handler: async (ctx, { id, status }) => {
    await requireUserId(ctx);
    await ctx.db.patch(id, { status, lastSeen: Date.now() });
  },
});

/** Simulated monitoring heartbeat: refreshes live metrics for online nodes. */
export const heartbeat = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    const nodes = await ctx.db.query("nodes").collect();
    for (const node of nodes) {
      if (node.status === "offline") continue;
      const drift = () =>
        Math.max(2, Math.min(96, node.cpu + Math.round((Math.random() - 0.5) * 18)));
      const memDrift = () =>
        Math.max(5, Math.min(95, node.memory + Math.round((Math.random() - 0.5) * 10)));
      await ctx.db.patch(node._id, {
        cpu: node.status === "online" ? drift() : 0,
        memory: node.status === "online" ? memDrift() : 0,
        uptimeHours:
          node.uptimeHours + (node.status === "online" ? Math.random() * 0.05 : 0),
        lastSeen: Date.now(),
      });
    }
  },
});
