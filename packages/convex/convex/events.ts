import { v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  assertAndConsumeEventCreation,
  assertCanImageUpdate,
  canUserViewEventImages,
  recordUploadedPhoto,
} from "./entitlements";

const rsvpStatusValidator = v.union(
  v.literal("going"),
  v.literal("maybe"),
  v.literal("not-going"),
);

const reactionEmojiValidator = v.union(
  v.literal("🔥"),
  v.literal("🎉"),
  v.literal("❤️"),
);

type EventDoc = Doc<"events">;
type AttendeeDoc = Doc<"attendees">;
type Context = QueryCtx | MutationCtx;
type ViewerIdentity = {
  tokenIdentifier: string;
  name?: string | null;
  nickname?: string | null;
  email?: string | null;
  pictureUrl?: string | null;
};
type EventActor = {
  event: EventDoc;
  identity: ViewerIdentity | null;
  attendee: AttendeeDoc | null;
  isHost: boolean;
  isMember: boolean;
  tokenIdentifier: string | null;
  displayName: string;
  avatar: string;
  email: string | null;
};

const MEMBER_REACTION_EMOJIS = ["🔥", "🎉", "❤️"] as const;
const GUEST_TOKEN_PREFIX = "guest:";
const EVENT_ACCESS_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function avatarFallback(name: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
}

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

function emailUsername(email: string | null | undefined) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  const [username] = normalizedEmail.split("@");
  return username?.trim() ? username : null;
}

function getGuestTokenIdentifier(email: string) {
  return `${GUEST_TOKEN_PREFIX}${normalizeEmail(email)}`;
}

function resolveIdentityDisplayName(identity: {
  tokenIdentifier?: string;
  name?: string | null;
  nickname?: string | null;
  email?: string | null;
}) {
  return (
    identity.name?.trim() ||
    identity.nickname?.trim() ||
    emailUsername(identity.email) ||
    "User"
  );
}

function isGenericDisplayName(name: string) {
  const normalizedName = name.trim().toLowerCase();
  return normalizedName === "member" || normalizedName === "user";
}

function getEventAccessSecret() {
  const secret =
    process.env.EVENT_ACCESS_TOKEN_SECRET ?? process.env.CLERK_SECRET_KEY;

  if (!secret) {
    throw new Error(
      "Missing EVENT_ACCESS_TOKEN_SECRET or CLERK_SECRET_KEY for signed event access",
    );
  }

  return secret;
}

