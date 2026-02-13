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
        "w-full min-w-[300px] max-w-[340px] rounded-xl border border-border bg-card p-3 text-foreground shadow-sm",
        className,
      )}
      weekStartsOn={resolvedWeekStart}
      classNames={{
        root: "w-full",
        months: "flex flex-col gap-4",
        month: "space-y-3",
        caption: "flex items-center justify-between px-2 pt-1",
        caption_label: "text-sm font-semibold",
        nav: "flex items-center gap-2",
        nav_button: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent",
        ),
        nav_button_previous: "",
        nav_button_next: "",
        table: "w-full border-collapse space-y-1",
        head_row: "grid grid-cols-7 gap-1 px-1",
        head_cell:
          "text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
        row: "grid grid-cols-7 gap-1 px-1",
        cell: "relative p-0",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-full rounded-md p-0 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-selected:opacity-100",
        ),
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "border border-primary/60 text-foreground",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-40",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar"

export { Calendar }


