"use client";

import { useDeferredValue, useState } from "react";
import { useRouter } from "next/navigation";
import { EventCard } from "@invyte/ui/event-card";
import { GlassCard } from "@invyte/ui/glass-card";
import AppShell from "@/components/AppShell";
import { useQuery } from "convex/react";
import { api } from "@invyte/convex";

const categoryOptions = [
  "All",
  "Party",
  "Outdoors",
  "Tech",
  "Wellness",
  "Music",
  "Food",
  "Fitness",
  "Art",
  "General",
];

export default function DiscoveryPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const deferredSearch = useDeferredValue(searchText);
  const events = useQuery(api.events.getEvents, {
    category: selectedCategory === "All" ? undefined : selectedCategory,
    searchText: deferredSearch.trim() || undefined,
  });

  const trendingEvents = events?.slice(0, 3) ?? [];
  const recentlyShared = events?.filter((event) => event.photoCount > 0).slice(0, 3) ?? [];
  const remainingEvents = events?.slice(3) ?? [];

  return (
    <AppShell>
      <section className="mb-8 animate-fade-in">
        <span className="font-label text-xs font-bold uppercase tracking-[0.2em] text-secondary">
          Discover
        </span>
        <h1 className="font-headline text-4xl font-black tracking-tight leading-none mt-2">
          Find Your <span className="gradient-text">Next Vibe</span>
        </h1>
        <p className="text-on-surface-variant text-sm mt-3 leading-relaxed">
          Public events, fresh galleries, and gatherings you can jump into right now.
        </p>
      </section>

      <div className="relative mb-6 animate-slide-up">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
          search
        </span>
        <input
          className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-2xl py-3 pl-12 pr-4 text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary focus:outline-none transition-all text-sm"
          placeholder="Search events, places, hosts, or vibes..."
          type="text"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
      </div>

      <div className="flex overflow-x-auto gap-3 mb-8 hide-scrollbar -mx-4 px-4 animate-slide-up">
        {categoryOptions.map((category) => {
          const isActive = selectedCategory === category;
          return (
            <button
              key={category}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-label font-bold uppercase tracking-wider transition-all active:scale-95 ${
                isActive
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-surface-container border border-outline-variant/15 text-on-surface-variant hover:border-outline-variant/30"
              }`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          );
        })}
      </div>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline text-xl font-bold">
            <span className="text-secondary">🔥</span> Trending Now
          </h2>
          {events && events.length > 0 && (
            <span className="text-xs font-label font-bold text-primary uppercase tracking-wider">
              {events.length} match{events.length === 1 ? "" : "es"}
            </span>
          )}
        </div>

        {events === undefined ? (
          <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-4 px-4">
            <div className="w-72 h-80 rounded-3xl bg-surface-container animate-pulse flex-shrink-0" />
            <div className="w-72 h-80 rounded-3xl bg-surface-container animate-pulse flex-shrink-0" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-10 bg-surface-container-lowest rounded-3xl border border-outline-variant/10">
            <p className="text-on-surface-variant text-sm">No events found.</p>
            <button className="mt-3 btn-primary text-xs" onClick={() => router.push("/create")}>
              Host One Now
            </button>
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-4 hide-scrollbar -mx-4 px-4">
            {trendingEvents.map((event) => (
              <div key={event._id} className="flex-shrink-0 w-72">
                <EventCard
                  id={event._id}
                  title={event.title}
                  date={event.date}
                  time={event.time}
                  location={event.location}
                  coverImage={event.coverImage}
                  vibe={event.vibe}
                  attendeeCount={event.attendeeCount}
                  attendeeAvatars={event.attendees.map((attendee) => attendee.avatar)}
                  category={event.category}
                  onClick={(id) => router.push(`/event/${id}`)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline text-xl font-bold">
            <span className="text-tertiary">📸</span> Fresh From The Gallery
          </h2>
        </div>
        {events === undefined ? (
          <div className="glass-card rounded-2xl border border-outline-variant/15 p-4 animate-pulse h-24" />
        ) : recentlyShared.length === 0 ? (
          <GlassCard className="p-4">
            <p className="text-sm text-on-surface-variant">
              No photo drops yet. Upload a cover or gallery shot once your event is live.
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {recentlyShared.map((event) => (
              <GlassCard
                key={event._id}
                className="p-4 cursor-pointer hover:border-primary/30 transition-all"
                onClick={() => router.push(`/event/${event._id}`)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-label font-bold text-sm text-on-surface">{event.title}</p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {event.photoCount} photo{event.photoCount === 1 ? "" : "s"} shared
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-tertiary/15 text-tertiary text-[10px] font-bold uppercase tracking-wider border border-tertiary/20">
                    Gallery
                  </span>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline text-xl font-bold">
            <span className="text-primary">💜</span> More To Explore
          </h2>
        </div>

        {events && events.length > 0 && (
          <div className="space-y-4">
            {(remainingEvents.length > 0 ? remainingEvents : trendingEvents).map((event) => (
              <EventCard
                key={event._id}
                id={event._id}
                title={event.title}
                date={event.date}
                time={event.time}
                location={event.location}
                coverImage={event.coverImage}
                vibe={event.vibe}
                attendeeCount={event.attendeeCount}
                attendeeAvatars={event.attendees.map((attendee) => attendee.avatar)}
                category={event.category}
                onClick={(id) => router.push(`/event/${id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
