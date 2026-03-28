"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { VibeSelector } from "@invyte/ui/vibe-selector";
import AppShell from "@/components/AppShell";
import { vibeOptions } from "@/lib/mockData";
import { useMutation } from "convex/react";
import { api, type Id } from "@invyte/convex";

const categoryOptions = [
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

export default function CreateEventPage() {
  const router = useRouter();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [selectedVibe, setSelectedVibe] = useState("neon-night");
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    time: "",
    location: "",
    category: "Party",
    description: "",
    isPublic: true,
    allowPlusOne: true,
  });

  const createEvent = useMutation(api.events.createEvent);
  const generateUploadUrl = useMutation(api.events.generateUploadUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hostName =
    user?.fullName ??
    user?.firstName ??
    user?.username ??
    user?.primaryEmailAddress?.emailAddress.split("@")[0] ??
    "Host";

  const hostAvatar =
    user?.imageUrl ??
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(hostName)}`;
  const selectedVibeOption =
    vibeOptions.find((vibe) => vibe.id === selectedVibe) ?? vibeOptions[0];
  const selectedCoverPreview = coverPreviewUrl ?? selectedVibeOption?.image ?? "";

  const handleCoverSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSelectedCoverFile(file);
    setCoverPreviewUrl(URL.createObjectURL(file));
  };

  const uploadSelectedCover = async () => {
    if (!selectedCoverFile) {
      return undefined;
    }

    const postUrl = await generateUploadUrl();
    const uploadResult = await fetch(postUrl, {
      method: "POST",
      headers: {
        "Content-Type": selectedCoverFile.type,
      },
      body: selectedCoverFile,
    });

    if (!uploadResult.ok) {
      throw new Error("Failed to upload cover image");
    }

    const { storageId } = (await uploadResult.json()) as { storageId: Id<"_storage"> };
    return storageId;
  };

  const handleLaunch = async () => {
    if (!selectedVibeOption || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const coverImageStorageId = await uploadSelectedCover();
      const eventId = await createEvent({
        title: formData.title || "Untitled Event",
        description: formData.description,
        date: formData.date || "TBD",
        time: formData.time || "TBD",
        location: formData.location || "Online",
        coverImage: selectedVibeOption.image,
        coverImageStorageId,
        vibe: selectedVibeOption.name,
        category: formData.category,
        isPublic: formData.isPublic,
        allowPlusOne: formData.allowPlusOne,
        hostName,
        hostAvatar,
      });

      router.push(`/event/${eventId}`);
    } catch (error) {
      console.error("Failed to create event:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-4 mb-8 animate-fade-in">
        <div>
          <p className="text-[10px] font-label font-bold uppercase tracking-[0.2em] text-outline">
            Hosting As
          </p>
          <p className="text-sm font-medium text-on-surface mt-1">{hostName}</p>
        </div>
        <div className="relative w-11 h-11 rounded-full overflow-hidden border border-primary/20 shadow-neon-purple">
          <Image alt={hostName} className="object-cover" fill src={hostAvatar} unoptimized />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-8 animate-fade-in">
        {[1, 2, 3].map((currentStep) => (
          <div
            key={currentStep}
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
              currentStep <= step
                ? "bg-primary shadow-neon-purple"
                : "bg-surface-container-highest"
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <section className="space-y-8 animate-slide-up">
          <div className="space-y-2">
            <span className="font-label text-xs font-bold uppercase tracking-[0.2em] text-secondary">
              New Gathering
            </span>
            <h1 className="font-headline text-4xl font-black tracking-tight leading-none">
              What&apos;s the <span className="text-primary">Vibe</span> Tonight?
            </h1>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="label-text">Event Title</label>
              <input
                className="input-field"
                placeholder="Summer Rooftop Mixer"
                type="text"
                value={formData.title}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, title: event.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="label-text">When</label>
                <div className="relative bg-surface-container-lowest rounded-2xl p-4 flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary text-sm">
                    calendar_today
                  </span>
                  <input
                    className="bg-transparent border-none p-0 text-on-surface focus:ring-0 focus:outline-none w-full font-medium text-sm"
                    type="text"
                    placeholder="Aug 24"
                    value={formData.date}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, date: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="label-text">Time</label>
                <div className="relative bg-surface-container-lowest rounded-2xl p-4 flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary text-sm">
                    schedule
                  </span>
                  <input
                    className="bg-transparent border-none p-0 text-on-surface focus:ring-0 focus:outline-none w-full font-medium text-sm"
                    type="text"
                    placeholder="8:00 PM"
                    value={formData.time}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, time: event.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="label-text">Where</label>
              <div className="relative bg-surface-container-lowest rounded-2xl p-4 flex items-center gap-3 border border-outline-variant/10">
                <span className="material-symbols-outlined text-tertiary text-sm">
                  location_on
                </span>
                <input
                  className="bg-transparent border-none p-0 text-on-surface placeholder:text-outline-variant focus:ring-0 focus:outline-none w-full font-medium text-sm"
                  placeholder="Add a place or address"
                  type="text"
                  value={formData.location}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, location: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="label-text">Category</label>
              <select
                className="input-field"
                value={formData.category}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, category: event.target.value }))
                }
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <VibeSelector
              vibes={vibeOptions}
              selectedVibe={selectedVibe}
              onSelect={setSelectedVibe}
            />
          </div>

          <div className="pt-4">
            <button className="btn-primary" onClick={() => setStep(2)}>
              Next Step
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-8 animate-slide-up">
          <div className="space-y-2">
            <span className="font-label text-xs font-bold uppercase tracking-[0.2em] text-secondary">
              Step 2
            </span>
            <h1 className="font-headline text-4xl font-black tracking-tight leading-none">
              Set the <span className="text-tertiary">Details</span>
            </h1>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="label-text">Description</label>
              <textarea
                className="input-field min-h-[120px] resize-none"
                placeholder="Tell people what to expect..."
                value={formData.description}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="label-text">Cover Image</label>
              <button
                className="glass-card rounded-2xl border-2 border-dashed border-outline-variant/30 p-4 text-left hover:border-primary/50 transition-all w-full"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <div className="relative h-48 rounded-2xl overflow-hidden mb-4">
                  <Image
                    alt="Event cover preview"
                    className="object-cover"
                    fill
                    src={selectedCoverPreview}
                    unoptimized
                  />
                </div>
                <p className="text-sm font-label font-bold text-on-surface">
                  {selectedCoverFile ? selectedCoverFile.name : "Tap to upload a custom cover"}
                </p>
                <p className="text-xs text-on-surface-variant mt-1">
                  If you skip upload, the selected vibe image will be used as the event cover.
                </p>
              </button>
              <input
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleCoverSelection}
                type="file"
              />
            </div>

            <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">
                  {formData.isPublic ? "public" : "lock"}
                </span>
                <div>
                  <p className="font-label font-bold text-sm text-on-surface">
                    {formData.isPublic ? "Public Event" : "Private Event"}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {formData.isPublic
                      ? "Shown in discovery and shareable via public RSVP link"
                      : "Only people with the invite link can RSVP"}
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setFormData((current) => ({ ...current, isPublic: !current.isPublic }))
                }
                className={`w-12 h-7 rounded-full transition-all duration-300 relative ${
                  formData.isPublic ? "bg-primary" : "bg-surface-container-highest"
                }`}
                type="button"
              >
                <div
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-300 ${
                    formData.isPublic ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>

            <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary">group_add</span>
                <div>
                  <p className="font-label font-bold text-sm text-on-surface">
                    Allow +1
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    Guests can bring a friend if they RSVP yes
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setFormData((current) => ({
                    ...current,
                    allowPlusOne: !current.allowPlusOne,
                  }))
                }
                className={`w-12 h-7 rounded-full transition-all duration-300 relative ${
                  formData.allowPlusOne ? "bg-secondary" : "bg-surface-container-highest"
                }`}
                type="button"
              >
                <div
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-300 ${
                    formData.allowPlusOne ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button className="btn-secondary flex-1" onClick={() => setStep(1)} type="button">
              Back
            </button>
            <button className="btn-primary flex-[2]" onClick={() => setStep(3)} type="button">
              Next Step
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-8 animate-slide-up">
          <div className="space-y-2">
            <span className="font-label text-xs font-bold uppercase tracking-[0.2em] text-secondary">
              Step 3
            </span>
            <h1 className="font-headline text-4xl font-black tracking-tight leading-none">
              Launch the <span className="gradient-text">Invitation</span>
            </h1>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="relative h-52">
              <Image
                alt={formData.title || "New event preview"}
                className="object-cover"
                fill
                src={selectedCoverPreview}
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-wider backdrop-blur-sm border border-primary/20 inline-block mb-3">
                  {selectedVibeOption?.name}
                </span>
                <h2 className="font-headline text-2xl font-black text-on-surface">
                  {formData.title || "Untitled Event"}
                </h2>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-on-surface-variant text-xs uppercase tracking-wider font-bold">
                    Date
                  </p>
                  <p className="mt-1">{formData.date || "TBD"}</p>
                </div>
                <div>
                  <p className="text-on-surface-variant text-xs uppercase tracking-wider font-bold">
                    Time
                  </p>
                  <p className="mt-1">{formData.time || "TBD"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-on-surface-variant text-xs uppercase tracking-wider font-bold">
                    Location
                  </p>
                  <p className="mt-1">{formData.location || "Online"}</p>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Launch now to generate the public RSVP page, attendee pass, planning board, and
                gallery for this event.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button className="btn-secondary flex-1" onClick={() => setStep(2)} type="button">
              Back
            </button>
            <button
              className="btn-primary flex-[2] disabled:opacity-50"
              onClick={handleLaunch}
              disabled={isSubmitting}
              type="button"
            >
              {isSubmitting ? "Launching..." : "Launch Event"}
            </button>
          </div>
        </section>
      )}
    </AppShell>
  );
}
