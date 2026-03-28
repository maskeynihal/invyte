import { mutation, query } from "./_generated/server";

export const storeUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication");
    }

    // Check if we've already stored this user
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (user !== null) {
      // If we've seen this user before but their name or picture has changed, update them.
      if (
        user.name !== identity.name ||
        user.avatar !== identity.pictureUrl ||
        user.email !== (identity.email ?? "")
      ) {
        await ctx.db.patch(user._id, {
          name: identity.name ?? identity.nickname ?? "Anonymous",
          email: identity.email ?? "",
          ...(identity.pictureUrl ? { avatar: identity.pictureUrl } : {}),
        });
      }
      return user._id;
    }

    // If it's a new identity, create a new User.
    return await ctx.db.insert("users", {
      name: identity.name ?? identity.nickname ?? "Anonymous",
      email: identity.email ?? "",
      avatar: identity.pictureUrl,
      tokenIdentifier: identity.tokenIdentifier,
    });
  },
});

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
  },
});
