import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export type EffectiveFeatures = {
  canImageUpdate: boolean;
  canEventCreation: boolean;
  canImageViewFromEvents: boolean;
  monthlyEventLimit: number;
};

export type ResolvedUserAccess = {
  roleKey: string;
  isAdmin: boolean;
  planKey: string;
  planName: string;
  effectiveFeatures: EffectiveFeatures;
  usage: {
    monthlyEventCreatedCount: number;
    monthlyEventPeriodKey: string;
    totalEventCreatedCount: number;
    uploadedPhotoCount: number;
  };
};

type Context = QueryCtx | MutationCtx;
type PlanDoc = Doc<"featurePlans">;

type UsageShape = {
  monthlyEventCreatedCount: number;
  monthlyEventPeriodKey: string;
  totalEventCreatedCount: number;
  uploadedPhotoCount: number;
};

const FREE_PLAN_KEY = "free";
const DEFAULT_ROLE_KEY = "user";

const DEFAULT_FREE_PLAN: Omit<PlanDoc, "_id" | "_creationTime"> = {
  key: FREE_PLAN_KEY,
  name: "Free",
  canImageUpdate: false,
  canEventCreation: true,
  canImageViewFromEvents: false,
  monthlyEventLimit: 3,
  isDefault: true,
};

export function getCurrentPeriodKey(timestamp = Date.now()): string {
  const date = new Date(timestamp);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}`;
}

function buildDefaultUsage(): UsageShape {
  return {
    monthlyEventCreatedCount: 0,
    monthlyEventPeriodKey: getCurrentPeriodKey(),
    totalEventCreatedCount: 0,
    uploadedPhotoCount: 0,
  };
}

function mergeEffectiveFeatures(
  plan: Pick<
    PlanDoc,
    "canImageUpdate" | "canEventCreation" | "canImageViewFromEvents" | "monthlyEventLimit"
  >,
  overrides:
    | {
        canImageUpdate?: boolean;
        canEventCreation?: boolean;
        canImageViewFromEvents?: boolean;
        monthlyEventLimit?: number;
      }
    | null,
): EffectiveFeatures {
  return {
    canImageUpdate: overrides?.canImageUpdate ?? plan.canImageUpdate,
    canEventCreation: overrides?.canEventCreation ?? plan.canEventCreation,
    canImageViewFromEvents:
      overrides?.canImageViewFromEvents ?? plan.canImageViewFromEvents,
    monthlyEventLimit: overrides?.monthlyEventLimit ?? plan.monthlyEventLimit,
  };
}

export async function ensureDefaultFreePlan(ctx: MutationCtx) {
  const existing = await ctx.db
    .query("featurePlans")
    .withIndex("by_key", (q) => q.eq("key", FREE_PLAN_KEY))
    .unique();

  if (existing) {
    return existing;
  }

  const insertedId = await ctx.db.insert("featurePlans", DEFAULT_FREE_PLAN);
  const inserted = await ctx.db.get(insertedId);

  if (!inserted) {
    throw new Error("Failed to bootstrap free plan");
  }

  return inserted;
}

export async function ensureDefaultRoles(ctx: MutationCtx) {
  const defaults = [
    { key: "admin", name: "Admin", isAdmin: true },
    { key: "user", name: "User", isAdmin: false },
  ] as const;

  for (const role of defaults) {
    const existing = await ctx.db
      .query("roles")
      .withIndex("by_key", (q) => q.eq("key", role.key))
      .unique();

    if (existing) {
      continue;
    }

    await ctx.db.insert("roles", {
      key: role.key,
      name: role.name,
      isAdmin: role.isAdmin,
    });
  }
}

export async function getUserByTokenIdentifierOrThrow(
  ctx: Context,
  tokenIdentifier: string,
) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();

  if (!user) {
    throw new Error("User record not found");
  }

  return user;
}

export async function hasAnyAdminUser(ctx: Context) {
  const admins = await ctx.db
    .query("userRoles")
    .withIndex("by_roleKey", (q) => q.eq("roleKey", "admin"))
    .take(1);

  return admins.length > 0;
}

export async function ensureUserAccessRecords(
  ctx: MutationCtx,
  tokenIdentifier: string,
  options?: { bootstrapAdmin?: boolean },
) {
  await ensureDefaultFreePlan(ctx);
  await ensureDefaultRoles(ctx);

  const roleRecord = await ctx.db
    .query("userRoles")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();

  if (!roleRecord) {
    await ctx.db.insert("userRoles", {
      tokenIdentifier,
      roleKey: options?.bootstrapAdmin ? "admin" : DEFAULT_ROLE_KEY,
    });
  }

  const planRecord = await ctx.db
    .query("userPlans")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();

  if (!planRecord) {
    await ctx.db.insert("userPlans", {
      tokenIdentifier,
      planKey: FREE_PLAN_KEY,
    });
  }

  const usageRecord = await ctx.db
    .query("userUsage")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();

  if (!usageRecord) {
    await ctx.db.insert("userUsage", {
      tokenIdentifier,
      ...buildDefaultUsage(),
    });
  }
}

async function resolvePlanByKey(ctx: Context, planKey: string) {
  const configuredPlan = await ctx.db
    .query("featurePlans")
    .withIndex("by_key", (q) => q.eq("key", planKey))
    .unique();

  if (configuredPlan) {
    return configuredPlan;
  }

  const defaultPlan = await ctx.db
    .query("featurePlans")
    .withIndex("by_isDefault", (q) => q.eq("isDefault", true))
    .first();

  if (defaultPlan) {
    return defaultPlan;
  }

  return {
    _id: "fallback" as PlanDoc["_id"],
    _creationTime: Date.now(),
    ...DEFAULT_FREE_PLAN,
  };
}

export async function resolveUserAccessByToken(
  ctx: Context,
  tokenIdentifier: string,
): Promise<ResolvedUserAccess> {
  const roleRecord = await ctx.db
    .query("userRoles")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();
  const roleKey = roleRecord?.roleKey ?? DEFAULT_ROLE_KEY;

  const role = await ctx.db
    .query("roles")
    .withIndex("by_key", (q) => q.eq("key", roleKey))
    .unique();

  const planRecord = await ctx.db
    .query("userPlans")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();
  const planKey = planRecord?.planKey ?? FREE_PLAN_KEY;

  const plan = await resolvePlanByKey(ctx, planKey);

  const overrides = await ctx.db
    .query("userFeatureOverrides")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();

  const usageRecord = await ctx.db
    .query("userUsage")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();

  const usage = usageRecord
    ? {
        monthlyEventCreatedCount: usageRecord.monthlyEventCreatedCount,
        monthlyEventPeriodKey: usageRecord.monthlyEventPeriodKey,
        totalEventCreatedCount: usageRecord.totalEventCreatedCount,
        uploadedPhotoCount: usageRecord.uploadedPhotoCount,
      }
    : buildDefaultUsage();

  return {
    roleKey,
    isAdmin: role?.isAdmin ?? roleKey === "admin",
    planKey,
    planName: plan.name,
    effectiveFeatures: mergeEffectiveFeatures(plan, overrides),
    usage,
  };
}

export async function requireIdentityToken(ctx: Context) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Authentication required");
  }

  return identity.tokenIdentifier;
}

export async function requireAdminUser(ctx: Context) {
  const tokenIdentifier = await requireIdentityToken(ctx);
  await getUserByTokenIdentifierOrThrow(ctx, tokenIdentifier);

  const access = await resolveUserAccessByToken(ctx, tokenIdentifier);
  if (!access.isAdmin) {
    throw new Error("Admin access required");
  }

  return access;
}

export async function ensureUserUsagePeriod(ctx: MutationCtx, tokenIdentifier: string) {
  await ensureUserAccessRecords(ctx, tokenIdentifier);

  const usageRecord = await ctx.db
    .query("userUsage")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();

  if (!usageRecord) {
    throw new Error("User usage record not found");
  }

  const currentPeriodKey = getCurrentPeriodKey();

  if (usageRecord.monthlyEventPeriodKey === currentPeriodKey) {
    return usageRecord;
  }

  await ctx.db.patch(usageRecord._id, {
    monthlyEventCreatedCount: 0,
    monthlyEventPeriodKey: currentPeriodKey,
  });

  const refreshed = await ctx.db.get(usageRecord._id);
  if (!refreshed) {
    throw new Error("User usage record not found");
  }

  return refreshed;
}

export async function assertAndConsumeEventCreation(ctx: MutationCtx, tokenIdentifier: string) {
  await getUserByTokenIdentifierOrThrow(ctx, tokenIdentifier);
  await ensureUserAccessRecords(ctx, tokenIdentifier);
  const usage = await ensureUserUsagePeriod(ctx, tokenIdentifier);
  const access = await resolveUserAccessByToken(ctx, tokenIdentifier);

  if (!access.effectiveFeatures.canEventCreation) {
    throw new Error("Event creation is disabled for your account");
  }

  if (usage.monthlyEventCreatedCount >= access.effectiveFeatures.monthlyEventLimit) {
    throw new Error(
      `Monthly event limit reached (${access.effectiveFeatures.monthlyEventLimit}). Upgrade or contact an admin.`,
    );
  }

  await ctx.db.patch(usage._id, {
    monthlyEventCreatedCount: usage.monthlyEventCreatedCount + 1,
    totalEventCreatedCount: usage.totalEventCreatedCount + 1,
  });

  return access.effectiveFeatures;
}

export async function assertCanImageUpdate(ctx: MutationCtx, tokenIdentifier: string) {
  await getUserByTokenIdentifierOrThrow(ctx, tokenIdentifier);
  await ensureUserAccessRecords(ctx, tokenIdentifier);
  const access = await resolveUserAccessByToken(ctx, tokenIdentifier);

  if (!access.effectiveFeatures.canImageUpdate) {
    throw new Error("Image upload is disabled for your account");
  }

  return access.effectiveFeatures;
}

export async function canUserViewEventImages(ctx: Context, tokenIdentifier: string) {
  await getUserByTokenIdentifierOrThrow(ctx, tokenIdentifier);
  const access = await resolveUserAccessByToken(ctx, tokenIdentifier);
  return access.effectiveFeatures.canImageViewFromEvents;
}

export async function recordUploadedPhoto(ctx: MutationCtx, tokenIdentifier: string) {
  await ensureUserAccessRecords(ctx, tokenIdentifier);

  const usageRecord = await ctx.db
    .query("userUsage")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();

  if (!usageRecord) {
    throw new Error("User usage record not found");
  }

  await ctx.db.patch(usageRecord._id, {
    uploadedPhotoCount: usageRecord.uploadedPhotoCount + 1,
  });
}

export { DEFAULT_FREE_PLAN, FREE_PLAN_KEY };
