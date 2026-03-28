"use client";

import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { GlassCard } from "@invyte/ui/glass-card";
import AppShell from "@/components/AppShell";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@invyte/convex";

export default function FeedPage() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { isLoaded: isUserLoaded, user } = useUser();
  const events = useQuery(api.events.getFeedEvents, isAuthenticated ? {} : "skip");

  if (isLoading || !isUserLoaded || (isAuthenticated && events === undefined)) {
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

  const feedEvents = events ?? [];

  return (
    <AppShell>
      <section className="mb-6 animate-fade-in">
        <span className="font-label text-xs font-bold uppercase tracking-[0.2em] text-secondary">
          Activity
        </span>
        <h1 className="font-headline text-3xl font-black tracking-tight mt-2">
          {user?.firstName ? `${user.firstName}'s ` : "Your "}
          <span className="gradient-text">Feed</span>
        </h1>
      </section>

      <div className="space-y-4">
        {feedEvents.length === 0 ? (
          <p className="text-center py-20 text-on-surface-variant italic">
            No activity yet. Join some events!
          </p>
        ) : (
          feedEvents.map((event) => (
            <GlassCard
              key={event._id}
              className="p-4 cursor-pointer hover:border-primary/30 transition-all"
              onClick={() => router.push(`/event/${event._id}`)}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    alt={event.hostName}
                    className="object-cover"
                    fill
                    src={event.hostAvatar}
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-bold text-on-surface">
                      {event.hostName}
                    </span>{" "}
                    <span className="text-on-surface-variant">
                      is hosting something live
                    </span>
                  </p>
                  <p className="text-[10px] text-outline mt-0.5">
                    {new Date(event._creationTime).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    • {event.vibe}
                  </p>
                </div>
              </div>
              <div className="rounded-xl overflow-hidden mb-3">
                <div className="relative h-32">
                  <Image
                    alt={event.title}
                    className="object-cover"
                    fill
                    src={event.coverImage}
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <h3 className="font-headline text-sm font-bold">
                      {event.title}
                    </h3>
                    <p className="text-[10px] text-on-surface-variant">
                      {event.date} • {event.location}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>{event.attendeeCount} going</span>
                <span>{event.commentCount} comments</span>
                <span>{event.photoCount} photos</span>
                <span>{event.likeCount} likes</span>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </AppShell>
  );
}
