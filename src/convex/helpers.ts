import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx } from "./_generated/server";

/** Throws if the caller is not authenticated. Returns the user id. */
export async function requireUserId(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Unauthenticated");
  }
  return userId;
}
