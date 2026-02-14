import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { ptBR } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  weekStartsOn,
  locale,
  ...props
}: CalendarProps) {
  const resolvedWeekStart = typeof weekStartsOn === "number" ? weekStartsOn : 1; // default Monday
  const resolvedLocale = locale ?? ptBR;

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "w-full min-w-[320px] max-w-[360px] rounded-xl border border-border/60 bg-popover/95 text-foreground shadow-2xl backdrop-blur",
        className,
      )}
      locale={resolvedLocale}
      weekStartsOn={resolvedWeekStart}
      styles={{
        weekdays: { display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: "6px", padding: "0 8px" },
        week: { display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", gap: "6px", padding: "0 8px" },
        day: { padding: 0 },
      }}
      classNames={{
        root: "w-full",
        months: "flex flex-col gap-3",
        month: "space-y-3 px-3 pb-3",
        caption: "flex items-center justify-between px-2 pt-2",
        caption_label: "text-sm font-semibold tracking-tight",
        nav: "flex items-center gap-2",
        nav_button: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "h-8 w-8 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-primary/10",
        ),
        nav_button_previous: "",
        nav_button_next: "",
        month_grid: "w-full border-collapse",
        weekdays:
          "grid grid-cols-7 gap-1 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
        weekday: "text-center",
        weeks: "space-y-1",
        week: "grid grid-cols-7 gap-1 px-2",
        day_button: "w-full h-full",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-full rounded-lg p-0 text-sm font-semibold text-foreground hover:bg-primary/15 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-0 aria-selected:opacity-100 transition-all",
        ),
        day_selected:
          "bg-primary text-primary-foreground shadow-md hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "border border-primary/70 text-primary bg-primary/10",
        day_outside: "text-muted-foreground opacity-60",
        day_disabled: "text-muted-foreground opacity-35",
        day_range_middle:
          "aria-selected:bg-primary/20 aria-selected:text-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation = "right", className, ...iconProps }) => {
          const Icon =
            orientation === "left" || orientation === "up" ? ChevronLeft : ChevronRight;
          return <Icon className={cn("h-4 w-4", className)} {...iconProps} />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar"

export { Calendar }


