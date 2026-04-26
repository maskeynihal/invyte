"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { GlassCard } from "@invyte/ui/glass-card";
import { useMutation, useQuery } from "convex/react";
import { api, type Id } from "@invyte/convex";

export default function GuestRsvpPage() {
  const params = useParams<{ id: Id<"events"> }>();
  const router = useRouter();
  const { user } = useUser();
  const [rsvp, setRsvp] = useState<"going" | "maybe" | "not-going" | null>(
    null,
  );
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    plusOne: false,
    plusOneName: "",
    dietaryRestrictions: "",
  });

  useEffect(() => {
    setFormData((current) => ({
      ...current,
      name: current.name || user?.fullName || user?.firstName || "",
      email: current.email || user?.primaryEmailAddress?.emailAddress || "",
    }));
  }, [user]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const event = useQuery(api.events.getEventRsvpDetails, { id: params.id });
  const submitGuestRsvp = useMutation(api.events.submitGuestRsvp);

  const handleSubmit = async () => {
    if (!rsvp || !formData.name.trim() || !formData.email.trim() || !event || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
    const response = await submitGuestRsvp({
      eventId: event._id,
      name: formData.name.trim(),
      email: formData.email.trim(),
      rsvpStatus: rsvp,
      plusOne: formData.plusOne,
      plusOneName: formData.plusOneName.trim() || undefined,
      dietaryRestrictions: formData.dietaryRestrictions.trim() || undefined,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
        formData.name.trim(),
      )}`,
    });

    router.push(
      `/event/${event._id}/pass/${response.attendeeId}?access=${encodeURIComponent(response.accessToken)}`,
    );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (event === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (event === null) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <p className="text-on-surface-variant mb-4">Event not found.</p>
        <button
          className="btn-primary w-full max-w-xs"
          onClick={() => router.push("/")}
        >
          Return to Discovery
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-body">
      <div className="relative h-56 overflow-hidden">
        <Image
          alt={event.title}
          className="object-cover"
          fill
          src={event.coverImage}
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
          <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-wider backdrop-blur-sm border border-primary/20 inline-block mb-2">
            {event.vibe}
          </span>
          <h1 className="font-headline text-2xl font-black tracking-tight leading-tight">
            {event.title}
          </h1>
        </div>
      </div>

      <div className="px-6 py-6 max-w-md mx-auto space-y-6">
        <GlassCard className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary text-lg">
              calendar_today
            </span>
            <div>
              <p className="font-medium text-sm">{event.date}</p>
              <p className="text-xs text-on-surface-variant">{event.time}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-tertiary text-lg">
              location_on
            </span>
            <p className="font-medium text-sm">{event.location}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-7 h-7 rounded-full overflow-hidden">
              <Image
                alt={event.hostName}
                className="object-cover"
                fill
                src={event.hostAvatar}
                unoptimized
              />
            </div>
            <p className="text-sm text-on-surface-variant">
              Hosted by{" "}
              <span className="text-on-surface font-medium">
                {event.hostName}
              </span>
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <h2 className="font-label font-bold text-xs uppercase tracking-widest text-on-surface-variant mb-3">
            About
          </h2>
          <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap break-words">
            {event.description || "No event description yet."}
          </p>
        </GlassCard>

        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {event.attendees.slice(0, 3).map((attendee) => (
              <div
                key={attendee.id}
                className="relative w-7 h-7 rounded-full overflow-hidden border-2 border-background"
              >
                <Image
                  alt={attendee.name}
                  className="object-cover"
                  fill
                  src={attendee.avatar}
                  unoptimized
                />
              </div>
            ))}
          </div>
          <span className="text-xs text-on-surface-variant">
            <span className="font-bold text-on-surface">
              {event.attendeeCount}
            </span>{" "}
            people going
          </span>
        </div>

        <div className="space-y-3">
          <label className="label-text">Will you be there?</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                value: "going",
                label: "Going! 🎉",
                activeColor:
                  "border-primary bg-primary/20 text-primary shadow-neon-purple",
              },
              {
                value: "maybe",
                label: "Maybe 🤔",
                activeColor:
                  "border-secondary bg-secondary/20 text-secondary shadow-neon-cyan",
              },
              {
                value: "not-going",
                label: "Can't 😢",
                activeColor: "border-error bg-error/20 text-error",
              },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  setRsvp(option.value as "going" | "maybe" | "not-going")
                }
                className={`py-4 rounded-2xl border font-label font-bold text-sm transition-all active:scale-95 ${
                  rsvp === option.value
                    ? option.activeColor
                    : "border-outline-variant/20 text-on-surface-variant hover:border-outline-variant/40"
                }`}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {rsvp && (
          <div className="space-y-4 animate-slide-up">
            <div className="space-y-2">
              <label className="label-text">Your Name</label>
              <input
                className="input-field"
                placeholder="Enter your name"
                value={formData.name}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="label-text">Email</label>
              <input
                className="input-field"
                placeholder="you@email.com"
                type="email"
                value={formData.email}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </div>

            {rsvp === "going" && event.allowPlusOne && (
              <>
                <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary">
                      group_add
                    </span>
                    <div>
                      <p className="font-label font-bold text-sm">
                        Bringing a +1?
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        Add a guest
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setFormData((current) => ({
                        ...current,
                        plusOne: !current.plusOne,
                      }))
                    }
                    className={`w-12 h-7 rounded-full transition-all duration-300 relative ${
                      formData.plusOne
                        ? "bg-secondary"
                        : "bg-surface-container-highest"
                    }`}
                    type="button"
                  >
                    <div
                      className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-300 ${
                        formData.plusOne ? "left-6" : "left-1"
                      }`}
                    />
                  </button>
                </div>

                {formData.plusOne && (
                  <div className="space-y-2 animate-slide-up">
                    <label className="label-text">+1 Name</label>
                    <input
                      className="input-field"
                      placeholder="Your guest's name"
                      value={formData.plusOneName}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          plusOneName: event.target.value,
                        }))
                      }
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="label-text">
                    Anything else the host should know?
                  </label>
                  <input
                    className="input-field"
                    placeholder="Dietary choices, arrival time..."
                    value={formData.dietaryRestrictions}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        dietaryRestrictions: event.target.value,
                      }))
                    }
                  />
                </div>
              </>
            )}

            <button
              className="btn-primary mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              onClick={handleSubmit}
              disabled={!formData.name.trim() || !formData.email.trim() || isSubmitting}
              type="button"
            >
              {isSubmitting && (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
              {isSubmitting ? "Confirming..." : "Confirm RSVP"}
            </button>
          </div>
        )}

        <p className="text-center text-[10px] text-outline uppercase tracking-widest">
          No account needed • Powered by Invyte
        </p>
      </div>
    </div>
  );
}
