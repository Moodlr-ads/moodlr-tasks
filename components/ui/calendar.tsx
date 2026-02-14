import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  weekStartsOn,
  ...props
}: CalendarProps) {
  const resolvedWeekStart = typeof weekStartsOn === "number" ? weekStartsOn : 1; // default Monday

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "w-full min-w-[320px] max-w-[380px] rounded-2xl border border-border/60 bg-gradient-to-b from-slate-900/95 via-slate-900 to-slate-950 text-foreground shadow-2xl backdrop-blur",
        className,
      )}
      weekStartsOn={resolvedWeekStart}
      classNames={{
        root: "w-full",
        months: "flex flex-col gap-3",
        month: "space-y-2 px-3 pb-3",
        caption: "flex items-center justify-between px-1 pt-2",
        caption_label: "text-sm font-semibold tracking-tight text-slate-100",
        nav: "flex items-center gap-1.5",
        nav_button: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/70",
        ),
        nav_button_previous: "",
        nav_button_next: "",
        table: "w-full border-collapse text-center",
        head_row: "",
        head_cell:
          "text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400 pb-1",
        row: "",
        cell: "relative p-0",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-full rounded-lg p-0 text-sm font-semibold text-slate-100 hover:bg-accent/70 hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-selected:opacity-100 transition-all",
        ),
        day_selected:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "border border-primary/70 text-foreground bg-primary/5",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-25",
        day_range_middle:
          "aria-selected:bg-accent/70 aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar"

export { Calendar }


