"use client";

import Image from "next/image";
import { UserButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { GlassCard } from "@invyte/ui/glass-card";
import AppShell from "@/components/AppShell";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@invyte/convex";

export default function ProfilePage() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { isLoaded: isUserLoaded, user } = useUser();
  const profile = useQuery(api.events.getProfileData, isAuthenticated ? {} : "skip");
  const access = useQuery(api.users.getCurrentUserAccess, isAuthenticated ? {} : "skip");

  if (
    isLoading ||
    !isUserLoaded ||
    (isAuthenticated && profile === undefined) ||
    (isAuthenticated && access === undefined)
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

  if (profile === undefined) {
    return null;
  }

  if (access === undefined || access === null) {
    return null;
  }

  const memberProfile = profile;
  const canCreateEvents = access.effectiveFeatures.canEventCreation;

  const email = user?.primaryEmailAddress?.emailAddress ?? "Signed in with Clerk";
  const emailHandle = user?.primaryEmailAddress?.emailAddress?.split("@")[0];
  const displayName = user?.fullName ?? user?.firstName ?? "Your profile";
  const handle =
    user?.username ??
    emailHandle ??
    displayName.toLowerCase().replace(/\s+/g, "");
  const imageUrl =
    user?.imageUrl ??
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`;

  return (
    <AppShell>
      <section className="animate-fade-in">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary/30 shadow-neon-purple mb-4">
            <Image alt={displayName} className="object-cover" fill src={imageUrl} unoptimized />
          </div>
          <h1 className="font-headline text-2xl font-black">{displayName}</h1>
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
              {canCreateEvents ? "Host Again" : "Host Locked"}
            </p>
          </button>
          {access.isAdmin && (
            <button
              className="glass-card rounded-2xl p-4 border border-outline-variant/15 text-center active:scale-95 transition-all"
              onClick={() => router.push("/admin/users")}
              type="button"
            >
              <span className="material-symbols-outlined text-tertiary mb-2">admin_panel_settings</span>
              <p className="text-xs font-label font-bold uppercase tracking-wider text-on-surface-variant">
                Admin
              </p>
            </button>
          )}
        </div>

        <h2 className="font-headline text-lg font-bold mb-3">Hosted Events</h2>
        <div className="space-y-3 mb-6">
          {memberProfile.hostedEvents.length === 0 ? (
            <p className="text-sm text-on-surface-variant italic">
              You haven&apos;t hosted an event yet.
            </p>
          ) : (
            memberProfile.hostedEvents.map((event) => (
              <GlassCard
                key={event._id}
                className="p-4 flex items-center gap-4 cursor-pointer"
                onClick={() => router.push(`/event/${event._id}`)}
              >
                <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                  <Image alt={event.title} className="object-cover" fill src={event.coverImage} unoptimized />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-label font-bold text-sm truncate">{event.title}</h3>
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
                  <Image alt={event.title} className="object-cover" fill src={event.coverImage} unoptimized />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-label font-bold text-sm truncate">{event.title}</h3>
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
