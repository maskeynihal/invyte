import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import {
  ensureDefaultFreePlan,
  ensureDefaultRoles,
  ensureUserAccessRecords,
  getCurrentPeriodKey,
  hasAnyAdminUser,
  requireAdminUser,
  resolveUserAccessByToken,
} from "./entitlements";

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as T;
}

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

function isGoing(status: "going" | "maybe" | "not-going") {
  return status === "going";
}

const GUEST_TOKEN_PREFIX = "guest:";

const SUPERHERO_ADJECTIVES = [
  "Cosmic",
  "Shadow",
  "Neon",
  "Thunder",
  "Solar",
  "Frost",
  "Crimson",
  "Quantum",
  "Iron",
  "Nova",
] as const;

const SUPERHERO_TITLES = [
  "Sentinel",
  "Falcon",
  "Guardian",
  "Ranger",
  "Titan",
  "Vortex",
  "Comet",
  "Phoenix",
  "Cipher",
  "Blaze",
] as const;

function isGuestTokenIdentifier(tokenIdentifier: string | null | undefined) {
  return Boolean(tokenIdentifier?.startsWith(GUEST_TOKEN_PREFIX));
}

function stableHash(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function buildSuperheroAlias(seed: string) {
  const hash = stableHash(seed || "invyte-default-hero");
  const adjective = SUPERHERO_ADJECTIVES[hash % SUPERHERO_ADJECTIVES.length];
  const title =
    SUPERHERO_TITLES[Math.floor(hash / 7) % SUPERHERO_TITLES.length];
  const code = hash.toString(36).slice(-4).toUpperCase().padStart(4, "0");

  return `I'm ${adjective} ${title} ${code}`;
}

function resolveClerkDisplayName(identity: {
  tokenIdentifier?: string | null;
  name?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  nickname?: string | null;
  email?: string | null;
  username?: string | null;
}) {
  const fullName = [identity.givenName?.trim(), identity.familyName?.trim()]
    .filter(Boolean)
    .join(" ")
    .trim();

  const preferredName =
    identity.name?.trim() ||
    fullName ||
    identity.username?.trim() ||
    identity.nickname?.trim();

  if (preferredName) {
    return preferredName;
  }

  const normalizedEmail = normalizeEmail(identity.email);
  const [emailHandle] = normalizedEmail.split("@");
  if (emailHandle?.trim()) {
    return emailHandle.trim();
  }

  const seed = `${identity.tokenIdentifier ?? ""}|${normalizedEmail}`;

  return buildSuperheroAlias(seed);
}

async function migrateGuestParticipationToAuthenticatedUser(
  ctx: MutationCtx,
  tokenIdentifier: string,
  name: string,
  avatar: string | null | undefined,
  email: string | null | undefined,
) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return;
  }

  const matchingAttendees = await ctx.db
    .query("attendees")
    .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
    .collect();

  for (const attendee of matchingAttendees) {
    if (attendee.userTokenIdentifier === tokenIdentifier) {
      continue;
    }

    await ctx.db.patch(attendee._id, {
      userTokenIdentifier: tokenIdentifier,
      name,
      email: normalizedEmail,
      avatar: avatar ?? attendee.avatar,
      responseSource: "member",
    });
  }

  const guestUsers = (
    await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .collect()
  ).filter(
    (user) =>
      user.tokenIdentifier !== tokenIdentifier &&
      isGuestTokenIdentifier(user.tokenIdentifier),
  );

  for (const guestUser of guestUsers) {
    const guestTokenIdentifier = guestUser.tokenIdentifier;

    const guestComments = (await ctx.db.query("comments").collect()).filter(
      (comment) => comment.userId === guestTokenIdentifier,
    );
    for (const comment of guestComments) {
      await ctx.db.patch(comment._id, {
        userId: tokenIdentifier,
        userName: name,
        userAvatar: avatar ?? comment.userAvatar,
      });
    }

    const guestLikes = (await ctx.db.query("eventLikes").collect()).filter(
      (like) => like.userTokenIdentifier === guestTokenIdentifier,
    );
    for (const like of guestLikes) {
      const duplicateLike = await ctx.db
        .query("eventLikes")
        .withIndex("by_event_and_userTokenIdentifier", (q) =>
          q
            .eq("eventId", like.eventId)
            .eq("userTokenIdentifier", tokenIdentifier),
        )
        .unique();

      if (duplicateLike) {
        await ctx.db.delete(like._id);
        continue;
      }

      await ctx.db.patch(like._id, {
        userTokenIdentifier: tokenIdentifier,
        userName: name,
      });
    }

    const guestReactions = (
      await ctx.db.query("commentReactions").collect()
    ).filter(
      (reaction) => reaction.userTokenIdentifier === guestTokenIdentifier,
    );
    for (const reaction of guestReactions) {
      const duplicateReaction = await ctx.db
        .query("commentReactions")
        .withIndex("by_comment_and_userTokenIdentifier_and_emoji", (q) =>
          q
            .eq("commentId", reaction.commentId)
            .eq("userTokenIdentifier", tokenIdentifier)
            .eq("emoji", reaction.emoji),
        )
        .unique();

      if (duplicateReaction) {
        await ctx.db.delete(reaction._id);
        continue;
      }

      await ctx.db.patch(reaction._id, {
        userTokenIdentifier: tokenIdentifier,
        userName: name,
      });
    }

    const guestBringItems = (await ctx.db.query("bringItems").collect()).filter(
      (item) =>
        item.createdByTokenIdentifier === guestTokenIdentifier ||
        item.claimedByTokenIdentifier === guestTokenIdentifier,
    );
    for (const item of guestBringItems) {
      await ctx.db.patch(
        item._id,
        omitUndefined({
          createdByTokenIdentifier:
            item.createdByTokenIdentifier === guestTokenIdentifier
              ? tokenIdentifier
              : undefined,
          createdByName:
            item.createdByTokenIdentifier === guestTokenIdentifier
              ? name
              : undefined,
          claimedByTokenIdentifier:
            item.claimedByTokenIdentifier === guestTokenIdentifier
              ? tokenIdentifier
              : undefined,
          claimedByName:
            item.claimedByTokenIdentifier === guestTokenIdentifier
              ? name
              : undefined,
        }),
      );
    }

    const guestPhotos = (await ctx.db.query("galleryPhotos").collect()).filter(
      (photo) => photo.uploadedByTokenIdentifier === guestTokenIdentifier,
    );
    for (const photo of guestPhotos) {
      await ctx.db.patch(photo._id, {
        uploadedByTokenIdentifier: tokenIdentifier,
        uploadedByName: name,
      });
    }

    await ctx.db.delete(guestUser._id);
  }
}