function bytesToBase64Url(bytes: Uint8Array) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join(
    "",
  );
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlEncode(value: string) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64UrlDecode(value: string) {
  const paddedValue = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding =
    paddedValue.length % 4 === 0
      ? ""
      : "=".repeat(4 - (paddedValue.length % 4));
  const binary = atob(`${paddedValue}${padding}`);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function signPayload(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getEventAccessSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

async function signEventAccessToken(payload: {
  eventId: string;
  attendeeId: string;
  exp: number;
}) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

async function verifyEventAccessToken(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = await signPayload(encodedPayload);
  if (expectedSignature !== providedSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as {
      eventId?: string;
      attendeeId?: string;
      exp?: number;
    };

    if (
      !payload.eventId ||
      !payload.attendeeId ||
      typeof payload.exp !== "number" ||
      payload.exp < Date.now()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function resolveStoredDisplayName(
  storedName: string,
  storedTokenIdentifier: string | undefined,
  viewerIdentity: ViewerIdentity | null,
) {
  if (!viewerIdentity || !storedTokenIdentifier) {
    return storedName;
  }

  const isViewerRecord =
    storedTokenIdentifier === viewerIdentity.tokenIdentifier;
  if (!isViewerRecord || !isGenericDisplayName(storedName)) {
    return storedName;
  }

  return resolveIdentityDisplayName(viewerIdentity);
}

async function getUserByTokenIdentifier(
  ctx: Context,
  tokenIdentifier: string | undefined,
) {
  if (!tokenIdentifier) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();
}

async function resolveStoredDisplayNameWithUserLookup(
  ctx: Context,
  storedName: string,
  storedTokenIdentifier: string | undefined,
  viewerIdentity: ViewerIdentity | null,
) {
  const resolvedFromViewer = resolveStoredDisplayName(
    storedName,
    storedTokenIdentifier,
    viewerIdentity,
  );

  if (!storedTokenIdentifier) {
    return resolvedFromViewer;
  }

  const linkedUser = await getUserByTokenIdentifier(ctx, storedTokenIdentifier);

  if (linkedUser?.name?.trim()) {
    return linkedUser.name;
  }

  if (isGenericDisplayName(resolvedFromViewer)) {
    return emailUsername(linkedUser?.email) ?? resolvedFromViewer;
  }

  return resolvedFromViewer;
}

async function resolveUploaderDisplayName(
  ctx: Context,
  identity: ViewerIdentity,
) {
  const tokenIdentifier = identity.tokenIdentifier;

  if (!tokenIdentifier) {
    return resolveIdentityDisplayName(identity);
  }

  const uploaderUser = await getUserByTokenIdentifier(ctx, tokenIdentifier);

  if (uploaderUser?.name?.trim()) {
    return uploaderUser.name;
  }

  return (
    emailUsername(uploaderUser?.email) ?? resolveIdentityDisplayName(identity)
  );
}

function normalizeCounter(value: number | undefined) {
  return value ?? 0;
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as T;
}

function isGoing(status: AttendeeDoc["rsvpStatus"]) {
  return status === "going";
}

async function requireIdentity(ctx: Context) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }

  return identity as ViewerIdentity;
}

async function getEventOrThrow(ctx: Context, eventId: Id<"events">) {
  const event = await ctx.db.get(eventId);
  if (!event) {
    throw new Error("Event not found");
  }

  return event;
}

async function assertHost(ctx: MutationCtx, eventId: Id<"events">) {
  const identity = await requireIdentity(ctx);
  const event = await getEventOrThrow(ctx, eventId);

  if (event.hostId !== identity.tokenIdentifier) {
    throw new Error("Only the host can update this event");
  }

  return { identity, event };
}

async function requireHostAccess(ctx: Context, eventId: Id<"events">) {
  const identity = await requireIdentity(ctx);
  const event = await getEventOrThrow(ctx, eventId);

  if (event.hostId !== identity.tokenIdentifier) {
    throw new Error("Only the host can view this data");
  }

  return { identity, event };
}

async function getSignedAccessAttendee(
  ctx: Context,
  eventId: Id<"events">,
  accessToken: string | null | undefined,
) {
  const payload = await verifyEventAccessToken(accessToken);
  if (!payload || payload.eventId !== eventId) {
    return null;
  }

  const attendee = await ctx.db.get(payload.attendeeId as Id<"attendees">);
  if (!attendee || attendee.eventId !== eventId) {
    return null;
  }

  return attendee;
}

async function resolveEventActor(
  ctx: Context,
  eventId: Id<"events">,
  accessToken?: string | null,
): Promise<EventActor> {
  const event = await getEventOrThrow(ctx, eventId);
  const identity = (await ctx.auth.getUserIdentity()) as ViewerIdentity | null;
  const baseIdentityName = identity
    ? await resolveUploaderDisplayName(ctx, identity)
    : "Guest";

  if (identity?.tokenIdentifier === event.hostId) {
    const hostIdentity = identity!;
    return {
      event,
      identity: hostIdentity,
      attendee: null,
      isHost: true,
      isMember: true,
      tokenIdentifier: hostIdentity.tokenIdentifier,
      displayName: baseIdentityName,
      avatar: hostIdentity.pictureUrl ?? avatarFallback(baseIdentityName),
      email: hostIdentity.email ?? null,
    };
  }

  if (identity?.tokenIdentifier) {
    const attendee = await ctx.db
      .query("attendees")
      .withIndex("by_event_and_userTokenIdentifier", (q) =>
        q
          .eq("eventId", eventId)
          .eq("userTokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (attendee) {
      const memberIdentity = identity!;
      return {
        event,
        identity: memberIdentity,
        attendee,
        isHost: false,
        isMember: true,
        tokenIdentifier: memberIdentity.tokenIdentifier,
        displayName: baseIdentityName,
        avatar:
          memberIdentity.pictureUrl ??
          attendee.avatar ??
          avatarFallback(baseIdentityName),
        email: memberIdentity.email ?? attendee.email ?? null,
      };
    }
  }

  const attendee = await getSignedAccessAttendee(ctx, eventId, accessToken);
  if (attendee) {
    const displayName = await resolveStoredDisplayNameWithUserLookup(
      ctx,
      attendee.name,
      attendee.userTokenIdentifier,
      identity,
    );

    return {
      event,
      identity,
      attendee,
      isHost: false,
      isMember: true,
      tokenIdentifier:
        attendee.userTokenIdentifier ??
        (attendee.email ? getGuestTokenIdentifier(attendee.email) : null) ??
        identity?.tokenIdentifier ??
        null,
      displayName,
      avatar: attendee.avatar ?? avatarFallback(displayName),
      email: attendee.email ?? identity?.email ?? null,
    };
  }

  return {
    event,
    identity,
    attendee: null,
    isHost: false,
    isMember: false,
    tokenIdentifier: identity?.tokenIdentifier ?? null,
    displayName: baseIdentityName,
    avatar: identity?.pictureUrl ?? avatarFallback(baseIdentityName),
    email: identity?.email ?? null,
  };
}

async function requireEventMember(
  ctx: Context,
  eventId: Id<"events">,
  accessToken?: string | null,
) {
  const actor = await resolveEventActor(ctx, eventId, accessToken);
  if (!actor.isMember) {
    throw new Error("Event access requires a valid RSVP");
  }

  return actor;
}

async function assertHostOrBringItemCreator(
  ctx: MutationCtx,
  bringItemId: Id<"bringItems">,
  accessToken?: string | null,
) {
  const item = await ctx.db.get(bringItemId);

  if (!item) {
    throw new Error("Bring item not found");
  }

  const actor = await requireEventMember(ctx, item.eventId, accessToken);
  const event = actor.event;
  const canEdit =
    actor.isHost ||
    (Boolean(actor.tokenIdentifier) &&
      item.createdByTokenIdentifier === actor.tokenIdentifier);

  if (!canEdit) {
    throw new Error(
      "Only the event host or bring-list creator can edit this item",
    );
  }

  return { actor, item, event };
}

async function resolveCoverImageUrl(ctx: Context, event: EventDoc) {
  if (event.coverImageStorageId) {
    const storageUrl = await ctx.storage.getUrl(event.coverImageStorageId);
    if (storageUrl) {
      return storageUrl;
    }
  }

  return event.coverImage;
}

async function serializeAttendeePreview(
  ctx: Context,
  attendee: AttendeeDoc,
  viewerIdentity: {
    tokenIdentifier: string;
    name?: string | null;
    nickname?: string | null;
    email?: string | null;
  } | null = null,
) {
  const resolvedName = await resolveStoredDisplayNameWithUserLookup(
    ctx,
    attendee.name,
    attendee.userTokenIdentifier,
    viewerIdentity,
  );

  return {
    id: attendee._id,
    name: resolvedName,
    avatar: attendee.avatar ?? avatarFallback(resolvedName),
    rsvpStatus: attendee.rsvpStatus,
    plusOne: attendee.plusOne,
    plusOneName: attendee.plusOneName,
  };
}

async function serializeEventCard(
  ctx: Context,
  event: EventDoc,
  viewerIdentity: ViewerIdentity | null = null,
) {
  const attendees = await ctx.db
    .query("attendees")
    .withIndex("by_event_and_rsvpStatus", (q) =>
      q.eq("eventId", event._id).eq("rsvpStatus", "going"),
    )
    .order("desc")
    .take(4);
  const hostUser = await getUserByTokenIdentifier(ctx, event.hostId);

  return {
    _id: event._id,
    _creationTime: event._creationTime,
    title: event.title,
    description: event.description,
    date: event.date,
    time: event.time,
    location: event.location,
    coverImage: await resolveCoverImageUrl(ctx, event),
    vibe: event.vibe,
    category: event.category ?? "General",
    hostName: hostUser?.name ?? event.hostName,
    hostAvatar: hostUser?.avatar ?? event.hostAvatar,
    isPublic: event.isPublic,
    allowPlusOne: event.allowPlusOne,
    attendeeCount: normalizeCounter(event.attendeeCount),
    commentCount: normalizeCounter(event.commentCount),
    photoCount: normalizeCounter(event.photoCount),
    likeCount: normalizeCounter(event.likeCount),
    attendees: await Promise.all(
      attendees.map((attendee) =>
        serializeAttendeePreview(ctx, attendee, viewerIdentity),
      ),
    ),
  };
}

function matchesSearch(event: EventDoc, searchText: string) {
  const normalizedSearch = searchText.trim().toLowerCase();
  if (!normalizedSearch) {
    return true;
  }

  const haystack = [
    event.title,
    event.description ?? "",
    event.location,
    event.vibe,
    event.category ?? "",
    event.hostName,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedSearch);
}

async function adjustEventCounter(
  ctx: MutationCtx,
  eventId: Id<"events">,
  field: "attendeeCount" | "commentCount" | "photoCount" | "likeCount",
  delta: number,
) {
  const event = await getEventOrThrow(ctx, eventId);
  await ctx.db.patch(eventId, {
    [field]: Math.max(0, normalizeCounter(event[field]) + delta),
  });
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    await assertCanImageUpdate(ctx, identity.tokenIdentifier);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getEvents = query({
  args: {
    category: v.optional(v.string()),
    searchText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_isPublic", (q) => q.eq("isPublic", true))
      .order("desc")
      .take(30);

    const filteredEvents = events.filter((event) => {
      const matchesCategory =
        !args.category ||
        args.category === "All" ||
        event.category === args.category;
      return matchesCategory && matchesSearch(event, args.searchText ?? "");
    });

    return await Promise.all(
      filteredEvents.map((event) => serializeEventCard(ctx, event)),
    );
  },
});

export const getFeedEvents = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const hostedEvents = await ctx.db
      .query("events")
      .withIndex("by_hostId", (q) => q.eq("hostId", identity.tokenIdentifier))
      .order("desc")
      .take(10);
    const memberRsvps = await ctx.db
      .query("attendees")
      .withIndex("by_userTokenIdentifier", (q) =>
        q.eq("userTokenIdentifier", identity.tokenIdentifier),
      )
      .order("desc")
      .take(20);

    const eventsById = new Map<Id<"events">, EventDoc>();
    for (const event of hostedEvents) {
      eventsById.set(event._id, event);
    }

    for (const attendee of memberRsvps) {
      if (
        attendee.rsvpStatus === "not-going" ||
        eventsById.has(attendee.eventId)
      ) {
        continue;
      }

      const event = await ctx.db.get(attendee.eventId);
      if (event) {
        eventsById.set(event._id, event);
      }
    }

    const mergedEvents = [...eventsById.values()].sort(
      (left, right) => right._creationTime - left._creationTime,
    );
    const fallbackEvents =
      mergedEvents.length > 0
        ? mergedEvents
        : await ctx.db
            .query("events")
            .withIndex("by_isPublic", (q) => q.eq("isPublic", true))
            .order("desc")
            .take(10);

    return await Promise.all(
      fallbackEvents
        .slice(0, 12)
        .map((event) => serializeEventCard(ctx, event, identity)),
    );
  },
});

export const getEventRsvpDetails = query({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event) {
      return null;
    }

    const hostUser = await getUserByTokenIdentifier(ctx, event.hostId);
    const attendees = await ctx.db
      .query("attendees")
      .withIndex("by_event_and_rsvpStatus", (q) =>
        q.eq("eventId", args.id).eq("rsvpStatus", "going"),
      )
      .order("desc")
      .take(24);

    return {
      _id: event._id,
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      coverImage: await resolveCoverImageUrl(ctx, event),
      vibe: event.vibe,
      hostName: hostUser?.name ?? event.hostName,
      hostAvatar: hostUser?.avatar ?? event.hostAvatar,
      allowPlusOne: event.allowPlusOne,
      attendeeCount: normalizeCounter(event.attendeeCount),
      attendees: await Promise.all(
        attendees.map((attendee) => serializeAttendeePreview(ctx, attendee)),
      ),
    };
  },
});

