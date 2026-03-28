import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

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

const MEMBER_REACTION_EMOJIS = ["🔥", "🎉", "❤️"] as const;

function avatarFallback(name: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
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

  return identity;
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

async function resolveCoverImageUrl(ctx: Context, event: EventDoc) {
  if (event.coverImageStorageId) {
    const storageUrl = await ctx.storage.getUrl(event.coverImageStorageId);
    if (storageUrl) {
      return storageUrl;
    }
  }

  return event.coverImage;
}

async function serializeAttendeePreview(attendee: AttendeeDoc) {
  return {
    id: attendee._id,
    name: attendee.name,
    avatar: attendee.avatar ?? avatarFallback(attendee.name),
    rsvpStatus: attendee.rsvpStatus,
    plusOne: attendee.plusOne,
    plusOneName: attendee.plusOneName,
  };
}

async function serializeEventCard(ctx: Context, event: EventDoc) {
  const attendees = await ctx.db
    .query("attendees")
    .withIndex("by_event_and_rsvpStatus", (q) =>
      q.eq("eventId", event._id).eq("rsvpStatus", "going"),
    )
    .order("desc")
    .take(4);

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
    hostName: event.hostName,
    hostAvatar: event.hostAvatar,
    isPublic: event.isPublic,
    allowPlusOne: event.allowPlusOne,
    attendeeCount: normalizeCounter(event.attendeeCount),
    commentCount: normalizeCounter(event.commentCount),
    photoCount: normalizeCounter(event.photoCount),
    likeCount: normalizeCounter(event.likeCount),
    attendees: await Promise.all(attendees.map(serializeAttendeePreview)),
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
    await requireIdentity(ctx);
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
        !args.category || args.category === "All" || event.category === args.category;
      return matchesCategory && matchesSearch(event, args.searchText ?? "");
    });

    return await Promise.all(filteredEvents.map((event) => serializeEventCard(ctx, event)));
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
      if (attendee.rsvpStatus === "not-going" || eventsById.has(attendee.eventId)) {
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
      fallbackEvents.slice(0, 12).map((event) => serializeEventCard(ctx, event)),
    );
  },
});

export const getEventById = query({
  args: { id: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event) {
      return null;
    }

    const identity = await ctx.auth.getUserIdentity();
    const attendees = await ctx.db
      .query("attendees")
      .withIndex("by_event_and_rsvpStatus", (q) =>
        q.eq("eventId", args.id).eq("rsvpStatus", "going"),
      )
      .order("desc")
      .take(24);

    const currentUserRsvp = identity
      ? await ctx.db
          .query("attendees")
          .withIndex("by_event_and_userTokenIdentifier", (q) =>
            q.eq("eventId", args.id).eq("userTokenIdentifier", identity.tokenIdentifier),
          )
          .unique()
      : null;
    const currentEventLike = identity
      ? await ctx.db
          .query("eventLikes")
          .withIndex("by_event_and_userTokenIdentifier", (q) =>
            q.eq("eventId", args.id).eq("userTokenIdentifier", identity.tokenIdentifier),
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
      hostName: event.hostName,
      hostAvatar: event.hostAvatar,
      isPublic: event.isPublic,
      allowPlusOne: event.allowPlusOne,
      attendeeCount: normalizeCounter(event.attendeeCount),
      commentCount: normalizeCounter(event.commentCount),
      photoCount: normalizeCounter(event.photoCount),
      likeCount: normalizeCounter(event.likeCount),
      isHost: identity?.tokenIdentifier === event.hostId,
      viewerHasLiked: Boolean(currentEventLike),
      currentUserRsvp: currentUserRsvp
        ? {
            id: currentUserRsvp._id,
            rsvpStatus: currentUserRsvp.rsvpStatus,
            plusOne: currentUserRsvp.plusOne,
            plusOneName: currentUserRsvp.plusOneName,
          }
        : null,
      attendees: await Promise.all(attendees.map(serializeAttendeePreview)),
    };
  },
});

export const getComments = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
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
        reactionsByComment.get(reaction.commentId) ?? new Map<string, {
          count: number;
          viewerHasReacted: boolean;
        }>();
      const currentEmojiSummary = currentCommentReactions.get(reaction.emoji) ?? {
        count: 0,
        viewerHasReacted: false,
      };

      currentCommentReactions.set(reaction.emoji, {
        count: currentEmojiSummary.count + 1,
        viewerHasReacted:
          currentEmojiSummary.viewerHasReacted ||
          reaction.userTokenIdentifier === identity?.tokenIdentifier,
      });
      reactionsByComment.set(reaction.commentId, currentCommentReactions);
    }

    return comments.map((comment) => {
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
        userName: comment.userName,
        userAvatar: comment.userAvatar || avatarFallback(comment.userName),
        text: comment.text,
        timestamp: comment.timestamp,
        reactions: reactionSummary,
      };
    });
  },
});