export const storeUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication");
    }

    const resolvedName = resolveClerkDisplayName(identity);
    const normalizedIdentityEmail = normalizeEmail(identity.email);

    await ensureDefaultFreePlan(ctx);
    await ensureDefaultRoles(ctx);

    const shouldBootstrapAdmin = !(await hasAnyAdminUser(ctx));

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (user) {
      const updates = omitUndefined({
        // Respect a custom display name the user set; only sync Clerk name otherwise.
        name:
          !user.hasCustomName && user.name !== resolvedName
            ? resolvedName
            : undefined,
        email:
          normalizeEmail(user.email) !== normalizedIdentityEmail
            ? normalizedIdentityEmail
            : undefined,
        avatar:
          user.avatar !== identity.pictureUrl ? identity.pictureUrl : undefined,
        isAnonymous: user.isAnonymous ? false : undefined,
      });

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(user._id, updates);
      }

      await ensureUserAccessRecords(ctx, identity.tokenIdentifier, {
        bootstrapAdmin: shouldBootstrapAdmin,
      });

      await migrateGuestParticipationToAuthenticatedUser(
        ctx,
        identity.tokenIdentifier,
        resolvedName,
        identity.pictureUrl,
        identity.email,
      );

      return user._id;
    }

    const insertedUserId = await ctx.db.insert("users", {
      name: resolvedName,
      email: normalizedIdentityEmail,
      avatar: identity.pictureUrl,
      tokenIdentifier: identity.tokenIdentifier,
      isAnonymous: false,
    });

    await ensureUserAccessRecords(ctx, identity.tokenIdentifier, {
      bootstrapAdmin: shouldBootstrapAdmin,
    });

    await migrateGuestParticipationToAuthenticatedUser(
      ctx,
      identity.tokenIdentifier,
      resolvedName,
      identity.pictureUrl,
      identity.email,
    );

    return insertedUserId;
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
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
  },
});