export const getEventById = query({
  args: {
    id: v.id("events"),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await resolveEventActor(ctx, args.id, args.accessToken);
    const event = actor.event;
    if (!event || (!actor.identity && !actor.isMember)) {
      return null;
    }
    const hostUser = await getUserByTokenIdentifier(ctx, event.hostId);
    const attendees = await ctx.db
      .query("attendees")
      .withIndex("by_event_and_rsvpStatus", (q) =>
        q.eq("eventId", args.id).eq("rsvpStatus", "going"),
      )
      .order("desc")
      .take(24);
    const currentUserRsvp = actor.attendee;
    const currentEventLike = actor.tokenIdentifier
      ? await ctx.db
          .query("eventLikes")
          .withIndex("by_event_and_userTokenIdentifier", (q) =>
            q
              .eq("eventId", args.id)
              .eq("userTokenIdentifier", actor.tokenIdentifier as string),
          )
          .unique()
      : null;

    return {
      _id: event._id,
      _creationTime: event._creationTime,
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      coverImage: await resolveCoverImageUrl(ctx, event),
      vibe: event.vibe,
      category: event.category ?? "General",
      hostName: hostUser?.name ?? event.hostName,
      hostAvatar: hostUser?.avatar ?? event.hostAvatar,
      hostEmail: event.hostEmail ?? hostUser?.email,
      viewerEmail: actor.email,
      isPublic: event.isPublic,
      allowPlusOne: event.allowPlusOne,
      attendeeCount: normalizeCounter(event.attendeeCount),
      commentCount: normalizeCounter(event.commentCount),
      photoCount: normalizeCounter(event.photoCount),
      likeCount: normalizeCounter(event.likeCount),
      isHost: actor.isHost,
      isMember: actor.isMember,
      viewerCanInteract: actor.isMember,
      viewerCanOpenPlan: actor.isMember,
      viewerHasLiked: Boolean(currentEventLike),
      currentUserRsvp: currentUserRsvp
        ? {
            id: currentUserRsvp._id,
            rsvpStatus: currentUserRsvp.rsvpStatus,
            plusOne: currentUserRsvp.plusOne,
            plusOneName: currentUserRsvp.plusOneName,
          }
        : null,
      attendees: await Promise.all(
        attendees.map((attendee) =>
          serializeAttendeePreview(ctx, attendee, actor.identity),
        ),
      ),
    };
  },
});

