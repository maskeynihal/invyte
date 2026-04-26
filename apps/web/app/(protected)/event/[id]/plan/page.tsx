"use client";

import { useParams } from "next/navigation";
import type { Id } from "@invyte/convex";
import EventPlanScreen from "@/components/EventPlanScreen";

export default function PlanningToolsPage() {
  const params = useParams<{ id: Id<"events"> }>();

  return <EventPlanScreen eventId={params.id} />;
}