export const getGuestRsvps = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const normalizedEmail = normalizeEmail(identity.email);

    if (!normalizedEmail) {
      return {
        guestEmail: null,
        guestTokenIdentifier: null,
        guestRsvps: [],
        guestRsvpCount: 0,
        guestGoingCount: 0,
      };
    }

    const guestTokenIdentifier = `${GUEST_TOKEN_PREFIX}${normalizedEmail}`;
    const guestAttendees = await ctx.db
      .query("attendees")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .collect();

    const guestRsvps = (
      await Promise.all(
        guestAttendees
          .filter(
            (attendee) =>
              attendee.responseSource === "guest" ||
              attendee.userTokenIdentifier === guestTokenIdentifier,
          )
          .sort((left, right) => right._creationTime - left._creationTime)
          .map(async (attendee) => {
            const event = await ctx.db.get(attendee.eventId);
            if (!event) {
              return null;
            }

            return {
              attendeeId: attendee._id,
              eventId: event._id,
              title: event.title,
              date: event.date,
              time: event.time,
              location: event.location,
              coverImage: event.coverImage,
              vibe: event.vibe,
              rsvpStatus: attendee.rsvpStatus,
              plusOne: attendee.plusOne,
              plusOneName: attendee.plusOneName,
              dietaryRestrictions: attendee.dietaryRestrictions,
              responseSource: attendee.responseSource ?? "guest",
              attendeeName: attendee.name,
            };
          }),
      )
    ).filter(
      (attendee): attendee is NonNullable<typeof attendee> => attendee !== null,
    );

    return {
      guestEmail: normalizedEmail,
      guestTokenIdentifier,
      guestRsvps,
      guestRsvpCount: guestRsvps.length,
      guestGoingCount: guestRsvps.filter((attendee) =>
        isGoing(attendee.rsvpStatus),
      ).length,
    };
  },
});

export const transferGuestRsvpsToAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const normalizedEmail = normalizeEmail(identity.email);
    if (!normalizedEmail) {
      throw new Error("An email address is required to transfer RSVPs");
    }

    const guestTokenIdentifier = `${GUEST_TOKEN_PREFIX}${normalizedEmail}`;
    const memberName = resolveClerkDisplayName(identity);
    const memberAvatar = identity.pictureUrl;

    const guestAttendees = await ctx.db
      .query("attendees")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .collect();

    const transferableGuestAttendees = guestAttendees.filter(
      (attendee) =>
        attendee.responseSource === "guest" ||
        attendee.userTokenIdentifier === guestTokenIdentifier,
    );

    let transferredCount = 0;
    let mergedCount = 0;

    for (const guestAttendee of transferableGuestAttendees) {
      const event = await ctx.db.get(guestAttendee.eventId);
      if (!event) {
        continue;
      }

      const memberAttendee = await ctx.db
        .query("attendees")
        .withIndex("by_event_and_userTokenIdentifier", (q) =>
          q
            .eq("eventId", guestAttendee.eventId)
            .eq("userTokenIdentifier", identity.tokenIdentifier),
        )
        .unique();

      if (memberAttendee && memberAttendee._id !== guestAttendee._id) {
        const previousGoing = isGoing(memberAttendee.rsvpStatus);
        const nextGoing = isGoing(guestAttendee.rsvpStatus);

        await ctx.db.patch(memberAttendee._id, {
          name: memberName,
          email: normalizedEmail,
          avatar: memberAvatar ?? memberAttendee.avatar,
          rsvpStatus: guestAttendee.rsvpStatus,
          plusOne: event.allowPlusOne ? guestAttendee.plusOne : false,
          plusOneName: event.allowPlusOne
            ? guestAttendee.plusOneName
            : undefined,
          dietaryRestrictions: guestAttendee.dietaryRestrictions,
          userTokenIdentifier: identity.tokenIdentifier,
          responseSource: "member",
        });

        if (previousGoing !== nextGoing) {
          await ctx.db.patch(event._id, {
            attendeeCount:
              (event.attendeeCount ?? 0) +
              Number(nextGoing) -
              Number(previousGoing),
          });
        }

        await ctx.db.delete(guestAttendee._id);
        mergedCount += 1;
        transferredCount += 1;
        continue;
      }

      await ctx.db.patch(guestAttendee._id, {
        name: memberName,
        email: normalizedEmail,
        avatar: memberAvatar ?? guestAttendee.avatar,
        userTokenIdentifier: identity.tokenIdentifier,
        responseSource: "member",
      });

      transferredCount += 1;
    }

    return {
      transferredCount,
      mergedCount,
    };
  },
});