export const getComments = query({
  args: {
    eventId: v.id("events"),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await resolveEventActor(ctx, args.eventId, args.accessToken);
    if (!actor.isMember) {
      return [];
    }

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .take(50);
    const reactions = await ctx.db
      .query("commentReactions")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .take(250);

    const reactionsByComment = new Map<
      Id<"comments">,
      Map<string, { count: number; viewerHasReacted: boolean }>
    >();

    for (const reaction of reactions) {
      const currentCommentReactions =
        reactionsByComment.get(reaction.commentId) ??
        new Map<
          string,
          {
            count: number;
            viewerHasReacted: boolean;
          }
        >();
      const currentEmojiSummary = currentCommentReactions.get(
        reaction.emoji,
      ) ?? {
        count: 0,
        viewerHasReacted: false,
      };

      currentCommentReactions.set(reaction.emoji, {
        count: currentEmojiSummary.count + 1,
        viewerHasReacted:
          currentEmojiSummary.viewerHasReacted ||
          reaction.userTokenIdentifier === actor.tokenIdentifier,
      });
      reactionsByComment.set(reaction.commentId, currentCommentReactions);
    }

    return await Promise.all(
      comments.map(async (comment) => {
        const resolvedUserName = await resolveStoredDisplayNameWithUserLookup(
          ctx,
          comment.userName,
          comment.userId,
          actor.identity,
        );
        const summaries = reactionsByComment.get(comment._id);
        const reactionSummary = MEMBER_REACTION_EMOJIS.map((emoji) => {
          const summary = summaries?.get(emoji);
          return {
            emoji,
            count: summary?.count ?? 0,
            viewerHasReacted: summary?.viewerHasReacted ?? false,
          };
        });

        return {
          _id: comment._id,
          _creationTime: comment._creationTime,
          userName: resolvedUserName,
          userAvatar: comment.userAvatar || avatarFallback(resolvedUserName),
          text: comment.text,
          timestamp: comment.timestamp,
          reactions: reactionSummary,
        };
      }),
    );
  },
});

export const addComment = mutation({
  args: {
    eventId: v.id("events"),
    text: v.string(),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireEventMember(ctx, args.eventId, args.accessToken);

    const commentId = await ctx.db.insert("comments", {
      eventId: args.eventId,
      userId: actor.tokenIdentifier ?? undefined,
      userName: actor.displayName,
      userAvatar: actor.avatar,
      text: args.text,
      timestamp: new Date().toISOString(),
    });

    await adjustEventCounter(ctx, args.eventId, "commentCount", 1);

    return commentId;
  },
});

