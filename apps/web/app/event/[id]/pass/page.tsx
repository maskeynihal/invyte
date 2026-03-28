"use client";

import { useParams, useRouter } from "next/navigation";

export default function LegacyPassRoutePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-on-surface flex items-center justify-center p-6">
      <div className="glass-card rounded-3xl max-w-md w-full p-6 text-center space-y-4">
        <span className="inline-flex px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
          RSVP Required
        </span>
        <h1 className="font-headline text-2xl font-black">Your pass is now attendee-specific</h1>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          Submit your RSVP first and we&apos;ll generate a personal event pass with your name and response.
        </p>
        <button
          className="btn-primary"
          onClick={() => router.push(`/event/${params.id}/rsvp`)}
          type="button"
        >
          Go To RSVP
        </button>
      </div>
    </div>
  );
}
