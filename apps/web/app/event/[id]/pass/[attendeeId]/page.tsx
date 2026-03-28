"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api, type Id } from "@invyte/convex";

export default function EntryPassPage() {
  const params = useParams<{ id: Id<"events">; attendeeId: Id<"attendees"> }>();
  const pass = useQuery(api.events.getAttendeePass, {
    eventId: params.id,
    attendeeId: params.attendeeId,
  });

  if (pass === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (pass === null) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <p className="text-on-surface-variant mb-4">Pass not found.</p>
      </div>
    );
  }

  const statusLabel =
    pass.attendee.rsvpStatus === "going"
      ? "Confirmed"
      : pass.attendee.rsvpStatus === "maybe"
        ? "Maybe"
        : "Not Going";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="glass-card rounded-3xl border border-primary/20 overflow-hidden shadow-glow-purple">
          <div className="relative h-40 overflow-hidden">
            <Image alt={pass.event.title} className="object-cover" fill src={pass.event.coverImage} unoptimized />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(37,37,44,0.6)] to-transparent" />
            <div className="absolute top-4 left-4">
              <span className="font-headline font-black tracking-tighter uppercase text-xl italic gradient-text">
                Invyte
              </span>
            </div>
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 rounded-full bg-primary/30 text-primary text-[9px] font-black uppercase tracking-wider backdrop-blur-sm border border-primary/20">
                {statusLabel}
              </span>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <span className="text-[10px] font-label font-bold uppercase tracking-[0.2em] text-secondary">
                Event Pass
              </span>
              <h1 className="font-headline text-2xl font-black tracking-tight mt-1">
                {pass.event.title}
              </h1>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[9px] font-label font-bold uppercase tracking-widest text-on-surface-variant">
                  Date
                </span>
                <p className="text-sm font-medium">{pass.event.date}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-label font-bold uppercase tracking-widest text-on-surface-variant">
                  Time
                </span>
                <p className="text-sm font-medium">{pass.event.time}</p>
              </div>
              <div className="space-y-1 col-span-2">
                <span className="text-[9px] font-label font-bold uppercase tracking-widest text-on-surface-variant">
                  Location
                </span>
                <p className="text-sm font-medium">{pass.event.location}</p>
              </div>
            </div>
            <div className="relative flex items-center">
              <div className="absolute -left-10 w-6 h-6 rounded-full bg-background" />
              <div className="flex-1 border-t border-dashed border-outline-variant/30" />
              <div className="absolute -right-10 w-6 h-6 rounded-full bg-background" />
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden">
                <Image alt={pass.attendee.name} className="object-cover" fill src={pass.attendee.avatar} unoptimized />
              </div>
              <div>
                <p className="font-medium text-sm">{pass.attendee.name}</p>
                <p className="text-xs text-on-surface-variant">
                  {pass.attendee.plusOne && pass.attendee.plusOneName
                    ? `+1 confirmed with ${pass.attendee.plusOneName}`
                    : "Solo RSVP"}
                </p>
              </div>
            </div>
            <div className="flex justify-center py-4">
              <div className="w-40 h-40 rounded-2xl bg-white flex items-center justify-center">
                <div className="space-y-1 text-center px-4">
                  <span className="material-symbols-outlined text-4xl text-black/80">qr_code_2</span>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-black/40">
                    {pass.qrValue}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-sm text-on-surface-variant">
              Host: <span className="text-on-surface font-medium">{pass.event.hostName}</span>
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] text-outline uppercase tracking-widest mt-6">
          Show this pass at the door
        </p>
      </div>
    </div>
  );
}