export const toggleCommentReaction = mutation({
  args: {
    commentId: v.id("comments"),
    emoji: reactionEmojiValidator,
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);

    if (!comment) {
      throw new Error("Comment not found");
    }

    const actor = await requireEventMember(
      ctx,
      comment.eventId,
      args.accessToken,
    );
    if (!actor.tokenIdentifier) {
      throw new Error("Unable to resolve event member identity");
    }
    const tokenIdentifier = actor.tokenIdentifier;

    const existingReaction = await ctx.db
      .query("commentReactions")
      .withIndex("by_comment_and_userTokenIdentifier_and_emoji", (q) =>
        q
          .eq("commentId", args.commentId)
          .eq("userTokenIdentifier", tokenIdentifier)
          .eq("emoji", args.emoji),
      )
      .unique();

    if (existingReaction) {
      await ctx.db.delete(existingReaction._id);
      return { reacted: false };
    }

    await ctx.db.insert("commentReactions", {
      commentId: args.commentId,
      eventId: comment.eventId,
      emoji: args.emoji,
      userTokenIdentifier: tokenIdentifier,
      userName: actor.displayName,
    });

    return { reacted: true };
  },
});

export const getGalleryPhotos = query({
  args: {
    eventId: v.id("events"),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await resolveEventActor(ctx, args.eventId, args.accessToken);
    const canViewImages =
      actor.isMember ||
      (Boolean(actor.identity?.tokenIdentifier) &&
        (await canUserViewEventImages(
          ctx,
          actor.identity?.tokenIdentifier as string,
        )));
    if (!canViewImages) {
      return [];
    }

    const photos = await ctx.db
      .query("galleryPhotos")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .take(40);

    return (
      await Promise.all(
        photos.map(async (photo) => {
          const url = await ctx.storage.getUrl(photo.storageId);
          if (!url) {
            return null;
          }

          return {
            _id: photo._id,
            url,
            caption: photo.caption,
            uploadedByName: await resolveStoredDisplayNameWithUserLookup(
              ctx,
              photo.uploadedByName,
              photo.uploadedByTokenIdentifier,
              actor.identity,
            ),
            _creationTime: photo._creationTime,
          };
        }),
      )
    ).filter((photo): photo is NonNullable<typeof photo> => photo !== null);
  },
});

export const addGalleryPhoto = mutation({
  args: {
    eventId: v.id("events"),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertCanImageUpdate(ctx, identity.tokenIdentifier);
    const uploaderDisplayName = await resolveUploaderDisplayName(ctx, identity);

    const photoId = await ctx.db.insert("galleryPhotos", {
      ...omitUndefined({
        eventId: args.eventId,
        storageId: args.storageId,
        uploadedByTokenIdentifier: identity.tokenIdentifier,
        uploadedByName: uploaderDisplayName,
        caption: args.caption,
      }),
    });

    await recordUploadedPhoto(ctx, identity.tokenIdentifier);
    await adjustEventCounter(ctx, args.eventId, "photoCount", 1);

    return photoId;
  },
});

export const toggleEventLike = mutation({
  args: {
    eventId: v.id("events"),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireEventMember(ctx, args.eventId, args.accessToken);
    if (!actor.tokenIdentifier) {
      throw new Error("Unable to resolve event member identity");
    }
    const tokenIdentifier = actor.tokenIdentifier;

    const existingLike = await ctx.db
      .query("eventLikes")
      .withIndex("by_event_and_userTokenIdentifier", (q) =>
        q
          .eq("eventId", args.eventId)
          .eq("userTokenIdentifier", tokenIdentifier),
      )
      .unique();

    if (existingLike) {
      await ctx.db.delete(existingLike._id);
      await adjustEventCounter(ctx, args.eventId, "likeCount", -1);
      const event = await getEventOrThrow(ctx, args.eventId);
      return {
        liked: false,
        likeCount: normalizeCounter(event.likeCount),
      };
    }

    await ctx.db.insert("eventLikes", {
      eventId: args.eventId,
      userTokenIdentifier: tokenIdentifier,
      userName: actor.displayName,
    });
    await adjustEventCounter(ctx, args.eventId, "likeCount", 1);

    const event = await getEventOrThrow(ctx, args.eventId);
    return {
      liked: true,
      likeCount: normalizeCounter(event.likeCount),
    };
  },
});

export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
    time: v.string(),
    location: v.string(),
    coverImage: v.string(),
    coverImageStorageId: v.optional(v.id("_storage")),
    vibe: v.string(),
    category: v.optional(v.string()),
    isPublic: v.boolean(),
    allowPlusOne: v.boolean(),
    hostName: v.string(),
    hostAvatar: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    await assertAndConsumeEventCreation(ctx, identity.tokenIdentifier);
    const hostName = await resolveUploaderDisplayName(ctx, identity);

    return await ctx.db.insert(
      "events",
      omitUndefined({
        ...args,
        category: args.category ?? "General",
        hostName,
        hostAvatar: identity.pictureUrl ?? args.hostAvatar,
        hostEmail: identity.email ?? undefined,
        hostId: identity.tokenIdentifier,
        attendeeCount: 0,
        commentCount: 0,
        photoCount: 0,
        likeCount: 0,
      }),
    );
  },
});

