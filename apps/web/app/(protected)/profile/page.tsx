"use client";

import { useState } from "react";
import Image from "next/image";
import { UserButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { GlassCard } from "@invyte/ui/glass-card";
import AppShell from "@/components/AppShell";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@invyte/convex";
import { toast } from "@/components/Toaster";

export default function ProfilePage() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { isLoaded: isUserLoaded, user } = useUser();
  const profile = useQuery(
    api.events.getProfileData,
    isAuthenticated ? {} : "skip",
  );
  const guestRsvps = useQuery(
    api.users.getGuestRsvps,
    isAuthenticated ? {} : "skip",
  );
  const access = useQuery(
    api.users.getCurrentUserAccess,
    isAuthenticated ? {} : "skip",
  );
  const currentUser = useQuery(
    api.users.currentUser,
    isAuthenticated ? {} : "skip",
  );

  const updateDisplayName = useMutation(api.users.updateDisplayName);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  if (
    isLoading ||
    !isUserLoaded ||
    (isAuthenticated && profile === undefined) ||
    (isAuthenticated && guestRsvps === undefined) ||
    (isAuthenticated && access === undefined) ||
    (isAuthenticated && currentUser === undefined)
  ) {
    return (
      <AppShell>
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (
    profile === undefined ||
    guestRsvps === undefined ||
    access === undefined ||
    access === null
  ) {
    return null;
  }

  if (!guestRsvps) {
    return null;
  }

  const memberProfile = profile;
  const canCreateEvents = access.effectiveFeatures.canEventCreation;

  const email =
    user?.primaryEmailAddress?.emailAddress ?? "Signed in with Clerk";
  const emailHandle = user?.primaryEmailAddress?.emailAddress?.split("@")[0];
  // Prefer the Convex stored name (which the user can customise) over the Clerk name.
  const displayName =
    currentUser?.name ?? user?.fullName ?? user?.firstName ?? "Your profile";
  const handle =
    user?.username ??
    emailHandle ??
    displayName.toLowerCase().replace(/\s+/g, "");
  const imageUrl =
    user?.imageUrl ??
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`;

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || isSavingName) return;
    setIsSavingName(true);
    try {
      await updateDisplayName({ name: trimmed });
      toast("Display name updated");
      setIsEditingName(false);
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Failed to update name",
        "error",
      );
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <AppShell>
      <section className="animate-fade-in">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary/30 shadow-neon-purple mb-4">
            <Image
              alt={displayName}
              className="object-cover"
              fill
              src={imageUrl}
              unoptimized
            />
          </div>

          {isEditingName ? (
            <div className="flex items-center gap-2 mt-1 w-full max-w-xs">
              <input
                autoFocus
                className="input-field flex-1 text-center text-sm"
                maxLength={50}
                placeholder="Your display name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSaveName();
                  if (e.key === "Escape") setIsEditingName(false);
                }}
              />
              <button
                className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center disabled:opacity-50 flex-shrink-0"
                disabled={!nameInput.trim() || isSavingName}
                onClick={handleSaveName}
                type="button"
              >
                {isSavingName ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-sm">
                    check
                  </span>
                )}
              </button>
              <button
                className="w-9 h-9 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center flex-shrink-0"
                onClick={() => setIsEditingName(false)}
                type="button"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <h1 className="font-headline text-2xl font-black">
                {displayName}
              </h1>
              <button
                className="text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity"
                onClick={() => {
                  setNameInput(displayName);
                  setIsEditingName(true);
                }}
                title="Edit display name"
                type="button"
              >
                <span className="material-symbols-outlined text-base">
                  edit
                </span>
              </button>
            </div>
          )}

          <p className="text-sm text-on-surface-variant mt-1">@{handle}</p>
          <p className="text-xs text-outline mt-1">{email}</p>

          <div className="flex gap-6 mt-4">
            <div className="text-center">
              <p className="font-headline text-xl font-black text-primary">
                {memberProfile.stats.hostedCount}
              </p>
              <p className="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant">
                Hosted
              </p>
            </div>
            <div className="text-center">
              <p className="font-headline text-xl font-black text-secondary">
                {memberProfile.stats.attendingCount}
              </p>
              <p className="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant">
                Going
              </p>
            </div>
            <div className="text-center">
              <p className="font-headline text-xl font-black text-tertiary">
                {memberProfile.stats.totalHostedRsvps}
              </p>
              <p className="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant">
                RSVPs
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <GlassCard className="rounded-2xl p-4 border border-outline-variant/15 text-center">
            <div className="flex justify-center mb-2">
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox:
                      "w-10 h-10 rounded-full border border-primary/20",
                  },
                }}
              />
            </div>
            <p className="text-xs font-label font-bold uppercase tracking-wider text-on-surface-variant">
              Manage Account
            </p>
          </GlassCard>
          <button
            className="glass-card rounded-2xl p-4 border border-outline-variant/15 text-center active:scale-95 transition-all disabled:opacity-50"
            disabled={!canCreateEvents}
            onClick={() => canCreateEvents && router.push("/create")}
            type="button"
          >
            <span className="material-symbols-outlined text-secondary mb-2">
              add_circle
            </span>
            <p className="text-xs font-label font-bold uppercase tracking-wider text-on-surface-variant">
              {!canCreateEvents
                ? "Host Locked"
                : memberProfile.stats.hostedCount > 0
                  ? "Host Again"
                  : "Host a Party"}
            </p>
          </button>
          {access.isAdmin && (
            <button
              className="glass-card rounded-2xl p-4 border border-outline-variant/15 text-center active:scale-95 transition-all"
              onClick={() => router.push("/admin/users")}
              type="button"
            >
              <span className="material-symbols-outlined text-tertiary mb-2">
                admin_panel_settings
              </span>
              <p className="text-xs font-label font-bold uppercase tracking-wider text-on-surface-variant">
                Admin
              </p>
            </button>
          )}
        </div>

        {guestRsvps.guestRsvpCount > 0 && (
          <GlassCard className="p-4 mb-6 border border-primary/15 bg-gradient-to-br from-primary/10 to-secondary/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-label font-bold uppercase tracking-widest text-on-surface-variant">
                  Guest RSVPs
                </p>
                <h2 className="font-headline text-lg font-black mt-1">
                  Transfer RSVP history
                </h2>
                <p className="text-sm text-on-surface-variant mt-2 max-w-md">
                  Move every RSVP you made with this email as a guest into your
                  signed-in account so it appears in your profile and event pass
                  records.
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-headline text-2xl font-black text-primary">
                  {guestRsvps.guestRsvpCount}
                </p>
                <p className="text-[10px] font-label font-bold uppercase tracking-widest text-on-surface-variant">
                  Found
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                className="btn-primary text-xs px-4 py-2"
                onClick={() => router.push("/profile/guest-rsvps")}
                type="button"
              >
                Review and transfer
              </button>
              <p className="text-xs text-on-surface-variant self-center">
                {guestRsvps.guestRsvpCount === 0
                  ? "No guest RSVPs were found for this email."
                  : `${guestRsvps.guestGoingCount} marked as going`}
              </p>
            </div>
          </GlassCard>
        )}
        <h2 className="font-headline text-lg font-bold mb-3">Hosted Events</h2>
        <div className="space-y-3 mb-6">
          {memberProfile.hostedEvents.length === 0 ? (
            <GlassCard className="p-6 flex flex-col items-center text-center gap-3">
              <span className="material-symbols-outlined text-primary text-3xl">
                celebration
              </span>
              <div>
                <p className="font-label font-bold text-sm text-on-surface">
                  Host your first party
                </p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Create an event and invite your people.
                </p>
              </div>
              {canCreateEvents && (
                <button
                  className="btn-primary text-xs py-2 px-5"
                  onClick={() => router.push("/create")}
                  type="button"
                >
                  Create Event
                </button>
              )}
            </GlassCard>
          ) : (
            memberProfile.hostedEvents.map((event) => (
              <GlassCard
                key={event._id}
                className="p-4 flex items-center gap-4 cursor-pointer"
                onClick={() => router.push(`/event/${event._id}`)}
              >
                <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                  <Image
                    alt={event.title}
                    className="object-cover"
                    fill
                    src={event.coverImage}
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-label font-bold text-sm truncate">
                    {event.title}
                  </h3>
                  <p className="text-xs text-on-surface-variant font-medium">
                    {event.date} • {event.time}
                  </p>
                </div>
                <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[9px] font-bold uppercase border border-primary/20">
                  Host
                </span>
              </GlassCard>
            ))
          )}
        </div>

        <h2 className="font-headline text-lg font-bold mb-3">Going To</h2>
        <div className="space-y-3 mb-6">
          {memberProfile.attendingEvents.length === 0 ? (
            <p className="text-sm text-on-surface-variant italic">
              RSVP to an event and it will show up here.
            </p>
          ) : (
            memberProfile.attendingEvents.map((event) => (
              <GlassCard
                key={event._id}
                className="p-4 flex items-center gap-4 cursor-pointer"
                onClick={() => router.push(`/event/${event._id}`)}
              >
                <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                  <Image
                    alt={event.title}
                    className="object-cover"
                    fill
                    src={event.coverImage}
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-label font-bold text-sm truncate">
                    {event.title}
                  </h3>
                  <p className="text-xs text-on-surface-variant font-medium">
                    {event.date} • {event.location}
                  </p>
                </div>
                <span className="px-2 py-1 rounded-full bg-secondary/10 text-secondary text-[9px] font-bold uppercase border border-secondary/20">
                  Going
                </span>
              </GlassCard>
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}
