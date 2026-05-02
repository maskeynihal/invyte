"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { RsvpButton } from "@invyte/ui/rsvp-button";
import { GlassCard } from "@invyte/ui/glass-card";
import AppShell from "@/components/AppShell";
import { useMutation, useQuery } from "convex/react";
import { api, type Id } from "@invyte/convex";
import { toast } from "@/components/Toaster";
import { downloadIcsFile } from "@/lib/calendar";

type RsvpStatus = "going" | "maybe" | "not-going" | null;

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
  const copyFeedbackTimeoutRef = useRef<number | null>(null);
  const hostCleanupRequestedRef = useRef(false);
  const [newComment, setNewComment] = useState("");
  const [memberRsvpStatus, setMemberRsvpStatus] = useState<RsvpStatus>(null);
  const [memberRsvpForm, setMemberRsvpForm] = useState({
    plusOne: false,
    plusOneName: "",
    dietaryRestrictions: "",
  });
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isSavingRsvp, setIsSavingRsvp] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isChangingRsvp, setIsChangingRsvp] = useState(false);
  const [isPublicSaving, setIsPublicSaving] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const access = useQuery(api.users.getCurrentUserAccess);
  const canUploadImages =
    !publicAccess && (access?.effectiveFeatures.canImageUpdate ?? false);
  const canViewEventImages =
    Boolean(accessToken) ||
    (!publicAccess &&
      (access?.effectiveFeatures.canImageViewFromEvents ?? false));
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
  const updateAccessTokenRsvp = useMutation(api.events.updateAccessTokenRsvp);
  const clearHostRsvp = useMutation(api.events.clearHostRsvp);
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
  const canViewGoingAttendees = event?.viewerCanSeeAttendees ?? false;

  useEffect(() => {
    if (!event || publicAccess || event.isHost) {
      return;
    }

    setMemberRsvpStatus(event.currentUserRsvp?.rsvpStatus ?? null);
    setMemberRsvpForm({
      plusOne: event.currentUserRsvp?.plusOne ?? false,
      plusOneName: event.currentUserRsvp?.plusOneName ?? "",
      dietaryRestrictions: event.currentUserRsvp?.dietaryRestrictions ?? "",
    });
  }, [event, publicAccess]);

  useEffect(() => {
    if (!event?.isHost || hostCleanupRequestedRef.current) {
      return;
    }

    hostCleanupRequestedRef.current = true;
    void clearHostRsvp({ eventId });
  }, [clearHostRsvp, event?.isHost, eventId]);

  const handleAddComment = async () => {
    const trimmedComment = newComment.trim();
    if (!trimmedComment || isSubmittingComment || !event?.viewerCanInteract) {
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

  const handleRsvpSelect = (status: RsvpStatus) => {
    if (!status) {
      return;
    }

    setMemberRsvpStatus(status);
  };

  const handleSaveRsvp = async () => {
    if (!event || !memberRsvpStatus || isSavingRsvp) return;

    setIsSavingRsvp(true);
    try {
      const response = await upsertMemberRsvp({
        eventId,
        rsvpStatus: memberRsvpStatus,
        plusOne: memberRsvpStatus === "going" ? memberRsvpForm.plusOne : false,
        plusOneName:
          memberRsvpStatus === "going"
            ? memberRsvpForm.plusOneName.trim() || undefined
            : undefined,
        dietaryRestrictions:
          memberRsvpStatus === "going"
            ? memberRsvpForm.dietaryRestrictions.trim() || undefined
            : undefined,
      });

      setIsChangingRsvp(false);

      if (memberRsvpStatus === "going") {
        const search = response.accessToken
          ? `?access=${encodeURIComponent(response.accessToken)}`
          : "";
        router.push(`/event/${eventId}/pass/${response.attendeeId}${search}`);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save RSVP", "error");
    } finally {
      setIsSavingRsvp(false);
    }
  };

  const handlePublicRsvpSelect = async (status: RsvpStatus) => {
    if (!status || isPublicSaving) return;

    setIsPublicSaving(true);
    try {
      const response =
        publicAccess && accessToken
          ? await updateAccessTokenRsvp({
              eventId,
              accessToken,
              rsvpStatus: status,
            })
          : await upsertMemberRsvp({
              eventId,
              rsvpStatus: status,
            });

      if (status === "going") {
        const search = response.accessToken
          ? `?access=${encodeURIComponent(response.accessToken)}`
          : "";
        router.push(`/event/${eventId}/pass/${response.attendeeId}${search}`);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save RSVP", "error");
    } finally {
      setIsPublicSaving(false);
    }
  };

  const handleLikeToggle = async () => {
    if (!event?.viewerCanInteract || isLiking) {
      return;
    }

    setIsLiking(true);
    try {
      await toggleEventLikeMutation({
        eventId,
        accessToken: accessToken ?? undefined,
      });
    } finally {
      setIsLiking(false);
    }
  };

  const showCopyFeedback = (message: string) => {
    if (copyFeedbackTimeoutRef.current) {
      window.clearTimeout(copyFeedbackTimeoutRef.current);
    }

    setCopyFeedback(message);
    copyFeedbackTimeoutRef.current = window.setTimeout(() => {
      setCopyFeedback(null);
      copyFeedbackTimeoutRef.current = null;
    }, 2200);
  };

  const handleAddToCalendar = () => {
    if (!event) return;
    const success = downloadIcsFile({
      id: event._id,
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      url: `${window.location.origin}/event/${event._id}`,
    });
    if (success) {
      toast("Calendar file downloaded");
    } else {
      toast("Event date is not set yet", "error");
    }
  };

  const handleCopyRsvpLink = async () => {
    if (!event) {
      return;
    }

    const shareUrl = `${window.location.origin}/event/${event._id}/rsvp`;
    await navigator.clipboard.writeText(shareUrl);
    showCopyFeedback("RSVP link copied");
  };

  const handleSendInvitationEmail = () => {
    if (!event) {
      return;
    }

    const viewerEmail =
      event.viewerEmail ?? user?.primaryEmailAddress?.emailAddress ?? "";
    const hostEmail = event.hostEmail ?? "";
    const rsvpLink = `${window.location.origin}/event/${event._id}/rsvp`;
    const passLink =
      event.currentUserRsvp?.id && event.currentUserRsvp.accessToken
        ? `${window.location.origin}/event/${event._id}/pass/${event.currentUserRsvp.id}?access=${encodeURIComponent(event.currentUserRsvp.accessToken)}`
        : event.currentUserRsvp?.id
          ? `${window.location.origin}/event/${event._id}/pass/${event.currentUserRsvp.id}`
          : "Pass link available after RSVP";

    const bodyLines = [
      `From: ${viewerEmail || "(your email app will choose the sender)"}`,
      `To: ${viewerEmail || "(your email)"}`,
      ...(hostEmail ? [`CC: ${hostEmail}`] : []),
      "",
      `Event: ${event.title}`,
      `Host: ${event.hostName}`,
      `Category: ${event.category}`,
      `Vibe: ${event.vibe}`,
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
      subject: `Invitation: ${event.title}`,
      body: bodyLines.join("\n"),
      ...(hostEmail ? { cc: hostEmail } : {}),
    });

    window.location.href = `mailto:${viewerEmail}?${params.toString()}`;
  };

  const handleCopyPassLink = async (
    attendeeId: Id<"attendees">,
    attendeeAccessToken?: string | null,
  ) => {
    if (!event) {
      return;
    }

    const search = attendeeAccessToken
      ? `?access=${encodeURIComponent(attendeeAccessToken)}`
      : "";
    const passUrl = `${window.location.origin}/event/${event._id}/pass/${attendeeId}${search}`;
    await navigator.clipboard.writeText(passUrl);
    showCopyFeedback("Pass link copied");
  };

  const handleSendPassEmail = ({
    attendeeId,
    attendeeName,
    attendeeEmail,
    attendeeAccessToken,
  }: {
    attendeeId: Id<"attendees">;
    attendeeName: string;
    attendeeEmail?: string | null;
    attendeeAccessToken?: string | null;
  }) => {
    if (!event || !attendeeEmail) {
      return;
    }

    const passUrl = `${window.location.origin}/event/${event._id}/pass/${attendeeId}${
      attendeeAccessToken
        ? `?access=${encodeURIComponent(attendeeAccessToken)}`
        : ""
    }`;
    const eventDetailsUrl = attendeeAccessToken
      ? `${window.location.origin}/event/${event._id}/details?access=${encodeURIComponent(attendeeAccessToken)}`
      : `${window.location.origin}/event/${event._id}/rsvp`;

    const params = new URLSearchParams({
      subject: `Your event pass for ${event.title}`,
      body: [
        `Hi ${attendeeName},`,
        "",
        `Here is your pass for ${event.title}.`,
        `Date: ${event.date}`,
        `Time: ${event.time}`,
        `Location: ${event.location}`,
        "",
        `Open pass: ${passUrl}`,
        `Event details: ${eventDetailsUrl}`,
      ].join("\n"),
    });

    window.location.href = `mailto:${attendeeEmail}?${params.toString()}`;
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

  const viewerEmail =
    event.viewerEmail ?? user?.primaryEmailAddress?.emailAddress ?? "";
  const viewerName =
    user?.fullName || user?.firstName || event.viewerName || "";

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
            className={`px-4 py-2 rounded-full border font-label font-bold uppercase text-xs tracking-wider transition-all flex items-center gap-1.5 ${
              event.viewerHasLiked
                ? "bg-primary/20 text-primary border-primary/30"
                : "border-outline-variant/20 text-on-surface-variant"
            } ${event.viewerCanInteract && !isLiking ? "" : "opacity-60"}`}
            disabled={!event.viewerCanInteract || isLiking}
            onClick={handleLikeToggle}
            type="button"
          >
            {isLiking && (
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
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
          <label className="label-text block">
            {event.isHost ? "Host Status" : "Are you coming?"}
          </label>
          {event.currentUserRsvp?.rsvpStatus === "going" && (
            <div className="flex items-center gap-3">
              <button
                className="text-xs font-label font-bold text-primary uppercase tracking-wider"
                onClick={() => {
                  const search = event.currentUserRsvp?.accessToken
                    ? `?access=${encodeURIComponent(event.currentUserRsvp.accessToken)}`
                    : "";
                  router.push(
                    `/event/${event._id}/pass/${event.currentUserRsvp?.id}${search}`,
                  );
                }}
                type="button"
              >
                Open Pass
              </button>
              <button
                className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider"
                onClick={() =>
                  handleCopyPassLink(
                    event.currentUserRsvp?.id as Id<"attendees">,
                    event.currentUserRsvp?.accessToken,
                  )
                }
                type="button"
              >
                Copy Pass Link
              </button>
            </div>
          )}
        </div>
        {event.isHost ? (
          <GlassCard className="p-4">
            <p className="text-sm text-on-surface">
              You&apos;re the host for this event, so you don&apos;t need to
              RSVP.
            </p>
            <p className="text-xs text-on-surface-variant mt-2">
              Guests will see you as the host instead of as an attendee.
            </p>
          </GlassCard>
        ) : publicAccess ? (
          <div className="space-y-3">
            {event.currentUserRsvp?.rsvpStatus && !isPublicSaving && (
              <GlassCard className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-label font-bold uppercase tracking-wider text-outline mb-1">
                      Your Response
                    </p>
                    <p className="font-label font-bold text-sm text-on-surface">
                      {event.currentUserRsvp.rsvpStatus === "going" && "You're going! 🎉"}
                      {event.currentUserRsvp.rsvpStatus === "maybe" && "You said maybe 🤔"}
                      {event.currentUserRsvp.rsvpStatus === "not-going" && "You can't make it 😢"}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                </div>
                {event.currentUserRsvp.rsvpStatus !== "not-going" && (
                  <button
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl border border-secondary/30 bg-secondary/10 text-secondary text-xs font-label font-bold uppercase tracking-wider active:scale-95 transition-all"
                    onClick={handleAddToCalendar}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-base">
                      calendar_add_on
                    </span>
                    Add to Calendar
                  </button>
                )}
              </GlassCard>
            )}
            <p className="text-xs text-on-surface-variant">
              {event.currentUserRsvp?.rsvpStatus
                ? "Want to change your mind? Tap a response below."
                : "Let the host know if you're coming — tap a response."}
            </p>
            {isPublicSaving ? (
              <div className="flex justify-center py-5">
                <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <RsvpButton
                disabled={isPublicSaving}
                status={event.currentUserRsvp?.rsvpStatus ?? null}
                onSelect={handlePublicRsvpSelect}
              />
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {event.currentUserRsvp && !isChangingRsvp ? (
              <GlassCard className="p-4 space-y-3">
                <p className="text-[10px] font-label font-bold uppercase tracking-wider text-outline">
                  Your Response
                </p>
                <div className="flex items-center justify-between">
                  <p className="font-label font-bold text-base text-on-surface">
                    {memberRsvpStatus === "going" && "You're going! 🎉"}
                    {memberRsvpStatus === "maybe" && "You said maybe 🤔"}
                    {memberRsvpStatus === "not-going" && "You can't make it 😢"}
                  </p>
                  <button
                    className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider underline underline-offset-2"
                    onClick={() => setIsChangingRsvp(true)}
                    type="button"
                  >
                    Change
                  </button>
                </div>
                {memberRsvpStatus !== "not-going" && (
                  <button
                    className="w-full mt-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl border border-secondary/30 bg-secondary/10 text-secondary text-xs font-label font-bold uppercase tracking-wider active:scale-95 transition-all"
                    onClick={handleAddToCalendar}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-base">
                      calendar_add_on
                    </span>
                    Add to Calendar
                  </button>
                )}
              </GlassCard>
            ) : (
              <>
                <p className="text-xs text-on-surface-variant">
                  {event.currentUserRsvp
                    ? "Update your response — tap a new option."
                    : "Let the host know if you'll be there."}
                </p>
                <RsvpButton
                  disabled={isSavingRsvp}
                  status={memberRsvpStatus}
                  onSelect={handleRsvpSelect}
                />
              </>
            )}

            {memberRsvpStatus && (!event.currentUserRsvp || isChangingRsvp) && (
              <GlassCard className="p-4 space-y-4 animate-slide-up">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="label-text">Name</label>
                    <input
                      className="input-field opacity-80"
                      readOnly
                      value={viewerName}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label-text">Email</label>
                    <input
                      className="input-field opacity-80"
                      readOnly
                      type="email"
                      value={viewerEmail}
                    />
                  </div>
                </div>

                {memberRsvpStatus === "going" && event.allowPlusOne && (
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
                          setMemberRsvpForm((current) => ({
                            ...current,
                            plusOne: !current.plusOne,
                            plusOneName: current.plusOne
                              ? ""
                              : current.plusOneName,
                          }))
                        }
                        className={`w-12 h-7 rounded-full transition-all duration-300 relative ${
                          memberRsvpForm.plusOne
                            ? "bg-secondary"
                            : "bg-surface-container-highest"
                        }`}
                        type="button"
                      >
                        <div
                          className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-300 ${
                            memberRsvpForm.plusOne ? "left-6" : "left-1"
                          }`}
                        />
                      </button>
                    </div>

                    {memberRsvpForm.plusOne && (
                      <div className="space-y-2 animate-slide-up">
                        <label className="label-text">+1 Name</label>
                        <input
                          className="input-field"
                          placeholder="Your guest's name"
                          value={memberRsvpForm.plusOneName}
                          onChange={(inputEvent) =>
                            setMemberRsvpForm((current) => ({
                              ...current,
                              plusOneName: inputEvent.target.value,
                            }))
                          }
                        />
                      </div>
                    )}
                  </>
                )}

                {memberRsvpStatus === "going" && (
                  <div className="space-y-2">
                    <label className="label-text">
                      Anything else the host should know?
                    </label>
                    <input
                      className="input-field"
                      placeholder="Add a note for the host"
                      value={memberRsvpForm.dietaryRestrictions}
                      onChange={(inputEvent) =>
                        setMemberRsvpForm((current) => ({
                          ...current,
                          dietaryRestrictions: inputEvent.target.value,
                        }))
                      }
                    />
                  </div>
                )}

                <button
                  className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={isSavingRsvp}
                  onClick={handleSaveRsvp}
                  type="button"
                >
                  {isSavingRsvp && (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  {isSavingRsvp
                    ? "Saving..."
                    : memberRsvpStatus === "going"
                      ? "Confirm — I'm Going!"
                      : memberRsvpStatus === "maybe"
                        ? "Save Response"
                        : "Save Response"}
                </button>

                {isChangingRsvp && (
                  <button
                    className="w-full text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider py-2"
                    onClick={() => {
                      setIsChangingRsvp(false);
                      setMemberRsvpStatus(event.currentUserRsvp?.rsvpStatus ?? null);
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                )}
              </GlassCard>
            )}
          </div>
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
        {canViewGoingAttendees ? (
          <div className="space-y-3">
            <div className="flex -space-x-3">
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

            <div className="space-y-2">
              {event.attendees.map((attendee) => (
                <GlassCard key={`${attendee.id}-name`} className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative w-9 h-9 rounded-full overflow-hidden">
                      <Image
                        alt={attendee.name}
                        className="object-cover"
                        fill
                        src={attendee.avatar}
                        unoptimized
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-on-surface truncate">
                        {attendee.name}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {attendee.plusOne && attendee.plusOneName
                          ? `Bringing ${attendee.plusOneName}`
                          : "Going"}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        ) : (
          <GlassCard className="p-4">
            <p className="text-sm text-on-surface-variant">
              RSVP as{" "}
              <span className="font-semibold text-on-surface">Going</span> to
              see who else is attending.
            </p>
          </GlassCard>
        )}
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
          disabled={!canUploadImages || isUploadingPhoto}
          onClick={() => {
            if (!canUploadImages) {
              setPhotoError("Image upload is disabled for your account.");
              return;
            }
            photoInputRef.current?.click();
          }}
          type="button"
        >
          {isUploadingPhoto ? (
            <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-secondary text-lg">
              photo_library
            </span>
          )}
          <span className="text-[9px] font-label font-bold uppercase tracking-wider text-on-surface-variant">
            {isUploadingPhoto
              ? "Uploading..."
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

                  {attendee.rsvpStatus === "going" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="text-[10px] font-label font-bold uppercase tracking-wider px-3 py-2 rounded-full border border-primary/30 text-primary"
                        onClick={() =>
                          handleCopyPassLink(
                            attendee._id,
                            attendee.passAccessToken,
                          )
                        }
                        type="button"
                      >
                        Copy Pass Link
                      </button>
                      <button
                        className="text-[10px] font-label font-bold uppercase tracking-wider px-3 py-2 rounded-full border border-outline-variant/20 text-on-surface-variant disabled:opacity-50"
                        disabled={!attendee.email}
                        onClick={() =>
                          handleSendPassEmail({
                            attendeeId: attendee._id,
                            attendeeName: attendee.name,
                            attendeeEmail: attendee.email,
                            attendeeAccessToken: attendee.passAccessToken,
                          })
                        }
                        type="button"
                      >
                        Email Pass
                      </button>
                    </div>
                  )}

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
        {photoError && (
          <p className="text-xs text-red-300 mt-2">{photoError}</p>
        )}
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
            onKeyDown={(keyEvent) => {
              if (keyEvent.key === "Enter") {
                keyEvent.preventDefault();
                void handleAddComment();
              }
            }}
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
            {isSubmittingComment ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-sm">send</span>
            )}
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

      {copyFeedback && (
        <div className="fixed inset-x-4 bottom-6 z-50 flex justify-center pointer-events-none">
          <div className="rounded-full border border-primary/30 bg-surface-container-high/95 px-4 py-2 text-xs font-label font-bold uppercase tracking-wider text-primary shadow-glow-purple backdrop-blur-sm">
            {copyFeedback}
          </div>
        </div>
      )}
    </AppShell>
  );
}
