"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-1", className)}
      classNames={{
        months: "flex flex-col",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-label font-bold text-on-surface",
        nav: "space-x-1 flex items-center",
        nav_button:
          "h-8 w-8 bg-surface-container-high border border-outline-variant/20 rounded-full text-on-surface hover:bg-surface-container-highest transition-colors",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-on-surface-variant rounded-md w-9 font-label font-bold text-[11px] uppercase tracking-wide",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative",
        day: "h-9 w-9 p-0 rounded-full text-sm font-medium hover:bg-primary/20 hover:text-primary transition-colors",
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-on-primary hover:bg-primary hover:text-on-primary focus:bg-primary focus:text-on-primary",
        day_today: "bg-secondary/20 text-secondary",
        day_outside: "text-outline-variant opacity-40",
        day_disabled: "text-outline-variant opacity-40",
        day_range_middle:
          "aria-selected:bg-primary/20 aria-selected:text-primary",
        day_hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
