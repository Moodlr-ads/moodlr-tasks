import * as React from "react";
import { format, startOfDay } from "date-fns";
import type { Matcher } from "react-day-picker";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type TaskDatePickerProps = {
  label: string;
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date | null;
  maxDate?: Date | null;
  defaultMonth?: Date | null;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  triggerClassName?: string;
  contentClassName?: string;
  compact?: boolean;
};

const DATE_FORMAT = "dd MMM yyyy";

export function TaskDatePicker({
  label,
  value,
  onChange,
  placeholder = "Set date",
  disabled,
  minDate,
  maxDate,
  defaultMonth,
  align = "start",
  side = "bottom",
  triggerClassName,
  contentClassName,
  compact,
}: TaskDatePickerProps) {
  const normalizedValue = value ? startOfDay(value) : null;
  const min = minDate ? startOfDay(minDate) : null;
  const max = maxDate ? startOfDay(maxDate) : null;
  const month = normalizedValue ?? defaultMonth ?? min ?? max ?? startOfDay(new Date());

  const disabledDays = React.useMemo<Matcher[]>(() => {
    const rules: Matcher[] = [];
    if (min) rules.push({ before: min });
    if (max) rules.push({ after: max });
    return rules;
  }, [min?.getTime(), max?.getTime()]);

  const handleSelect = (next: Date | null) => {
    if (!onChange) return;
    onChange(next ? startOfDay(next) : null);
  };

  const display = normalizedValue ? format(normalizedValue, DATE_FORMAT) : placeholder;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={compact ? "sm" : "default"}
          disabled={disabled}
          className={cn(
            "w-full justify-start gap-2 text-left font-semibold border border-border/70 bg-card/80 text-foreground shadow-sm hover:border-primary/60 transition",
            compact ? "h-9 px-3 text-xs" : "h-10 px-3 text-sm",
            !normalizedValue && "text-muted-foreground",
            triggerClassName,
          )}
        >
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{display}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        side={side}
        className={cn(
          "w-auto min-w-[340px] max-w-[380px] rounded-xl border border-border/70 bg-popover/95 p-3 text-foreground shadow-2xl backdrop-blur",
          contentClassName,
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <span className="text-sm font-semibold text-foreground">{label}</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => handleSelect(startOfDay(new Date()))}
            >
              Hoje
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => handleSelect(null)}
              disabled={!normalizedValue}
            >
              Limpar
            </Button>
          </div>
        </div>

        <Calendar
          mode="single"
          selected={normalizedValue ?? undefined}
          defaultMonth={month}
          onSelect={(date) => handleSelect(date ?? null)}
          disabled={disabledDays.length ? disabledDays : undefined}
          weekStartsOn={1}
        />
      </PopoverContent>
    </Popover>
  );
}