export const getAttendees = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const { identity } = await requireHostAccess(ctx, args.eventId);
    const attendees = await ctx.db
      .query("attendees")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .take(100);

    return await Promise.all(
      attendees.map(async (attendee) => {
        const resolvedName = await resolveStoredDisplayNameWithUserLookup(
          ctx,
          attendee.name,
          attendee.userTokenIdentifier,
          identity,
        );

        return {
          _id: attendee._id,
          name: resolvedName,
          email: attendee.email,
          avatar: attendee.avatar ?? avatarFallback(resolvedName),
          rsvpStatus: attendee.rsvpStatus,
          responseSource: attendee.responseSource,
          plusOne: attendee.plusOne,
          plusOneName: attendee.plusOneName,
          dietaryRestrictions: attendee.dietaryRestrictions,
        };
      }),
    );
  },
});

export const upsertMemberRsvp = mutation({
  args: {
    eventId: v.id("events"),
    rsvpStatus: rsvpStatusValidator,
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const existingRsvp = await ctx.db
      .query("attendees")
      .withIndex("by_event_and_userTokenIdentifier", (q) =>
        q
          .eq("eventId", args.eventId)
          .eq("userTokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    const memberName = await resolveUploaderDisplayName(ctx, identity);
    const memberAvatar = identity.pictureUrl ?? avatarFallback(memberName);

    if (existingRsvp) {
      const previousGoing = isGoing(existingRsvp.rsvpStatus);
      const nextGoing = isGoing(args.rsvpStatus);

      await ctx.db.patch(existingRsvp._id, {
        ...omitUndefined({
          name: memberName,
          email: identity.email ?? undefined,
          avatar: memberAvatar,
          rsvpStatus: args.rsvpStatus,
          responseSource: "member",
        }),
      });

      await adjustEventCounter(
        ctx,
        args.eventId,
        "attendeeCount",
        Number(nextGoing) - Number(previousGoing),
      );

      return existingRsvp._id;
    }

    const attendeeId = await ctx.db.insert(
      "attendees",
      omitUndefined({
        eventId: args.eventId,
        name: memberName,
        email: identity.email ?? undefined,
        avatar: memberAvatar,
        rsvpStatus: args.rsvpStatus,
        plusOne: false,
        userTokenIdentifier: identity.tokenIdentifier,
        responseSource: "member",
      }),
    );

    if (isGoing(args.rsvpStatus)) {
      await adjustEventCounter(ctx, args.eventId, "attendeeCount", 1);
    }

    return attendeeId;
  },
});

export const submitGuestRsvp = mutation({
  args: {
    eventId: v.id("events"),
    name: v.string(),
    email: v.string(),
    rsvpStatus: rsvpStatusValidator,
    plusOne: v.boolean(),
    plusOneName: v.optional(v.string()),
    dietaryRestrictions: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const event = await getEventOrThrow(ctx, args.eventId);
    const normalizedEmail = normalizeEmail(args.email);
    if (!normalizedEmail) {
      throw new Error("Email is required to RSVP");
    }

    const guestTokenIdentifier = getGuestTokenIdentifier(normalizedEmail);
    const guestAvatar = args.avatar ?? avatarFallback(args.name);
    const existingGuestUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", guestTokenIdentifier),
      )
      .unique();

    if (existingGuestUser) {
      await ctx.db.patch(
        existingGuestUser._id,
        omitUndefined({
          name: args.name,
          email: normalizedEmail,
          avatar: guestAvatar,
          isAnonymous: true,
        }),
      );
    } else {
      await ctx.db.insert("users", {
        name: args.name,
        email: normalizedEmail,
        avatar: guestAvatar,
        tokenIdentifier: guestTokenIdentifier,
        isAnonymous: true,
      });
    }

    const existingGuestRsvps = await ctx.db
      .query("attendees")
      .withIndex("by_event_and_email", (q) =>
        q.eq("eventId", args.eventId).eq("email", normalizedEmail),
      )
      .collect();
    const existingRsvp = existingGuestRsvps[0] ?? null;

    if (existingRsvp) {
      const previousGoing = isGoing(existingRsvp.rsvpStatus);
      const nextGoing = isGoing(args.rsvpStatus);

      await ctx.db.patch(
        existingRsvp._id,
        omitUndefined({
          name: args.name,
          email: normalizedEmail,
          avatar: guestAvatar,
          rsvpStatus: args.rsvpStatus,
          plusOne: event.allowPlusOne ? args.plusOne : false,
          plusOneName: event.allowPlusOne ? args.plusOneName : undefined,
          dietaryRestrictions: args.dietaryRestrictions,
          userTokenIdentifier:
            existingRsvp.userTokenIdentifier ?? guestTokenIdentifier,
          responseSource: "guest",
        }),
      );

      await adjustEventCounter(
        ctx,
        args.eventId,
        "attendeeCount",
        Number(nextGoing) - Number(previousGoing),
      );

      return existingRsvp._id;
    }

    const attendeeId = await ctx.db.insert("attendees", {
      eventId: args.eventId,
      name: args.name,
      email: normalizedEmail,
      avatar: guestAvatar,
      rsvpStatus: args.rsvpStatus,
      plusOne: event.allowPlusOne ? args.plusOne : false,
      plusOneName: event.allowPlusOne ? args.plusOneName : undefined,
      dietaryRestrictions: args.dietaryRestrictions,
      userTokenIdentifier: guestTokenIdentifier,
      responseSource: "guest",
    });

    if (isGoing(args.rsvpStatus)) {
      await adjustEventCounter(ctx, args.eventId, "attendeeCount", 1);
    }

    return attendeeId;
  },
});

export const getAttendeePass = query({
  args: {
    eventId: v.id("events"),
    attendeeId: v.id("attendees"),
  },
  handler: async (ctx, args) => {
    const attendee = await ctx.db.get(args.attendeeId);
    if (!attendee || attendee.eventId !== args.eventId) {
      return null;
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      return null;
    }
    const resolvedAttendeeName = await resolveStoredDisplayNameWithUserLookup(
      ctx,
      attendee.name,
      attendee.userTokenIdentifier,
      null,
    );
    const hostUser = await getUserByTokenIdentifier(ctx, event.hostId);
    const eventAccessToken = await signEventAccessToken({
      eventId: event._id,
      attendeeId: attendee._id,
      exp: Date.now() + EVENT_ACCESS_TOKEN_TTL_MS,
    });

    return {
      attendee: {
        _id: attendee._id,
        name: resolvedAttendeeName,
        email: attendee.email,
        avatar: attendee.avatar ?? avatarFallback(resolvedAttendeeName),
        rsvpStatus: attendee.rsvpStatus,
        plusOne: attendee.plusOne,
        plusOneName: attendee.plusOneName,
      },
      event: {
        _id: event._id,
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
        coverImage: await resolveCoverImageUrl(ctx, event),
        hostName: hostUser?.name ?? event.hostName,
        hostAvatar: hostUser?.avatar ?? event.hostAvatar,
      },
      eventAccessToken,
      qrValue: `${event._id}:${attendee._id}`,
    };
  },
});

export const getTasks = query({
  args: {
    eventId: v.id("events"),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireEventMember(ctx, args.eventId, args.accessToken);
    return await ctx.db
      .query("tasks")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .take(50);
  },
});

export const addTask = mutation({
  args: {
    eventId: v.id("events"),
    text: v.string(),
    assignee: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertHost(ctx, args.eventId);
    return await ctx.db.insert(
      "tasks",
      omitUndefined({
        eventId: args.eventId,
        text: args.text,
        completed: false,
        assignee: args.assignee,
      }),
    );
  },
});

export const toggleTaskCompleted = mutation({
  args: { id: v.id("tasks"), completed: v.boolean() },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) {
      throw new Error("Task not found");
    }

    await assertHost(ctx, task.eventId);
    await ctx.db.patch(args.id, { completed: args.completed });
    return args.id;
  },
});

