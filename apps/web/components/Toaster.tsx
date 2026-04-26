"use client";

import { useEffect, useState } from "react";

type ToastItem = {
  id: number;
  message: string;
  type: "success" | "error";
};

let _nextId = 0;

export function toast(message: string, type: "success" | "error" = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("app:toast", {
      detail: { id: ++_nextId, message, type } satisfies ToastItem,
    }),
  );
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const item = (e as CustomEvent<ToastItem>).detail;
      setItems((prev) => [...prev, item]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== item.id));
      }, 2600);
    };
    window.addEventListener("app:toast", handler);
    return () => window.removeEventListener("app:toast", handler);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed inset-x-4 bottom-28 z-50 flex flex-col items-center gap-2 pointer-events-none">
      {items.map((item) => (
        <div
          key={item.id}
          className={`rounded-full border px-5 py-2.5 text-xs font-label font-bold uppercase tracking-wider backdrop-blur-sm animate-slide-up ${
            item.type === "error"
              ? "bg-error/15 border-error/30 text-error"
              : "bg-surface-container-high/95 border-primary/30 text-primary shadow-neon-purple"
          }`}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
