"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { Id } from "@invyte/convex";
import EventPlanScreen from "@/components/EventPlanScreen";

export default function SignedEventPlanPage() {
  const params = useParams<{ id: Id<"events"> }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessToken = searchParams.get("access");

  useEffect(() => {
    if (!accessToken) {
      router.replace(`/event/${params.id}/rsvp`);
    }
  }, [accessToken, params.id, router]);

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <EventPlanScreen
      accessToken={accessToken}
      eventId={params.id}
      publicAccess
    />
  );
}
