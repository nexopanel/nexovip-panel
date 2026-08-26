import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

export const nodeStatusValidator = v.union(
  v.literal("online"),
  v.literal("offline"),
  v.literal("maintenance"),
);

export const configProtocolValidator = v.union(
  v.literal("vless"),
  v.literal("trojan"),
);

export const configTransportValidator = v.union(
  v.literal("ws"),
  v.literal("xhttp-packet-up"),
  v.literal("xhttp-stream-up"),
);

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // ── NexoVIP domain tables ────────────────────────────────────────────

    // Physical servers / locations that host inbounds
    nodes: defineTable({
      name: v.string(),
      host: v.string(),
      location: v.string(),
      flag: v.string(), // emoji flag
      status: nodeStatusValidator,
      cpu: v.number(), // 0..100
      memory: v.number(), // 0..100
      uptimeHours: v.number(),
      capacity: v.number(), // max configs
      lastSeen: v.number(),
      createdAt: v.number(),
    }),

    // VPN clients (panel users consuming configs/subscriptions)
    clients: defineTable({
      username: v.string(),
      email: v.optional(v.string()),
      telegram: v.optional(v.string()),
      note: v.optional(v.string()),
      status: v.union(v.literal("active"), v.literal("suspended")),
      createdAt: v.number(),
    }).index("by_username", ["username"]),

    // Subscriptions tied to a client: quota + expiry tracking
    subscriptions: defineTable({
      clientId: v.id("clients"),
      plan: v.string(),
      trafficLimitGb: v.number(), // -1 = unlimited
      trafficUsedGb: v.number(),
      expiresAt: v.number(),
      status: v.union(
        v.literal("active"),
        v.literal("expired"),
        v.literal("suspended"),
      ),
      createdAt: v.number(),
    }).index("by_client", ["clientId"]),

    // Clean / alternative IPs appended to generated configs
    ips: defineTable({
      address: v.string(),
      kind: v.union(
        v.literal("clean"),
        v.literal("railway"),
        v.literal("custom"),
      ),
      label: v.optional(v.string()),
      createdAt: v.number(),
    }),

    // Generated VPN configurations (the Config Builder output)
    configs: defineTable({
      label: v.string(),
      token: v.string(), // uuid / password used inside the URI
      protocol: configProtocolValidator,
      transport: configTransportValidator,
      fingerprint: v.string(), // uTLS fingerprint
      alpn: v.string(),
      port: v.number(), // always 443 like LUFFY panel
      nodeId: v.id("nodes"),
      clientId: v.id("clients"),
      enabled: v.boolean(),
      security: v.union(v.literal("tls"), v.literal("none")),
      sni: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_node", ["nodeId"])
      .index("by_client", ["clientId"]),

    // Hourly traffic samples powering dashboard charts (bytes up/down)
    trafficSamples: defineTable({
      bucket: v.number(), // hour start timestamp (ms)
      down: v.number(), // bytes downloaded through the network
      up: v.number(), // bytes uploaded through the network
      onlineUsers: v.number(),
    }).index("by_bucket", ["bucket"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