export const getCurrentUserAccess = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      return null;
    }

    const access = await resolveUserAccessByToken(
      ctx,
      identity.tokenIdentifier,
    );
    const currentPeriodKey = getCurrentPeriodKey();

    return {
      userId: user._id,
      role: access.roleKey,
      isAdmin: access.isAdmin,
      planKey: access.planKey,
      planName: access.planName,
      usage: {
        ...access.usage,
        monthlyEventCreatedCount:
          access.usage.monthlyEventPeriodKey === currentPeriodKey
            ? access.usage.monthlyEventCreatedCount
            : 0,
        monthlyEventPeriodKey: currentPeriodKey,
      },
      effectiveFeatures: access.effectiveFeatures,
    };
  },
});

export const listAdminUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminUser(ctx);

    const users = await ctx.db.query("users").order("desc").collect();

    return await Promise.all(
      users.map(async (user) => {
        const access = await resolveUserAccessByToken(
          ctx,
          user.tokenIdentifier,
        );
        const createdEvents = await ctx.db
          .query("events")
          .withIndex("by_hostId", (q) => q.eq("hostId", user.tokenIdentifier))
          .collect();
        const uploadedPhotos = await ctx.db
          .query("galleryPhotos")
          .withIndex("by_uploadedByTokenIdentifier", (q) =>
            q.eq("uploadedByTokenIdentifier", user.tokenIdentifier),
          )
          .collect();

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: access.roleKey,
          planKey: access.planKey,
          planName: access.planName,
          features: access.effectiveFeatures,
          usage: {
            ...access.usage,
            totalEventCreatedCount: Math.max(
              access.usage.totalEventCreatedCount,
              createdEvents.length,
            ),
            uploadedPhotoCount: Math.max(
              access.usage.uploadedPhotoCount,
              uploadedPhotos.length,
            ),
          },
          stats: {
            eventCount: createdEvents.length,
            uploadedPhotoCount: uploadedPhotos.length,
          },
        };
      }),
    );
  },
});

export const listFeaturePlans = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminUser(ctx);
    return await ctx.db.query("featurePlans").order("asc").collect();
  },
});

export const upsertFeaturePlan = mutation({
  args: {
    key: v.string(),
    name: v.string(),
    canImageUpdate: v.boolean(),
    canEventCreation: v.boolean(),
    canImageViewFromEvents: v.boolean(),
    monthlyEventLimit: v.number(),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);

    const normalizedKey = args.key.trim().toLowerCase();

    const existing = await ctx.db
      .query("featurePlans")
      .withIndex("by_key", (q) => q.eq("key", normalizedKey))
      .unique();

    const normalizedArgs = {
      key: normalizedKey,
      name: args.name.trim(),
      canImageUpdate: args.canImageUpdate,
      canEventCreation: args.canEventCreation,
      canImageViewFromEvents: args.canImageViewFromEvents,
      monthlyEventLimit: Math.max(0, args.monthlyEventLimit),
      isDefault: args.isDefault ?? false,
    };

    if (normalizedArgs.isDefault) {
      const currentDefaults = await ctx.db
        .query("featurePlans")
        .withIndex("by_isDefault", (q) => q.eq("isDefault", true))
        .collect();
      for (const plan of currentDefaults) {
        if (existing && plan._id === existing._id) {
          continue;
        }
        await ctx.db.patch(plan._id, { isDefault: false });
      }
    }

    if (existing) {
      await ctx.db.patch(existing._id, normalizedArgs);
      return existing._id;
    }

    return await ctx.db.insert("featurePlans", normalizedArgs);
  },
});

