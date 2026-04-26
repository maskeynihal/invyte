import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  events: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
    time: v.string(),
    location: v.string(),
    coverImage: v.string(),
    coverImageStorageId: v.optional(v.id("_storage")),
    vibe: v.string(),
    category: v.optional(v.string()),
    hostName: v.string(),
    hostAvatar: v.string(),
    hostEmail: v.optional(v.string()),
    isPublic: v.boolean(),
    allowPlusOne: v.boolean(),
    hostId: v.optional(v.string()), // Clerk ID or Convex User ID
    attendeeCount: v.optional(v.number()),
    commentCount: v.optional(v.number()),
    photoCount: v.optional(v.number()),
    likeCount: v.optional(v.number()),
  })
    .index("by_hostId", ["hostId"])
    .index("by_isPublic", ["isPublic"]),

  attendees: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    email: v.optional(v.string()),
    avatar: v.optional(v.string()),
    rsvpStatus: v.union(
      v.literal("going"),
      v.literal("maybe"),
      v.literal("not-going"),
    ),
    plusOne: v.boolean(),
    plusOneName: v.optional(v.string()),
    dietaryRestrictions: v.optional(v.string()),
    userTokenIdentifier: v.optional(v.string()),
    responseSource: v.optional(
      v.union(v.literal("member"), v.literal("guest")),
    ),
  })
    .index("by_event", ["eventId"])
    .index("by_email", ["email"])
    .index("by_event_and_email", ["eventId", "email"])
    .index("by_event_and_rsvpStatus", ["eventId", "rsvpStatus"])
    .index("by_event_and_userTokenIdentifier", [
      "eventId",
      "userTokenIdentifier",
    ])
    .index("by_userTokenIdentifier", ["userTokenIdentifier"]),

  comments: defineTable({
    eventId: v.id("events"),
    userId: v.optional(v.string()),
    userName: v.string(),
    userAvatar: v.string(),
    text: v.string(),
    timestamp: v.string(),
  }).index("by_event", ["eventId"]),

  tasks: defineTable({
    eventId: v.id("events"),
    text: v.string(),
    completed: v.boolean(),
    assignee: v.optional(v.string()),
  }).index("by_event", ["eventId"]),

  budgetItems: defineTable({
    eventId: v.id("events"),
    label: v.string(),
    amount: v.number(),
    paid: v.boolean(),
  }).index("by_event", ["eventId"]),

  bringItems: defineTable({
    eventId: v.id("events"),
    label: v.string(),
    notes: v.optional(v.string()),
    createdByTokenIdentifier: v.optional(v.string()),
    createdByName: v.optional(v.string()),
    claimedByName: v.optional(v.string()),
    claimedByTokenIdentifier: v.optional(v.string()),
    claimedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId"])
    .index("by_event_and_claimedByTokenIdentifier", [
      "eventId",
      "claimedByTokenIdentifier",
    ])
    .index("by_event_and_createdByTokenIdentifier", [
      "eventId",
      "createdByTokenIdentifier",
    ]),

  timelineItems: defineTable({
    eventId: v.id("events"),
    timeLabel: v.string(),
    title: v.string(),
    details: v.optional(v.string()),
    icon: v.optional(v.string()),
    completed: v.boolean(),
  }).index("by_event", ["eventId"]),

  galleryPhotos: defineTable({
    eventId: v.id("events"),
    storageId: v.id("_storage"),
    uploadedByTokenIdentifier: v.string(),
    uploadedByName: v.string(),
    caption: v.optional(v.string()),
  })
    .index("by_event", ["eventId"])
    .index("by_event_and_uploadedByTokenIdentifier", [
      "eventId",
      "uploadedByTokenIdentifier",
    ])
    .index("by_uploadedByTokenIdentifier", ["uploadedByTokenIdentifier"]),

  eventLikes: defineTable({
    eventId: v.id("events"),
    userTokenIdentifier: v.string(),
    userName: v.optional(v.string()),
  })
    .index("by_event", ["eventId"])
    .index("by_event_and_userTokenIdentifier", [
      "eventId",
      "userTokenIdentifier",
    ]),

  commentReactions: defineTable({
    commentId: v.id("comments"),
    eventId: v.id("events"),
    emoji: v.string(),
    userTokenIdentifier: v.string(),
    userName: v.optional(v.string()),
  })
    .index("by_event", ["eventId"])
    .index("by_comment", ["commentId"])
    .index("by_comment_and_userTokenIdentifier_and_emoji", [
      "commentId",
      "userTokenIdentifier",
      "emoji",
    ]),

  users: defineTable({
    name: v.string(),
    email: v.string(),
    avatar: v.optional(v.string()),
    tokenIdentifier: v.string(), // Clerk's user ID
    isAnonymous: v.optional(v.boolean()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"]),

  roles: defineTable({
    key: v.string(),
    name: v.string(),
    isAdmin: v.boolean(),
  })
    .index("by_key", ["key"])
    .index("by_isAdmin", ["isAdmin"]),

  userRoles: defineTable({
    tokenIdentifier: v.string(),
    roleKey: v.string(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_roleKey", ["roleKey"]),

  userPlans: defineTable({
    tokenIdentifier: v.string(),
    planKey: v.string(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_planKey", ["planKey"]),

  userFeatureOverrides: defineTable({
    tokenIdentifier: v.string(),
    canImageUpdate: v.optional(v.boolean()),
    canEventCreation: v.optional(v.boolean()),
    canImageViewFromEvents: v.optional(v.boolean()),
    monthlyEventLimit: v.optional(v.number()),
  }).index("by_token", ["tokenIdentifier"]),

  userUsage: defineTable({
    tokenIdentifier: v.string(),
    monthlyEventCreatedCount: v.number(),
    monthlyEventPeriodKey: v.string(),
    totalEventCreatedCount: v.number(),
    uploadedPhotoCount: v.number(),
  }).index("by_token", ["tokenIdentifier"]),

  featurePlans: defineTable({
    key: v.string(),
    name: v.string(),
    canImageUpdate: v.boolean(),
    canEventCreation: v.boolean(),
    canImageViewFromEvents: v.boolean(),
    monthlyEventLimit: v.number(),
    isDefault: v.boolean(),
  })
    .index("by_key", ["key"])
    .index("by_isDefault", ["isDefault"]),
});
