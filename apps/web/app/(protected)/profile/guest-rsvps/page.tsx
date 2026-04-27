"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { api } from "@invyte/convex";
import AppShell from "@/components/AppShell";
import { GlassCard } from "@invyte/ui/glass-card";
import { toast } from "@/components/Toaster";

export default function GuestRsvpsPage() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { isLoaded: isUserLoaded, user } = useUser();
  const guestRsvps = useQuery(
    api.users.getGuestRsvps,
    isAuthenticated ? {} : "skip",
  );
  const transferGuestRsvps = useMutation(api.users.transferGuestRsvpsToAccount);

  if (
    isLoading ||
    !isUserLoaded ||
    (isAuthenticated && guestRsvps === undefined)
  ) {
    return (
      <AppShell>
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!isAuthenticated || guestRsvps === null) {
    return null;
  }

  if (!guestRsvps) {
    return null;
  }

  const handleTransfer = async () => {
    if (!guestRsvps.guestRsvpCount) {
      toast("No guest RSVPs to transfer");
      return;
    }

    try {
      const result = await transferGuestRsvps();
      toast(
        result.mergedCount > 0
          ? `Transferred ${result.transferredCount} RSVPs and merged ${result.mergedCount} conflicts`
          : `Transferred ${result.transferredCount} RSVPs`,
      );
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Failed to transfer RSVPs",
        "error",
      );
    }
  };

  return (
    <AppShell>
      <section className="animate-fade-in space-y-6">
        <div>
          <button
            className="text-sm text-on-surface-variant hover:text-on-surface transition-colors mb-4"
            onClick={() => router.push("/profile")}
            type="button"
          >
            ← Back to profile
          </button>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-label font-bold uppercase tracking-widest text-on-surface-variant">
              Guest RSVPs
            </p>
            <h1 className="font-headline text-3xl font-black">
              Move them into your account
            </h1>
            <p className="text-sm text-on-surface-variant max-w-2xl">
              These RSVP records were created with the email tied to your
              signed-in account. Transfer them to keep the history, passes, and
              event access under one profile.
            </p>
            <p className="text-xs text-outline">
              {user?.primaryEmailAddress?.emailAddress ?? guestRsvps.guestEmail}
            </p>
          </div>
        </div>

        <GlassCard className="p-5 border border-primary/15 bg-gradient-to-br from-primary/10 to-secondary/10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-label font-bold uppercase tracking-widest text-on-surface-variant">
                Ready to transfer
              </p>
              <p className="font-headline text-2xl font-black text-primary mt-1">
                {guestRsvps.guestRsvpCount}
              </p>
              <p className="text-sm text-on-surface-variant mt-1">
                {guestRsvps.guestGoingCount} marked as going.
              </p>
            </div>
            <button
              className="btn-primary px-5 py-2 text-sm"
              onClick={handleTransfer}
              type="button"
            >
              Transfer everything
            </button>
          </div>
        </GlassCard>

        {guestRsvps.guestRsvpCount === 0 ? (
          <GlassCard className="p-6 text-center">
            <p className="font-label font-bold text-sm text-on-surface">
              No guest RSVPs found
            </p>
            <p className="text-sm text-on-surface-variant mt-2">
              If you RSVP again with this email as a guest, it will appear here
              for transfer.
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {guestRsvps.guestRsvps.map((rsvp) => (
              <GlassCard
                key={rsvp.attendeeId}
                className="p-4 flex items-center gap-4"
              >
                <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                  <Image
                    alt={rsvp.title}
                    className="object-cover"
                    fill
                    src={rsvp.coverImage}
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-label font-bold text-sm truncate">
                        {rsvp.title}
                      </h2>
                      <p className="text-xs text-on-surface-variant font-medium mt-1">
                        {rsvp.date} • {rsvp.time}
                      </p>
                      <p className="text-xs text-outline mt-1 truncate">
                        {rsvp.location}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[9px] font-bold uppercase border border-primary/20 shrink-0">
                      {rsvp.rsvpStatus}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3 text-xs text-on-surface-variant">
                    <span className="px-2 py-1 rounded-full bg-surface-container">
                      {rsvp.responseSource}
                    </span>
                    {rsvp.plusOne && (
                      <span className="px-2 py-1 rounded-full bg-surface-container">
                        Plus one
                      </span>
                    )}
                    {rsvp.plusOneName && (
                      <span className="px-2 py-1 rounded-full bg-surface-container">
                        {rsvp.plusOneName}
                      </span>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