export const updateUserAccess = mutation({
  args: {
    userId: v.id("users"),
    role: v.optional(v.string()),
    planKey: v.optional(v.string()),
    canImageUpdate: v.optional(v.boolean()),
    canEventCreation: v.optional(v.boolean()),
    canImageViewFromEvents: v.optional(v.boolean()),
    monthlyEventLimit: v.optional(v.number()),
    clearOverrides: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdminUser(ctx);
    const user = await ctx.db.get(args.userId);

    if (!user) {
      throw new Error("User not found");
    }

    const normalizedRoleKey = args.role?.trim().toLowerCase();
    const normalizedPlanKey = args.planKey?.trim().toLowerCase();

    if (normalizedRoleKey) {
      const role = await ctx.db
        .query("roles")
        .withIndex("by_key", (q) => q.eq("key", normalizedRoleKey))
        .unique();

      if (!role) {
        throw new Error("Role not found");
      }

      const currentUserRole = await ctx.db
        .query("userRoles")
        .withIndex("by_token", (q) =>
          q.eq("tokenIdentifier", user.tokenIdentifier),
        )
        .unique();

      if (currentUserRole) {
        await ctx.db.patch(currentUserRole._id, { roleKey: normalizedRoleKey });
      } else {
        await ctx.db.insert("userRoles", {
          tokenIdentifier: user.tokenIdentifier,
          roleKey: normalizedRoleKey,
        });
      }
    }

    if (normalizedPlanKey) {
      const plan = await ctx.db
        .query("featurePlans")
        .withIndex("by_key", (q) => q.eq("key", normalizedPlanKey))
        .unique();

      if (!plan) {
        throw new Error("Plan not found");
      }

      const currentUserPlan = await ctx.db
        .query("userPlans")
        .withIndex("by_token", (q) =>
          q.eq("tokenIdentifier", user.tokenIdentifier),
        )
        .unique();

      if (currentUserPlan) {
        await ctx.db.patch(currentUserPlan._id, { planKey: normalizedPlanKey });
      } else {
        await ctx.db.insert("userPlans", {
          tokenIdentifier: user.tokenIdentifier,
          planKey: normalizedPlanKey,
        });
      }
    }

    const existingOverrides = await ctx.db
      .query("userFeatureOverrides")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", user.tokenIdentifier),
      )
      .unique();

    if (args.clearOverrides) {
      if (existingOverrides) {
        await ctx.db.delete(existingOverrides._id);
      }
      return args.userId;
    }

    const overridePatch = omitUndefined({
      canImageUpdate: args.canImageUpdate,
      canEventCreation: args.canEventCreation,
      canImageViewFromEvents: args.canImageViewFromEvents,
      monthlyEventLimit:
        args.monthlyEventLimit === undefined
          ? undefined
          : Math.max(0, args.monthlyEventLimit),
    });

    if (Object.keys(overridePatch).length > 0) {
      if (existingOverrides) {
        await ctx.db.patch(existingOverrides._id, overridePatch);
      } else {
        await ctx.db.insert("userFeatureOverrides", {
          tokenIdentifier: user.tokenIdentifier,
          ...overridePatch,
        });
      }
    }

    return args.userId;
  },
});

export const backfillUsersAccessDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdminUser(ctx);
    await ensureDefaultRoles(ctx);
    await ensureDefaultFreePlan(ctx);

    const users = await ctx.db.query("users").collect();
    let updated = 0;

    for (const user of users) {
      const beforeRole = await ctx.db
        .query("userRoles")
        .withIndex("by_token", (q) =>
          q.eq("tokenIdentifier", user.tokenIdentifier),
        )
        .unique();
      const beforePlan = await ctx.db
        .query("userPlans")
        .withIndex("by_token", (q) =>
          q.eq("tokenIdentifier", user.tokenIdentifier),
        )
        .unique();
      const beforeUsage = await ctx.db
        .query("userUsage")
        .withIndex("by_token", (q) =>
          q.eq("tokenIdentifier", user.tokenIdentifier),
        )
        .unique();

      await ensureUserAccessRecords(ctx, user.tokenIdentifier);

      if (!beforeRole || !beforePlan || !beforeUsage) {
        updated += 1;
      }
    }

    return { updated };
  },
});

export const updateDisplayName = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const trimmed = args.name.trim();
    if (!trimmed) {
      throw new Error("Display name cannot be empty");
    }
    if (trimmed.length > 50) {
      throw new Error("Display name must be 50 characters or fewer");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, { name: trimmed, hasCustomName: true });
    return trimmed;
  },
});
