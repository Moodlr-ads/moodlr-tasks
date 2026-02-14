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
        "w-full min-w-[300px] max-w-[360px] rounded-2xl border border-border/70 bg-card/95 p-4 text-foreground shadow-2xl",
        className,
      )}
      weekStartsOn={resolvedWeekStart}
      classNames={{
        root: "w-full",
        months: "flex flex-col gap-4",
        month: "space-y-3",
        caption: "flex items-center justify-between px-3 pt-1",
        caption_label: "text-base font-semibold tracking-tight",
        nav: "flex items-center gap-2",
        nav_button: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60",
        ),
        nav_button_previous: "",
        nav_button_next: "",
        table: "w-full border-collapse space-y-1",
        head_row: "grid grid-cols-7 gap-1 px-1",
        head_cell:
          "text-center text-[12px] font-semibold uppercase tracking-wide text-muted-foreground",
        row: "grid grid-cols-7 gap-1 px-1",
        cell: "relative p-0",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-full rounded-lg p-0 text-sm font-semibold text-foreground hover:bg-accent/70 hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-selected:opacity-100 transition-all",
        ),
        day_selected:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "border border-primary/70 text-foreground bg-primary/5",
        day_outside: "text-muted-foreground opacity-40",
        day_disabled: "text-muted-foreground opacity-30",
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


