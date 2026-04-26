"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { GlassCard } from "@invyte/ui/glass-card";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api, type Id } from "@invyte/convex";

type UserDraft = {
  role: "admin" | "user";
  planKey: string;
  canImageUpdate: boolean;
  canEventCreation: boolean;
  canImageViewFromEvents: boolean;
  monthlyEventLimit: number;
  usePlanDefaults: boolean;
};

export default function AdminUsersPage() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const access = useQuery(api.users.getCurrentUserAccess, isAuthenticated ? {} : "skip");
  const users = useQuery(
    api.users.listAdminUsers,
    isAuthenticated && access?.isAdmin ? {} : "skip",
  );
  const plans = useQuery(
    api.users.listFeaturePlans,
    isAuthenticated && access?.isAdmin ? {} : "skip",
  );

  const updateUserAccess = useMutation(api.users.updateUserAccess);
  const upsertFeaturePlan = useMutation(api.users.upsertFeaturePlan);

  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
  const [saveState, setSaveState] = useState<Record<string, string>>({});
  const [planFormError, setPlanFormError] = useState<string | null>(null);
  const [planFormSuccess, setPlanFormSuccess] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState({
    key: "",
    name: "",
    canImageUpdate: false,
    canEventCreation: true,
    canImageViewFromEvents: false,
    monthlyEventLimit: 3,
    isDefault: false,
  });

  useEffect(() => {
    if (!users) {
      return;
    }

    const nextDrafts: Record<string, UserDraft> = Object.fromEntries(
      users.map((user) => [
        user._id,
        {
          role: user.role === "admin" ? "admin" : "user",
          planKey: user.planKey,
          canImageUpdate: user.features.canImageUpdate,
          canEventCreation: user.features.canEventCreation,
          canImageViewFromEvents: user.features.canImageViewFromEvents,
          monthlyEventLimit: user.features.monthlyEventLimit,
          usePlanDefaults: false,
        },
      ]),
    );

    setDrafts(nextDrafts);
  }, [users]);

  const sortedPlans = useMemo(() => plans ?? [], [plans]);

  if (isLoading || access === undefined || (access?.isAdmin && (users === undefined || plans === undefined))) {
    return (
      <AppShell>
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!isAuthenticated || !access) {
    return null;
  }

  if (!access.isAdmin) {
    return (
      <AppShell>
        <GlassCard className="p-6 mt-4">
          <h1 className="font-headline text-2xl font-black">Admin Access Required</h1>
          <p className="text-sm text-on-surface-variant mt-2">
            Your account is not configured as admin. Ask an existing admin to grant access.
          </p>
        </GlassCard>
      </AppShell>
    );
  }

  const handleDraftUpdate = (userId: string, patch: Partial<UserDraft>) => {
    setDrafts((current) => {
      const existing = current[userId];
      if (!existing) {
        return current;
      }

      return {
        ...current,
        [userId]: {
          ...existing,
          ...patch,
        },
      };
    });
  };

  const handleSaveUser = async (userId: string) => {
    const draft = drafts[userId];
    if (!draft) {
      return;
    }

    setSaveState((current) => ({ ...current, [userId]: "Saving..." }));

    try {
      await updateUserAccess({
        userId: userId as Id<"users">,
        role: draft.role,
        planKey: draft.planKey,
        ...(draft.usePlanDefaults
          ? { clearOverrides: true }
          : {
              canImageUpdate: draft.canImageUpdate,
              canEventCreation: draft.canEventCreation,
              canImageViewFromEvents: draft.canImageViewFromEvents,
              monthlyEventLimit: draft.monthlyEventLimit,
            }),
      });

      setSaveState((current) => ({ ...current, [userId]: "Saved" }));
      window.setTimeout(() => {
        setSaveState((current) => ({ ...current, [userId]: "" }));
      }, 1800);
    } catch (error) {
      setSaveState((current) => ({
        ...current,
        [userId]: error instanceof Error ? error.message : "Failed",
      }));
    }
  };

  const handleCreateOrUpdatePlan = async () => {
    setPlanFormError(null);
    setPlanFormSuccess(null);

    if (!planForm.key.trim() || !planForm.name.trim()) {
      setPlanFormError("Plan key and name are required.");
      return;
    }

    try {
      await upsertFeaturePlan({
        key: planForm.key.trim().toLowerCase(),
        name: planForm.name.trim(),
        canImageUpdate: planForm.canImageUpdate,
        canEventCreation: planForm.canEventCreation,
        canImageViewFromEvents: planForm.canImageViewFromEvents,
        monthlyEventLimit: Math.max(0, planForm.monthlyEventLimit),
        isDefault: planForm.isDefault,
      });
      setPlanFormSuccess("Plan saved.");
    } catch (error) {
      setPlanFormError(error instanceof Error ? error.message : "Failed to save plan.");
    }
  };

  return (
    <AppShell>
      <section className="space-y-6">
        <div>
          <p className="text-[10px] font-label font-bold uppercase tracking-[0.2em] text-outline">
            Admin Dashboard
          </p>
          <h1 className="font-headline text-3xl font-black mt-1">Users And Feature Access</h1>
        </div>

        <GlassCard className="p-5">
          <h2 className="font-headline text-xl font-black mb-4">Feature Flag Table (Plans)</h2>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="input-field"
              placeholder="Plan key (free, pro)"
              value={planForm.key}
              onChange={(event) => setPlanForm((current) => ({ ...current, key: event.target.value }))}
            />
            <input
              className="input-field"
              placeholder="Plan name"
              value={planForm.name}
              onChange={(event) => setPlanForm((current) => ({ ...current, name: event.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
            <label className="glass-card rounded-xl p-3 flex items-center justify-between">
              <span>Image Update</span>
              <input
                checked={planForm.canImageUpdate}
                onChange={(event) =>
                  setPlanForm((current) => ({ ...current, canImageUpdate: event.target.checked }))
                }
                type="checkbox"
              />
            </label>
            <label className="glass-card rounded-xl p-3 flex items-center justify-between">
              <span>Event Creation</span>
              <input
                checked={planForm.canEventCreation}
                onChange={(event) =>
                  setPlanForm((current) => ({ ...current, canEventCreation: event.target.checked }))
                }
                type="checkbox"
              />
            </label>
            <label className="glass-card rounded-xl p-3 flex items-center justify-between">
              <span>Image View</span>
              <input
                checked={planForm.canImageViewFromEvents}
                onChange={(event) =>
                  setPlanForm((current) => ({
                    ...current,
                    canImageViewFromEvents: event.target.checked,
                  }))
                }
                type="checkbox"
              />
            </label>
            <label className="glass-card rounded-xl p-3 flex items-center justify-between">
              <span>Default Plan</span>
              <input
                checked={planForm.isDefault}
                onChange={(event) =>
                  setPlanForm((current) => ({ ...current, isDefault: event.target.checked }))
                }
                type="checkbox"
              />
            </label>
          </div>

          <div className="mt-3">
            <label className="label-text">Monthly Event Limit</label>
            <input
              className="input-field"
              min={0}
              type="number"
              value={planForm.monthlyEventLimit}
              onChange={(event) =>
                setPlanForm((current) => ({
                  ...current,
                  monthlyEventLimit: Number(event.target.value || 0),
                }))
              }
            />
          </div>

          <button className="btn-primary mt-4" onClick={handleCreateOrUpdatePlan} type="button">
            Save Plan
          </button>
          {planFormError && <p className="text-xs text-red-300 mt-2">{planFormError}</p>}
          {planFormSuccess && <p className="text-xs text-green-300 mt-2">{planFormSuccess}</p>}

          {sortedPlans.length > 0 && (
            <div className="mt-5 space-y-2">
              {sortedPlans.map((plan) => (
                <div
                  key={plan._id}
                  className="rounded-xl border border-outline-variant/20 px-3 py-2 text-xs flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-on-surface">{plan.name}</p>
                    <p className="text-on-surface-variant">{plan.key}</p>
                  </div>
                  <p className="text-on-surface-variant">Limit: {plan.monthlyEventLimit}</p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <div className="space-y-4">
          {users?.map((user) => {
            const draft = drafts[user._id];
            if (!draft) {
              return null;
            }

            return (
              <GlassCard key={user._id} className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-label font-bold text-sm text-on-surface">{user.name}</h3>
                    <p className="text-xs text-on-surface-variant">{user.email}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-outline">
                    {user.role}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-outline-variant/20 p-3">
                    <p className="text-outline uppercase tracking-widest">Events Created</p>
                    <p className="font-headline text-2xl font-black text-primary mt-1">
                      {user.stats.eventCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-outline-variant/20 p-3">
                    <p className="text-outline uppercase tracking-widest">Photos Uploaded</p>
                    <p className="font-headline text-2xl font-black text-secondary mt-1">
                      {user.stats.uploadedPhotoCount}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <label className="space-y-1">
                    <span className="label-text">Role</span>
                    <select
                      className="input-field"
                      value={draft.role}
                      onChange={(event) =>
                        handleDraftUpdate(user._id, {
                          role: event.target.value as "admin" | "user",
                        })
                      }
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="label-text">Plan</span>
                    <select
                      className="input-field"
                      value={draft.planKey}
                      onChange={(event) =>
                        handleDraftUpdate(user._id, {
                          planKey: event.target.value,
                        })
                      }
                    >
                      {sortedPlans.map((plan) => (
                        <option key={plan._id} value={plan.key}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="glass-card rounded-xl p-3 text-xs flex items-center justify-between">
                  <span>Use plan defaults (clear user overrides)</span>
                  <input
                    checked={draft.usePlanDefaults}
                    onChange={(event) =>
                      handleDraftUpdate(user._id, { usePlanDefaults: event.target.checked })
                    }
                    type="checkbox"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label className="glass-card rounded-xl p-3 flex items-center justify-between">
                    <span>Image Update</span>
                    <input
                      checked={draft.canImageUpdate}
                      disabled={draft.usePlanDefaults}
                      onChange={(event) =>
                        handleDraftUpdate(user._id, { canImageUpdate: event.target.checked })
                      }
                      type="checkbox"
                    />
                  </label>
                  <label className="glass-card rounded-xl p-3 flex items-center justify-between">
                    <span>Event Creation</span>
                    <input
                      checked={draft.canEventCreation}
                      disabled={draft.usePlanDefaults}
                      onChange={(event) =>
                        handleDraftUpdate(user._id, { canEventCreation: event.target.checked })
                      }
                      type="checkbox"
                    />
                  </label>
                  <label className="glass-card rounded-xl p-3 flex items-center justify-between">
                    <span>Image View</span>
                    <input
                      checked={draft.canImageViewFromEvents}
                      disabled={draft.usePlanDefaults}
                      onChange={(event) =>
                        handleDraftUpdate(user._id, {
                          canImageViewFromEvents: event.target.checked,
                        })
                      }
                      type="checkbox"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="label-text">Monthly Event Limit</span>
                    <input
                      className="input-field"
                      disabled={draft.usePlanDefaults}
                      min={0}
                      type="number"
                      value={draft.monthlyEventLimit}
                      onChange={(event) =>
                        handleDraftUpdate(user._id, {
                          monthlyEventLimit: Number(event.target.value || 0),
                        })
                      }
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <button
                    className="btn-primary"
                    onClick={() => handleSaveUser(user._id)}
                    type="button"
                  >
                    Save User Access
                  </button>
                  <span className="text-xs text-on-surface-variant">{saveState[user._id] ?? ""}</span>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
