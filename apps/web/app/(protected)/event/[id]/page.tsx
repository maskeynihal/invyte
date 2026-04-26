"use client";

import { useParams } from "next/navigation";
import type { Id } from "@invyte/convex";
import EventDetailScreen from "@/components/EventDetailScreen";

export default function EventDetailPage() {
  const params = useParams<{ id: Id<"events"> }>();

  return <EventDetailScreen eventId={params.id} />;
}