export const addComment = mutation({
  args: {
    eventId: v.id("events"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const displayName = identity.name ?? identity.nickname ?? "Member";
    const userAvatar = identity.pictureUrl ?? avatarFallback(displayName);

    const commentId = await ctx.db.insert("comments", {
      eventId: args.eventId,
      userId: identity.tokenIdentifier,
      userName: displayName,
      userAvatar,
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
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const comment = await ctx.db.get(args.commentId);

    if (!comment) {
      throw new Error("Comment not found");
    }

    const existingReaction = await ctx.db
      .query("commentReactions")
      .withIndex("by_comment_and_userTokenIdentifier_and_emoji", (q) =>
        q
          .eq("commentId", args.commentId)
          .eq("userTokenIdentifier", identity.tokenIdentifier)
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
      userTokenIdentifier: identity.tokenIdentifier,
      userName: identity.name ?? identity.nickname ?? "Member",
    });

    return { reacted: true };
  },
});

export const getGalleryPhotos = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
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
            uploadedByName: photo.uploadedByName,
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
    const photoId = await ctx.db.insert("galleryPhotos", {
      ...omitUndefined({
        eventId: args.eventId,
        storageId: args.storageId,
        uploadedByTokenIdentifier: identity.tokenIdentifier,
        uploadedByName: identity.name ?? identity.nickname ?? "Member",
        caption: args.caption,
      }),
    });

    await adjustEventCounter(ctx, args.eventId, "photoCount", 1);

    return photoId;
  },
});

export const toggleEventLike = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const existingLike = await ctx.db
      .query("eventLikes")
      .withIndex("by_event_and_userTokenIdentifier", (q) =>
        q.eq("eventId", args.eventId).eq("userTokenIdentifier", identity.tokenIdentifier),
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
      userTokenIdentifier: identity.tokenIdentifier,
      userName: identity.name ?? identity.nickname ?? "Member",
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

    return await ctx.db.insert(
      "events",
      omitUndefined({
        ...args,
        category: args.category ?? "General",
        hostName: identity.name ?? args.hostName,
        hostAvatar: identity.pictureUrl ?? args.hostAvatar,
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
    const attendees = await ctx.db
      .query("attendees")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .take(100);

    return attendees.map((attendee) => ({
      _id: attendee._id,
      name: attendee.name,
      avatar: attendee.avatar ?? avatarFallback(attendee.name),
      rsvpStatus: attendee.rsvpStatus,
      plusOne: attendee.plusOne,
      plusOneName: attendee.plusOneName,
      dietaryRestrictions: attendee.dietaryRestrictions,
    }));
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
        q.eq("eventId", args.eventId).eq("userTokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    const memberName = identity.name ?? identity.nickname ?? "Member";
    const memberAvatar = identity.pictureUrl ?? avatarFallback(memberName);

    if (existingRsvp) {
      const previousGoing = isGoing(existingRsvp.rsvpStatus);
      const nextGoing = isGoing(args.rsvpStatus);

      await ctx.db.patch(existingRsvp._id, {
        ...omitUndefined({
          name: memberName,
          email: identity.email,
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
        email: identity.email,
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
    email: v.optional(v.string()),
    rsvpStatus: rsvpStatusValidator,
    plusOne: v.boolean(),
    plusOneName: v.optional(v.string()),
    dietaryRestrictions: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const event = await getEventOrThrow(ctx, args.eventId);
    const attendeeId = await ctx.db.insert(
      "attendees",
      omitUndefined({
        ...args,
        plusOne: event.allowPlusOne ? args.plusOne : false,
        plusOneName: event.allowPlusOne ? args.plusOneName : undefined,
        avatar: args.avatar ?? avatarFallback(args.name),
        responseSource: "guest",
      }),
    );

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

    return {
      attendee: {
        _id: attendee._id,
        name: attendee.name,
        email: attendee.email,
        avatar: attendee.avatar ?? avatarFallback(attendee.name),
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
        hostName: event.hostName,
        hostAvatar: event.hostAvatar,
      },
      qrValue: `${event._id}:${attendee._id}`,
    };
  },
});

export const getTasks = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
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
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
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
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bringItems")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .take(50);
  },
});

export const addBringItem = mutation({
  args: {
    eventId: v.id("events"),
    label: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertHost(ctx, args.eventId);
    return await ctx.db.insert(
      "bringItems",
      omitUndefined({
        eventId: args.eventId,
        label: args.label,
        notes: args.notes,
      }),
    );
  },
});

export const deleteBringItem = mutation({
  args: { id: v.id("bringItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Bring item not found");
    }

    await assertHost(ctx, item.eventId);
    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const toggleBringItemClaim = mutation({
  args: { id: v.id("bringItems") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const item = await ctx.db.get(args.id);

    if (!item) {
      throw new Error("Bring item not found");
    }

    if (
      item.claimedByTokenIdentifier &&
      item.claimedByTokenIdentifier !== identity.tokenIdentifier
    ) {
      throw new Error("This item is already claimed");
    }

    const nextClaimedByCurrentUser =
      item.claimedByTokenIdentifier !== identity.tokenIdentifier;

    await ctx.db.patch(args.id, {
      claimedByName: nextClaimedByCurrentUser
        ? identity.name ?? identity.nickname ?? "Member"
        : undefined,
      claimedByTokenIdentifier: nextClaimedByCurrentUser
        ? identity.tokenIdentifier
        : undefined,
      claimedAt: nextClaimedByCurrentUser ? Date.now() : undefined,
    });

    return { claimed: nextClaimedByCurrentUser };
  },
});

export const getTimelineItems = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
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

    const attendingEventIds = [...new Set(
      attendeeRows
        .filter((attendee) => attendee.rsvpStatus !== "not-going")
        .map((attendee) => attendee.eventId),
    )];
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
        attendingCount: attendeeRows.filter((attendee) => attendee.rsvpStatus === "going")
          .length,
        totalHostedRsvps: hostedEvents.reduce(
          (sum, event) => sum + normalizeCounter(event.attendeeCount),
          0,
        ),
      },
    };
  },
});
