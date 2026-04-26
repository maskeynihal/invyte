"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { RsvpButton } from "@invyte/ui/rsvp-button";
import { GlassCard } from "@invyte/ui/glass-card";
import AppShell from "@/components/AppShell";
import { useMutation, useQuery } from "convex/react";
import { api, type Id } from "@invyte/convex";

type EventDetailScreenProps = {
  accessToken?: string | null;
  eventId: Id<"events">;
  publicAccess?: boolean;
};

export default function EventDetailScreen({
  accessToken,
  eventId,
  publicAccess = false,
}: Readonly<EventDetailScreenProps>) {
  const router = useRouter();
  const { user } = useUser();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const access = useQuery(api.users.getCurrentUserAccess);
  const canUploadImages =
    !publicAccess && (access?.effectiveFeatures.canImageUpdate ?? false);
  const canViewEventImages =
    Boolean(accessToken) ||
    (!publicAccess && (access?.effectiveFeatures.canImageViewFromEvents ?? false));
  const event = useQuery(api.events.getEventById, {
    id: eventId,
    accessToken: accessToken ?? undefined,
  });
  const attendeeResponses = useQuery(
    api.events.getAttendees,
    event && event.isHost ? { eventId } : "skip",
  );
  const comments = useQuery(api.events.getComments, {
    eventId,
    accessToken: accessToken ?? undefined,
  });
  const galleryPhotos = useQuery(
    api.events.getGalleryPhotos,
    canViewEventImages
      ? { eventId, accessToken: accessToken ?? undefined }
      : "skip",
  );
  const upsertMemberRsvp = useMutation(api.events.upsertMemberRsvp);
  const addCommentMutation = useMutation(api.events.addComment);
  const toggleCommentReactionMutation = useMutation(
    api.events.toggleCommentReaction,
  );
  const toggleEventLikeMutation = useMutation(api.events.toggleEventLike);
  const generateUploadUrl = useMutation(api.events.generateUploadUrl);
  const addGalleryPhotoMutation = useMutation(api.events.addGalleryPhoto);

  const planHref = event
    ? publicAccess
      ? `/event/${event._id}/details/plan?access=${encodeURIComponent(
          accessToken ?? "",
        )}`
      : `/event/${event._id}/plan`
    : null;

  const handleAddComment = async () => {
    const trimmedComment = newComment.trim();
    if (
      !trimmedComment ||
      isSubmittingComment ||
      !event?.viewerCanInteract
    ) {
      return;
    }

    setIsSubmittingComment(true);
    try {
      await addCommentMutation({
        eventId,
        text: trimmedComment,
        accessToken: accessToken ?? undefined,
      });
      setNewComment("");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleRsvpSelect = async (
    status: "going" | "maybe" | "not-going" | null,
  ) => {
    if (!status || publicAccess) {
      return;
    }

    const attendeeId = await upsertMemberRsvp({
      eventId,
      rsvpStatus: status,
    });

    if (status === "going") {
      router.push(`/event/${eventId}/pass/${attendeeId}`);
    }
  };

  const handleLikeToggle = async () => {
    if (!event?.viewerCanInteract) {
      return;
    }

    await toggleEventLikeMutation({
      eventId,
      accessToken: accessToken ?? undefined,
    });
  };

  const handleCopyRsvpLink = async () => {
    if (!event) {
      return;
    }

    const shareUrl = `${window.location.origin}/event/${event._id}/rsvp`;
    await navigator.clipboard.writeText(shareUrl);
  };

  const handleSendInvitationEmail = () => {
    if (!event) {
      return;
    }

    const viewerEmail =
      event.viewerEmail ?? user?.primaryEmailAddress?.emailAddress ?? "";
    const hostEmail = event.hostEmail ?? "";
    const rsvpLink = `${window.location.origin}/event/${event._id}/rsvp`;
    const passLink = event.currentUserRsvp?.id
      ? `${window.location.origin}/event/${event._id}/pass/${event.currentUserRsvp.id}`
      : "Pass link available after RSVP";

    const subject = `Invitation: ${event.title}`;
    const bodyLines = [
      `From: ${viewerEmail || "(your email)"}`,
      `Event: ${event.title}`,
      `Date: ${event.date}`,
      `Time: ${event.time}`,
      `Location: ${event.location}`,
      "",
      "About:",
      event.description || "No event description yet.",
      "",
      `RSVP Link: ${rsvpLink}`,
      `Event Pass Link: ${passLink}`,
    ];

    const params = new URLSearchParams({
      subject,
      body: bodyLines.join("\n"),
      ...(hostEmail ? { cc: hostEmail } : {}),
    });

    window.location.href = `mailto:${viewerEmail}?${params.toString()}`;
  };

  const handleCommentReaction = async (
    commentId: Id<"comments">,
    emoji: "🔥" | "🎉" | "❤️",
  ) => {
    if (!event?.viewerCanInteract) {
      return;
    }

    await toggleCommentReactionMutation({
      commentId,
      emoji,
      accessToken: accessToken ?? undefined,
    });
  };

  const handleGalleryUpload = async (selectedFile: File | null) => {
    if (!selectedFile || isUploadingPhoto) {
      return;
    }

    if (!canUploadImages) {
      setPhotoError("Image upload is disabled for your account.");
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoError(null);
    try {
      const uploadUrl = await generateUploadUrl();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": selectedFile.type,
        },
        body: selectedFile,
      });

      if (!uploadResult.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = (await uploadResult.json()) as {
        storageId: Id<"_storage">;
      };

      await addGalleryPhotoMutation({
        eventId,
        storageId,
        caption: selectedFile.name.replace(/\.[a-z0-9]+$/i, ""),
      });
    } catch (error) {
      setPhotoError(
        error instanceof Error ? error.message : "Failed to upload photo.",
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  if (
    event === undefined ||
    comments === undefined ||
    (!publicAccess && access === undefined) ||
    (canViewEventImages && galleryPhotos === undefined) ||
    (event?.isHost && attendeeResponses === undefined)
  ) {
    return (
      <AppShell>
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  const resolvedGalleryPhotos = canViewEventImages ? (galleryPhotos ?? []) : [];

  if (event === null) {
    return (
      <AppShell>
        <div className="text-center py-20">
          <p>Event not found.</p>
          <button className="btn-primary mt-4" onClick={() => router.push("/")}>
            Go Home
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="relative -mx-4 -mt-4 mb-6 animate-fade-in">
        <div className="relative h-64 overflow-hidden rounded-b-3xl">
          <Image
            alt={event.title}
            className="object-cover"
            fill
            src={event.coverImage}
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
          <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-wider backdrop-blur-sm border border-primary/20 inline-block mb-3">
            {event.vibe}
          </span>
          <h1 className="font-headline text-3xl font-black tracking-tight leading-tight text-on-surface">
            {event.title}
          </h1>
        </div>
      </div>

      <section className="space-y-4 mb-6 animate-slide-up">
        <div className="flex items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined text-secondary">
            calendar_today
          </span>
          <div>
            <p className="font-medium text-on-surface text-sm">{event.date}</p>
            <p className="text-xs">{event.time}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined text-tertiary">
            location_on
          </span>
          <p className="font-medium text-on-surface text-sm">
            {event.location}
          </p>
        </div>
        <div className="flex items-center gap-3 text-on-surface-variant">
          <div className="relative w-8 h-8 rounded-full overflow-hidden">
            <Image
              alt={event.hostName}
              className="object-cover"
              fill
              src={event.hostAvatar}
              unoptimized
            />
          </div>
          <div>
            <p className="text-xs text-on-surface-variant">Hosted by</p>
            <p className="font-medium text-on-surface text-sm">
              {event.hostName}
            </p>
          </div>
        </div>
      </section>

      <GlassCard className="p-4 mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-[10px] font-label font-bold uppercase tracking-[0.2em] text-outline">
              Social Pulse
            </p>
            <h2 className="font-headline text-lg font-bold mt-1">
              Live Event Activity
            </h2>
          </div>
          <button
            className={`px-4 py-2 rounded-full border font-label font-bold uppercase text-xs tracking-wider transition-all ${
              event.viewerHasLiked
                ? "bg-primary/20 text-primary border-primary/30"
                : "border-outline-variant/20 text-on-surface-variant"
            } ${event.viewerCanInteract ? "" : "opacity-60"}`}
            disabled={!event.viewerCanInteract}
            onClick={handleLikeToggle}
            type="button"
          >
            {event.viewerHasLiked ? "Liked" : "Like"} · {event.likeCount}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="font-headline text-2xl font-black text-primary">
              {event.attendeeCount}
            </p>
            <p className="text-[10px] font-label uppercase tracking-wider text-on-surface-variant">
              Going
            </p>
          </div>
          <div>
            <p className="font-headline text-2xl font-black text-secondary">
              {event.commentCount}
            </p>
            <p className="text-[10px] font-label uppercase tracking-wider text-on-surface-variant">
              Comments
            </p>
          </div>
          <div>
            <p className="font-headline text-2xl font-black text-tertiary">
              {event.photoCount}
            </p>
            <p className="text-[10px] font-label uppercase tracking-wider text-on-surface-variant">
              Photos
            </p>
          </div>
        </div>
      </GlassCard>

      <section className="mb-6 animate-slide-up">
        <div className="flex items-center justify-between mb-3">
          <label className="label-text block">Your RSVP</label>
          {event.currentUserRsvp?.rsvpStatus === "going" && (
            <button
              className="text-xs font-label font-bold text-primary uppercase tracking-wider"
              onClick={() =>
                router.push(`/event/${event._id}/pass/${event.currentUserRsvp?.id}`)
              }
              type="button"
            >
              Open Pass
            </button>
          )}
        </div>
        {publicAccess ? (
          <GlassCard className="p-4">
            <p className="text-sm text-on-surface">
              RSVP status:{" "}
              <span className="font-bold capitalize">
                {event.currentUserRsvp?.rsvpStatus ?? "confirmed"}
              </span>
            </p>
          </GlassCard>
        ) : (
          <RsvpButton
            status={event.currentUserRsvp?.rsvpStatus ?? null}
            onSelect={handleRsvpSelect}
          />
        )}
      </section>

      <GlassCard className="p-5 mb-6">
        <h2 className="font-label font-bold text-xs uppercase tracking-widest text-on-surface-variant mb-3">
          About
        </h2>
        <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap break-words">
          {event.description || "No event description yet."}
        </p>
      </GlassCard>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline text-lg font-bold">
            Who&apos;s Going{" "}
            <span className="text-primary">({event.attendeeCount})</span>
          </h2>
          <button
            className="text-xs font-label font-bold text-primary uppercase tracking-wider"
            onClick={handleCopyRsvpLink}
            type="button"
          >
            Copy RSVP Link
          </button>
        </div>
        <div className="flex -space-x-3 mb-2">
          {event.attendees.map((attendee) => (
            <div
              key={attendee.id}
              className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-background"
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
          {event.attendeeCount > event.attendees.length && (
            <div className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-background flex items-center justify-center">
              <span className="text-xs font-bold text-on-surface-variant">
                +{event.attendeeCount - event.attendees.length}
              </span>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <button
          className="glass-card rounded-2xl p-3 flex flex-col items-center gap-1.5 border border-outline-variant/15 active:scale-95 transition-all disabled:opacity-50"
          disabled={!event.viewerCanOpenPlan || !planHref}
          onClick={() => planHref && router.push(planHref)}
          type="button"
        >
          <span className="material-symbols-outlined text-primary text-lg">
            checklist
          </span>
          <span className="text-[9px] font-label font-bold uppercase tracking-wider text-on-surface-variant">
            Plan
          </span>
        </button>
        <button
          className="glass-card rounded-2xl p-3 flex flex-col items-center gap-1.5 border border-outline-variant/15 active:scale-95 transition-all disabled:opacity-50"
          disabled={!canUploadImages}
          onClick={() => {
            if (!canUploadImages) {
              setPhotoError("Image upload is disabled for your account.");
              return;
            }
            photoInputRef.current?.click();
          }}
          type="button"
        >
          <span className="material-symbols-outlined text-secondary text-lg">
            photo_library
          </span>
          <span className="text-[9px] font-label font-bold uppercase tracking-wider text-on-surface-variant">
            {isUploadingPhoto
              ? "Uploading"
              : canUploadImages
                ? "Photos"
                : "No Upload"}
          </span>
        </button>
        <button
          className="glass-card rounded-2xl p-3 flex flex-col items-center gap-1.5 border border-outline-variant/15 active:scale-95 transition-all"
          onClick={handleSendInvitationEmail}
          type="button"
        >
          <span className="material-symbols-outlined text-tertiary text-lg">
            outgoing_mail
          </span>
          <span className="text-[9px] font-label font-bold uppercase tracking-wider text-on-surface-variant">
            Invite
          </span>
        </button>
      </div>

      {!event.viewerCanInteract && (
        <GlassCard className="p-4 mb-6">
          <p className="text-sm text-on-surface-variant">
            RSVP first to unlock comments, reactions, and the shared event plan.
          </p>
        </GlassCard>
      )}

      {event.isHost && attendeeResponses && (
        <section className="mb-6">
          <h2 className="font-headline text-lg font-bold mb-4">
            RSVP <span className="gradient-text">Responses</span>
          </h2>

          {attendeeResponses.length === 0 ? (
            <GlassCard className="p-5">
              <p className="text-sm text-on-surface-variant">
                No RSVP responses yet.
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {attendeeResponses.map((attendee) => (
                <GlassCard key={attendee._id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-on-surface">
                        {attendee.name}
                      </p>
                      {attendee.email && (
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {attendee.email}
                        </p>
                      )}
                      <p className="text-xs text-on-surface-variant mt-1">
                        Source: {attendee.responseSource ?? "guest"}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      {attendee.rsvpStatus}
                    </span>
                  </div>

                  {(attendee.plusOne ||
                    attendee.plusOneName ||
                    attendee.dietaryRestrictions) && (
                    <div className="mt-3 border-t border-outline-variant/20 pt-3 text-xs text-on-surface-variant space-y-1">
                      <p>
                        Plus one:{" "}
                        {attendee.plusOne
                          ? attendee.plusOneName || "Yes"
                          : "No"}
                      </p>
                      {attendee.dietaryRestrictions && (
                        <p>Notes: {attendee.dietaryRestrictions}</p>
                      )}
                    </div>
                  )}
                </GlassCard>
              ))}
            </div>
          )}
        </section>
      )}

      <input
        ref={photoInputRef}
        accept="image/*"
        className="hidden"
        onChange={(event) =>
          handleGalleryUpload(event.target.files?.[0] ?? null)
        }
        type="file"
      />

      <section className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline text-lg font-bold">
            Gallery <span className="gradient-text">Moments</span>
          </h2>
          <span className="text-xs font-label font-bold text-outline uppercase tracking-wider">
            {resolvedGalleryPhotos.length} item
            {resolvedGalleryPhotos.length === 1 ? "" : "s"}
          </span>
        </div>
        {!canViewEventImages ? (
          <GlassCard className="p-5">
            <p className="text-sm text-on-surface-variant">
              Image viewing is disabled for your account.
            </p>
          </GlassCard>
        ) : resolvedGalleryPhotos.length === 0 ? (
          <GlassCard className="p-5">
            <p className="text-sm text-on-surface-variant">
              No gallery shots yet. Upload the first photo from this event.
            </p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {resolvedGalleryPhotos.map((photo) => (
              <div
                key={photo._id}
                className="glass-card rounded-2xl overflow-hidden"
              >
                <div className="relative h-36">
                  <Image
                    alt={photo.caption || photo.uploadedByName}
                    className="object-cover"
                    fill
                    src={photo.url}
                    unoptimized
                  />
                </div>
                <div className="p-3">
                  <p className="text-xs font-medium text-on-surface truncate">
                    {photo.caption || "Shared from the event"}
                  </p>
                  <p className="text-[10px] text-on-surface-variant mt-1">
                    by {photo.uploadedByName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        {photoError && <p className="text-xs text-red-300 mt-2">{photoError}</p>}
      </section>

      <section className="mb-6">
        <h2 className="font-headline text-lg font-bold mb-4">
          Event <span className="gradient-text">Feed</span>
        </h2>

        <div className="flex gap-2 mb-6">
          <input
            className="flex-1 bg-surface-container-lowest rounded-2xl px-4 py-2 text-sm text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary focus:outline-none transition-all"
            placeholder={
              event.viewerCanInteract
                ? "Drop a message..."
                : "RSVP to join the event conversation"
            }
            value={newComment}
            onChange={(event) => setNewComment(event.target.value)}
          />
          <button
            className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center active:scale-95 transition-all disabled:opacity-50"
            disabled={
              !newComment.trim() ||
              isSubmittingComment ||
              !event.viewerCanInteract
            }
            onClick={handleAddComment}
            type="button"
          >
            <span className="material-symbols-outlined text-sm">send</span>
          </button>
        </div>

        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-4">
              No comments yet. Be the first!
            </p>
          ) : (
            comments.map((comment) => (
              <GlassCard key={comment._id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      alt={comment.userName}
                      className="object-cover"
                      fill
                      src={comment.userAvatar}
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-label font-bold text-xs text-on-surface">
                        {comment.userName}
                      </span>
                      <span className="text-[10px] text-outline">
                        {new Date(comment.timestamp).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface leading-relaxed">
                      {comment.text}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {comment.reactions.map((reaction) => (
                        <button
                          key={`${comment._id}-${reaction.emoji}`}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
                            reaction.viewerHasReacted
                              ? "bg-primary/15 text-primary border border-primary/20"
                              : "bg-surface-container-high text-on-surface-variant"
                          } ${event.viewerCanInteract ? "" : "opacity-60"}`}
                          disabled={!event.viewerCanInteract}
                          onClick={() =>
                            handleCommentReaction(comment._id, reaction.emoji)
                          }
                          type="button"
                        >
                          <span>{reaction.emoji}</span>
                          <span>{reaction.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}