export const updateTask = mutation({
  args: {
    id: v.id("tasks"),
    text: v.string(),
    assignee: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) {
      throw new Error("Task not found");
    }

    await assertHost(ctx, task.eventId);
    await ctx.db.patch(args.id, {
      text: args.text,
      assignee: args.assignee,
    });

    return args.id;
  },
});

export const deleteTask = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) {
      throw new Error("Task not found");
    }

    await assertHost(ctx, task.eventId);
    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const getBudgetItems = query({
  args: {
    eventId: v.id("events"),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireEventMember(ctx, args.eventId, args.accessToken);
    return await ctx.db
      .query("budgetItems")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .take(50);
  },
});

export const addBudgetItem = mutation({
  args: {
    eventId: v.id("events"),
    label: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    await assertHost(ctx, args.eventId);
    return await ctx.db.insert("budgetItems", {
      eventId: args.eventId,
      label: args.label,
      amount: args.amount,
      paid: false,
    });
  },
});

export const toggleBudgetItemPaid = mutation({
  args: {
    id: v.id("budgetItems"),
    paid: v.boolean(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Budget item not found");
    }

    await assertHost(ctx, item.eventId);
    await ctx.db.patch(args.id, { paid: args.paid });
    return args.id;
  },
});

export const deleteBudgetItem = mutation({
  args: { id: v.id("budgetItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Budget item not found");
    }

    await assertHost(ctx, item.eventId);
    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const getBringItems = query({
  args: {
    eventId: v.id("events"),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireEventMember(ctx, args.eventId, args.accessToken);
    const items = await ctx.db
      .query("bringItems")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .take(50);

    return await Promise.all(
      items.map(async (item) => ({
        ...item,
        canEdit:
          actor.isHost ||
          (Boolean(actor.tokenIdentifier) &&
            item.createdByTokenIdentifier === actor.tokenIdentifier),
        claimedByName: item.claimedByName
          ? await resolveStoredDisplayNameWithUserLookup(
              ctx,
              item.claimedByName,
              item.claimedByTokenIdentifier,
              actor.identity,
            )
          : undefined,
        createdByName: item.createdByName
          ? await resolveStoredDisplayNameWithUserLookup(
              ctx,
              item.createdByName,
              item.createdByTokenIdentifier,
              actor.identity,
            )
          : undefined,
      })),
    );
  },
});

export const addBringItem = mutation({
  args: {
    eventId: v.id("events"),
    label: v.string(),
    notes: v.optional(v.string()),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireEventMember(ctx, args.eventId, args.accessToken);
    if (!actor.tokenIdentifier) {
      throw new Error("Unable to resolve event member identity");
    }

    return await ctx.db.insert(
      "bringItems",
      omitUndefined({
        eventId: args.eventId,
        label: args.label,
        notes: args.notes,
        createdByTokenIdentifier: actor.tokenIdentifier,
        createdByName: actor.displayName,
      }),
    );
  },
});

export const updateBringItem = mutation({
  args: {
    id: v.id("bringItems"),
    label: v.string(),
    notes: v.optional(v.string()),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertHostOrBringItemCreator(ctx, args.id, args.accessToken);
    await ctx.db.patch(args.id, {
      label: args.label,
      notes: args.notes,
    });
    return args.id;
  },
});

export const deleteBringItem = mutation({
  args: {
    id: v.id("bringItems"),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertHostOrBringItemCreator(ctx, args.id, args.accessToken);
    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const toggleBringItemClaim = mutation({
  args: {
    id: v.id("bringItems"),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);

    if (!item) {
      throw new Error("Bring item not found");
    }

    const actor = await requireEventMember(ctx, item.eventId, args.accessToken);
    if (!actor.tokenIdentifier) {
      throw new Error("Unable to resolve event member identity");
    }

    if (
      item.claimedByTokenIdentifier &&
      item.claimedByTokenIdentifier !== actor.tokenIdentifier
    ) {
      throw new Error("This item is already claimed");
    }

    const nextClaimedByCurrentUser =
      item.claimedByTokenIdentifier !== actor.tokenIdentifier;

    await ctx.db.patch(args.id, {
      claimedByName: nextClaimedByCurrentUser ? actor.displayName : undefined,
      claimedByTokenIdentifier: nextClaimedByCurrentUser
        ? actor.tokenIdentifier
        : undefined,
      claimedAt: nextClaimedByCurrentUser ? Date.now() : undefined,
    });

    return { claimed: nextClaimedByCurrentUser };
  },
});

export const getTimelineItems = query({
  args: {
    eventId: v.id("events"),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireEventMember(ctx, args.eventId, args.accessToken);
    return await ctx.db
      .query("timelineItems")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .take(50);
  },
});

export const addTimelineItem = mutation({
  args: {
    eventId: v.id("events"),
    timeLabel: v.string(),
    title: v.string(),
    details: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertHost(ctx, args.eventId);
    return await ctx.db.insert(
      "timelineItems",
      omitUndefined({
        eventId: args.eventId,
        timeLabel: args.timeLabel,
        title: args.title,
        details: args.details,
        icon: args.icon ?? "event",
        completed: false,
      }),
    );
  },
});

export const toggleTimelineItemCompleted = mutation({
  args: {
    id: v.id("timelineItems"),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Timeline item not found");
    }

    await assertHost(ctx, item.eventId);
    await ctx.db.patch(args.id, { completed: args.completed });
    return args.id;
  },
});

export const updateTimelineItem = mutation({
  args: {
    id: v.id("timelineItems"),
    timeLabel: v.string(),
    title: v.string(),
    details: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Timeline item not found");
    }

    await assertHost(ctx, item.eventId);
    await ctx.db.patch(
      args.id,
      omitUndefined({
        timeLabel: args.timeLabel,
        title: args.title,
        details: args.details,
        icon: args.icon,
      }),
    );

    return args.id;
  },
});

export const deleteTimelineItem = mutation({
  args: {
    id: v.id("timelineItems"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Timeline item not found");
    }

    await assertHost(ctx, item.eventId);
    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const getProfileData = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const hostedEvents = await ctx.db
      .query("events")
      .withIndex("by_hostId", (q) => q.eq("hostId", identity.tokenIdentifier))
      .order("desc")
      .take(10);
    const attendeeRows = await ctx.db
      .query("attendees")
      .withIndex("by_userTokenIdentifier", (q) =>
        q.eq("userTokenIdentifier", identity.tokenIdentifier),
      )
      .order("desc")
      .take(20);

    const attendingEventIds = [
      ...new Set(
        attendeeRows
          .filter((attendee) => attendee.rsvpStatus !== "not-going")
          .map((attendee) => attendee.eventId),
      ),
    ];
    const attendingEvents: EventDoc[] = [];
    for (const eventId of attendingEventIds) {
      const event = await ctx.db.get(eventId);
      if (event) {
        attendingEvents.push(event);
      }
    }

    const hostedSerialized = await Promise.all(
      hostedEvents.map((event) => serializeEventCard(ctx, event)),
    );
    const attendingSerialized = await Promise.all(
      attendingEvents
        .filter((event) => event.hostId !== identity.tokenIdentifier)
        .sort((left, right) => right._creationTime - left._creationTime)
        .slice(0, 10)
        .map((event) => serializeEventCard(ctx, event)),
    );

    return {
      hostedEvents: hostedSerialized,
      attendingEvents: attendingSerialized,
      stats: {
        hostedCount: hostedEvents.length,
        attendingCount: attendeeRows.filter(
          (attendee) => attendee.rsvpStatus === "going",
        ).length,
        totalHostedRsvps: hostedEvents.reduce(
          (sum, event) => sum + normalizeCounter(event.attendeeCount),
          0,
        ),
      },
    };
  },
});
