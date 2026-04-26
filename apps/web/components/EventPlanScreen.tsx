"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@invyte/ui/glass-card";
import AppShell from "@/components/AppShell";
import { useMutation, useQuery } from "convex/react";
import { api, type Id } from "@invyte/convex";

const tabs = [
  { id: "tasks", label: "Tasks", icon: "checklist" },
  { id: "budget", label: "Budget", icon: "payments" },
  { id: "bring", label: "Bring List", icon: "shopping_bag" },
  { id: "timeline", label: "Timeline", icon: "timeline" },
] as const;

type EventPlanScreenProps = {
  accessToken?: string | null;
  eventId: Id<"events">;
  publicAccess?: boolean;
};

export default function EventPlanScreen({
  accessToken,
  eventId,
  publicAccess = false,
}: Readonly<EventPlanScreenProps>) {
  const router = useRouter();
  const event = useQuery(api.events.getEventById, {
    id: eventId,
    accessToken: accessToken ?? undefined,
  });
  const tasks = useQuery(
    api.events.getTasks,
    event?.viewerCanOpenPlan
      ? { eventId, accessToken: accessToken ?? undefined }
      : "skip",
  );
  const budgetItems = useQuery(
    api.events.getBudgetItems,
    event?.viewerCanOpenPlan
      ? { eventId, accessToken: accessToken ?? undefined }
      : "skip",
  );
  const bringItems = useQuery(
    api.events.getBringItems,
    event?.viewerCanOpenPlan
      ? { eventId, accessToken: accessToken ?? undefined }
      : "skip",
  );
  const timelineItems = useQuery(
    api.events.getTimelineItems,
    event?.viewerCanOpenPlan
      ? { eventId, accessToken: accessToken ?? undefined }
      : "skip",
  );

  const addTask = useMutation(api.events.addTask);
  const toggleTaskMutation = useMutation(api.events.toggleTaskCompleted);
  const updateTask = useMutation(api.events.updateTask);
  const deleteTask = useMutation(api.events.deleteTask);
  const addBudgetItem = useMutation(api.events.addBudgetItem);
  const toggleBudgetItemPaid = useMutation(api.events.toggleBudgetItemPaid);
  const deleteBudgetItem = useMutation(api.events.deleteBudgetItem);
  const addBringItem = useMutation(api.events.addBringItem);
  const deleteBringItem = useMutation(api.events.deleteBringItem);
  const updateBringItem = useMutation(api.events.updateBringItem);
  const toggleBringItemClaim = useMutation(api.events.toggleBringItemClaim);
  const addTimelineItem = useMutation(api.events.addTimelineItem);
  const toggleTimelineItemCompleted = useMutation(
    api.events.toggleTimelineItemCompleted,
  );
  const updateTimelineItem = useMutation(api.events.updateTimelineItem);
  const deleteTimelineItem = useMutation(api.events.deleteTimelineItem);

  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]["id"]>("tasks");
  const [taskForm, setTaskForm] = useState({ text: "", assignee: "" });
  const [editingTaskId, setEditingTaskId] = useState<Id<"tasks"> | null>(null);
  const [taskEditForm, setTaskEditForm] = useState({ text: "", assignee: "" });
  const [budgetForm, setBudgetForm] = useState({ label: "", amount: "" });
  const [bringForm, setBringForm] = useState({ label: "", notes: "" });
  const [editingBringItemId, setEditingBringItemId] =
    useState<Id<"bringItems"> | null>(null);
  const [bringEditForm, setBringEditForm] = useState({ label: "", notes: "" });
  const [timelineForm, setTimelineForm] = useState({
    timeLabel: "",
    title: "",
    details: "",
  });
  const [editingTimelineItemId, setEditingTimelineItemId] =
    useState<Id<"timelineItems"> | null>(null);
  const [timelineEditForm, setTimelineEditForm] = useState({
    timeLabel: "",
    title: "",
    details: "",
  });

  const backHref = publicAccess
    ? `/event/${eventId}/details?access=${encodeURIComponent(accessToken ?? "")}`
    : `/event/${eventId}`;

  if (
    event === undefined ||
    (event?.viewerCanOpenPlan &&
      (tasks === undefined ||
        budgetItems === undefined ||
        bringItems === undefined ||
        timelineItems === undefined))
  ) {
    return (
      <AppShell>
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (event === null) {
    return (
      <AppShell>
        <div className="text-center py-20">
          <p>Event not found.</p>
        </div>
      </AppShell>
    );
  }

  if (!event.viewerCanOpenPlan) {
    return (
      <AppShell>
        <section className="animate-fade-in mb-6">
          <button
            className="btn-secondary mb-4"
            onClick={() => router.push(backHref)}
            type="button"
          >
            Back To Event
          </button>
          <h1 className="font-headline text-3xl font-black tracking-tight mt-2">
            {event.title}
          </h1>
          <p className="text-sm text-on-surface-variant mt-3">
            RSVP first to open the shared planning board for this event.
          </p>
        </section>
      </AppShell>
    );
  }

  const resolvedTasks = tasks ?? [];
  const resolvedBudgetItems = budgetItems ?? [];
  const resolvedBringItems = bringItems ?? [];
  const resolvedTimelineItems = timelineItems ?? [];
  const totalBudget = resolvedBudgetItems.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const paidBudget = resolvedBudgetItems
    .filter((item) => item.paid)
    .reduce((sum, item) => sum + item.amount, 0);
  const completedTasks = resolvedTasks.filter((task) => task.completed).length;

  return (
    <AppShell>
      <section className="animate-fade-in mb-6">
        <button
          className="btn-secondary mb-4"
          onClick={() => router.push(backHref)}
          type="button"
        >
          Back To Event
        </button>
        <span className="font-label text-xs font-bold uppercase tracking-[0.2em] text-secondary">
          Planning
        </span>
        <h1 className="font-headline text-3xl font-black tracking-tight mt-2">
          {event.title}
        </h1>
        <p className="text-sm text-on-surface-variant mt-3">
          {event.isHost
            ? "You can edit every part of this board."
            : "You can view the plan and claim bring-list items, but only the host can edit it."}
        </p>
      </section>

      <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-label font-bold uppercase tracking-wider transition-all active:scale-95 ${
              activeTab === tab.id
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-surface-container border border-outline-variant/15 text-on-surface-variant"
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-sm">
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "tasks" && (
        <div className="space-y-3 animate-slide-up">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-on-surface-variant">
              <span className="font-bold text-primary">{completedTasks}</span> /{" "}
              {resolvedTasks.length} done
            </p>
          </div>

          {event.isHost && (
            <GlassCard className="p-4 space-y-3">
              <input
                className="input-field"
                placeholder="Add a task"
                value={taskForm.text}
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
                    text: event.target.value,
                  }))
                }
              />
              <input
                className="input-field"
                placeholder="Assign to (optional)"
                value={taskForm.assignee}
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
                    assignee: event.target.value,
                  }))
                }
              />
              <button
                className="btn-secondary"
                onClick={async () => {
                  if (!taskForm.text.trim()) {
                    return;
                  }
                  await addTask({
                    eventId,
                    text: taskForm.text.trim(),
                    assignee: taskForm.assignee.trim() || undefined,
                  });
                  setTaskForm({ text: "", assignee: "" });
                }}
                type="button"
              >
                Add Task
              </button>
            </GlassCard>
          )}

          {resolvedTasks.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-8">
              No tasks yet. Get started!
            </p>
          ) : (
            resolvedTasks.map((task) => (
              <GlassCard key={task._id} className="p-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      event.isHost &&
                      toggleTaskMutation({
                        id: task._id,
                        completed: !task.completed,
                      })
                    }
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      task.completed
                        ? "bg-primary border-primary"
                        : "border-outline-variant/40"
                    } ${event.isHost ? "" : "cursor-default"}`}
                    disabled={!event.isHost}
                    type="button"
                  >
                    {task.completed && (
                      <span
                        className="material-symbols-outlined text-xs text-on-primary"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        check
                      </span>
                    )}
                  </button>
                  <div className="flex-1">
                    {event.isHost && editingTaskId === task._id ? (
                      <div className="space-y-2">
                        <input
                          className="input-field"
                          value={taskEditForm.text}
                          onChange={(event) =>
                            setTaskEditForm((current) => ({
                              ...current,
                              text: event.target.value,
                            }))
                          }
                        />
                        <input
                          className="input-field"
                          placeholder="Assign to (optional)"
                          value={taskEditForm.assignee}
                          onChange={(event) =>
                            setTaskEditForm((current) => ({
                              ...current,
                              assignee: event.target.value,
                            }))
                          }
                        />
                        <div className="flex items-center gap-2">
                          <button
                            className="btn-secondary"
                            onClick={async () => {
                              if (!taskEditForm.text.trim()) {
                                return;
                              }
                              await updateTask({
                                id: task._id,
                                text: taskEditForm.text.trim(),
                                assignee:
                                  taskEditForm.assignee.trim() || undefined,
                              });
                              setEditingTaskId(null);
                            }}
                            type="button"
                          >
                            Save
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={() => setEditingTaskId(null)}
                            type="button"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p
                          className={`text-sm font-medium ${
                            task.completed
                              ? "line-through text-on-surface-variant"
                              : "text-on-surface"
                          }`}
                        >
                          {task.text}
                        </p>
                        {task.assignee && (
                          <p className="text-[10px] text-on-surface-variant mt-0.5">
                            Assigned to {task.assignee}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  {event.isHost && editingTaskId !== task._id && (
                    <div className="flex items-center gap-3">
                      <button
                        className="text-xs text-secondary uppercase tracking-wider font-bold"
                        onClick={() => {
                          setEditingTaskId(task._id);
                          setTaskEditForm({
                            text: task.text,
                            assignee: task.assignee ?? "",
                          });
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="text-xs text-error uppercase tracking-wider font-bold"
                        onClick={() => deleteTask({ id: task._id })}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </GlassCard>
            ))
          )}
        </div>
      )}

      {activeTab === "budget" && (
        <div className="space-y-4 animate-slide-up">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">
                  Total Budget
                </p>
                <p className="font-headline text-3xl font-black text-on-surface">
                  ${totalBudget}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">
                  Paid
                </p>
                <p className="font-headline text-2xl font-black text-primary">
                  ${paidBudget}
                </p>
              </div>
            </div>
            <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all"
                style={{
                  width:
                    totalBudget > 0
                      ? `${(paidBudget / totalBudget) * 100}%`
                      : "0%",
                }}
              />
            </div>
          </GlassCard>

          {event.isHost && (
            <GlassCard className="p-4 space-y-3">
              <input
                className="input-field"
                placeholder="Budget item label"
                value={budgetForm.label}
                onChange={(event) =>
                  setBudgetForm((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
              />
              <input
                className="input-field"
                inputMode="decimal"
                placeholder="Amount"
                value={budgetForm.amount}
                onChange={(event) =>
                  setBudgetForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
              />
              <button
                className="btn-secondary"
                onClick={async () => {
                  const amount = Number(budgetForm.amount);
                  if (!budgetForm.label.trim() || Number.isNaN(amount)) {
                    return;
                  }
                  await addBudgetItem({
                    eventId,
                    label: budgetForm.label.trim(),
                    amount,
                  });
                  setBudgetForm({ label: "", amount: "" });
                }}
                type="button"
              >
                Add Budget Item
              </button>
            </GlassCard>
          )}

          {resolvedBudgetItems.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-8">
              Keep track of your expenses here.
            </p>
          ) : (
            resolvedBudgetItems.map((item) => (
              <GlassCard
                key={item._id}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <button
                    className={`w-3 h-3 rounded-full ${
                      item.paid ? "bg-primary" : "bg-surface-container-highest"
                    }`}
                    disabled={!event.isHost}
                    onClick={() =>
                      event.isHost &&
                      toggleBudgetItemPaid({ id: item._id, paid: !item.paid })
                    }
                    type="button"
                  />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-bold ${
                      item.paid ? "text-primary" : "text-on-surface-variant"
                    }`}
                  >
                    ${item.amount}
                  </span>
                  {event.isHost && (
                    <button
                      className="text-xs text-error uppercase tracking-wider font-bold"
                      onClick={() => deleteBudgetItem({ id: item._id })}
                      type="button"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </GlassCard>
            ))
          )}
        </div>
      )}

      {activeTab === "bring" && (
        <div className="space-y-3 animate-slide-up">
          <p className="text-sm text-on-surface-variant mb-2">
            Bring-list items can be edited by the event host or by the person
            who created the item.
          </p>

          <GlassCard className="p-4 space-y-3">
            <input
              className="input-field"
              placeholder="What should someone bring?"
              value={bringForm.label}
              onChange={(event) =>
                setBringForm((current) => ({
                  ...current,
                  label: event.target.value,
                }))
              }
            />
            <input
              className="input-field"
              placeholder="Notes (optional)"
              value={bringForm.notes}
              onChange={(event) =>
                setBringForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
            <button
              className="btn-secondary"
              onClick={async () => {
                if (!bringForm.label.trim()) {
                  return;
                }
                await addBringItem({
                  eventId,
                  label: bringForm.label.trim(),
                  notes: bringForm.notes.trim() || undefined,
                  accessToken: accessToken ?? undefined,
                });
                setBringForm({ label: "", notes: "" });
              }}
              type="button"
            >
              Add Bring Item
            </button>
          </GlassCard>

          {resolvedBringItems.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-8">
              Add a shared bring list for this event.
            </p>
          ) : (
            resolvedBringItems.map((item) => (
              <GlassCard
                key={item._id}
                className="p-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1">
                  {editingBringItemId === item._id ? (
                    <div className="space-y-2">
                      <input
                        className="input-field"
                        value={bringEditForm.label}
                        onChange={(event) =>
                          setBringEditForm((current) => ({
                            ...current,
                            label: event.target.value,
                          }))
                        }
                      />
                      <input
                        className="input-field"
                        placeholder="Notes (optional)"
                        value={bringEditForm.notes}
                        onChange={(event) =>
                          setBringEditForm((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                      />
                      <div className="flex items-center gap-2">
                        <button
                          className="btn-secondary"
                          onClick={async () => {
                            if (!bringEditForm.label.trim()) {
                              return;
                            }
                            await updateBringItem({
                              id: item._id,
                              label: bringEditForm.label.trim(),
                              notes: bringEditForm.notes.trim() || undefined,
                              accessToken: accessToken ?? undefined,
                            });
                            setEditingBringItemId(null);
                          }}
                          type="button"
                        >
                          Save
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => setEditingBringItemId(null)}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium">{item.label}</p>
                      {item.notes && (
                        <p className="text-xs text-on-surface-variant mt-1">
                          {item.notes}
                        </p>
                      )}
                      {item.claimedByName && (
                        <p className="text-[10px] text-primary mt-2 uppercase tracking-wider font-bold">
                          Claimed by {item.claimedByName}
                        </p>
                      )}
                      {item.createdByName && (
                        <p className="text-[10px] text-on-surface-variant mt-1 uppercase tracking-wider font-bold">
                          Added by {item.createdByName}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    className="text-[10px] font-label font-bold uppercase tracking-wider text-secondary bg-secondary/10 px-3 py-1 rounded-full border border-secondary/20 active:scale-95 transition-all"
                    onClick={() =>
                      toggleBringItemClaim({
                        id: item._id,
                        accessToken: accessToken ?? undefined,
                      })
                    }
                    type="button"
                  >
                    {item.claimedByTokenIdentifier ? "Unclaim / Take" : "Claim"}
                  </button>
                  {item.canEdit && editingBringItemId !== item._id && (
                    <button
                      className="text-xs text-secondary uppercase tracking-wider font-bold"
                      onClick={() => {
                        setEditingBringItemId(item._id);
                        setBringEditForm({
                          label: item.label,
                          notes: item.notes ?? "",
                        });
                      }}
                      type="button"
                    >
                      Edit
                    </button>
                  )}
                  {item.canEdit && (
                    <button
                      className="text-xs text-error uppercase tracking-wider font-bold"
                      onClick={() =>
                        deleteBringItem({
                          id: item._id,
                          accessToken: accessToken ?? undefined,
                        })
                      }
                      type="button"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </GlassCard>
            ))
          )}
        </div>
      )}

      {activeTab === "timeline" && (
        <div className="space-y-3 animate-slide-up">
          {event.isHost && (
            <GlassCard className="p-4 space-y-3">
              <input
                className="input-field"
                placeholder="Time label (e.g. 7:30 PM)"
                value={timelineForm.timeLabel}
                onChange={(event) =>
                  setTimelineForm((current) => ({
                    ...current,
                    timeLabel: event.target.value,
                  }))
                }
              />
              <input
                className="input-field"
                placeholder="Timeline title"
                value={timelineForm.title}
                onChange={(event) =>
                  setTimelineForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
              <input
                className="input-field"
                placeholder="Details (optional)"
                value={timelineForm.details}
                onChange={(event) =>
                  setTimelineForm((current) => ({
                    ...current,
                    details: event.target.value,
                  }))
                }
              />
              <button
                className="btn-secondary"
                onClick={async () => {
                  if (
                    !timelineForm.timeLabel.trim() ||
                    !timelineForm.title.trim()
                  ) {
                    return;
                  }
                  await addTimelineItem({
                    eventId,
                    timeLabel: timelineForm.timeLabel.trim(),
                    title: timelineForm.title.trim(),
                    details: timelineForm.details.trim() || undefined,
                    icon: "event",
                  });
                  setTimelineForm({ timeLabel: "", title: "", details: "" });
                }}
                type="button"
              >
                Add Timeline Item
              </button>
            </GlassCard>
          )}

          {resolvedTimelineItems.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-8">
              Build the event run-of-show here.
            </p>
          ) : (
            resolvedTimelineItems.map((item) => (
              <div key={item._id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <button
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      item.completed
                        ? "bg-primary/20"
                        : "bg-surface-container-high"
                    }`}
                    disabled={!event.isHost}
                    onClick={() =>
                      event.isHost &&
                      toggleTimelineItemCompleted({
                        id: item._id,
                        completed: !item.completed,
                      })
                    }
                    type="button"
                  >
                    <span
                      className={`material-symbols-outlined text-sm ${
                        item.completed
                          ? "text-primary"
                          : "text-on-surface-variant"
                      }`}
                    >
                      {item.icon ?? "event"}
                    </span>
                  </button>
                </div>
                <GlassCard className="p-4 flex-1 flex items-center justify-between">
                  {event.isHost && editingTimelineItemId === item._id ? (
                    <div className="w-full space-y-2">
                      <input
                        className="input-field"
                        value={timelineEditForm.timeLabel}
                        onChange={(event) =>
                          setTimelineEditForm((current) => ({
                            ...current,
                            timeLabel: event.target.value,
                          }))
                        }
                      />
                      <input
                        className="input-field"
                        value={timelineEditForm.title}
                        onChange={(event) =>
                          setTimelineEditForm((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                      />
                      <input
                        className="input-field"
                        value={timelineEditForm.details}
                        onChange={(event) =>
                          setTimelineEditForm((current) => ({
                            ...current,
                            details: event.target.value,
                          }))
                        }
                      />
                      <div className="flex items-center gap-2">
                        <button
                          className="btn-secondary"
                          onClick={async () => {
                            if (
                              !timelineEditForm.timeLabel.trim() ||
                              !timelineEditForm.title.trim()
                            ) {
                              return;
                            }

                            await updateTimelineItem({
                              id: item._id,
                              timeLabel: timelineEditForm.timeLabel.trim(),
                              title: timelineEditForm.title.trim(),
                              details:
                                timelineEditForm.details.trim() || undefined,
                              icon: item.icon,
                            });

                            setEditingTimelineItemId(null);
                          }}
                          type="button"
                        >
                          Save
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => setEditingTimelineItemId(null)}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-xs text-on-surface-variant font-bold">
                          {item.timeLabel}
                        </p>
                        <p className="text-sm font-medium mt-0.5">
                          {item.title}
                        </p>
                        {item.details && (
                          <p className="text-xs text-on-surface-variant mt-1">
                            {item.details}
                          </p>
                        )}
                      </div>
                      {event.isHost && (
                        <div className="flex items-center gap-3">
                          <button
                            className="text-xs text-secondary uppercase tracking-wider font-bold"
                            onClick={() => {
                              setEditingTimelineItemId(item._id);
                              setTimelineEditForm({
                                timeLabel: item.timeLabel,
                                title: item.title,
                                details: item.details ?? "",
                              });
                            }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="text-xs text-error uppercase tracking-wider font-bold"
                            onClick={() => deleteTimelineItem({ id: item._id })}
                            type="button"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </GlassCard>
              </div>
            ))
          )}
        </div>
      )}
    </AppShell>
  );
}
