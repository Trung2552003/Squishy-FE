import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { CalendarBlankIcon, XIcon } from "@phosphor-icons/react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DatePickerWithRange({
  className,
  date,
  setDate,
}: {
  className?: string
  date: DateRange | undefined
  setDate: (date: DateRange | undefined) => void
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-72 justify-start text-left font-normal h-10 border-border text-muted-foreground shadow-none hover:bg-muted/50 relative pr-8",
              !date && "text-muted-foreground/70"
            )}
          >
            <CalendarBlankIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "dd/MM/yyyy", { locale: vi })} -{" "}
                    {format(date.to, "dd/MM/yyyy", { locale: vi })}
                  </>
                ) : (
                  format(date.from, "dd/MM/yyyy", { locale: vi })
                )
              ) : (
                <span>Lọc theo thời gian</span>
              )}
            </span>
            {date && (
              <div 
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-neutral-200 text-muted-foreground transition-colors z-10"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDate(undefined);
                }}
              >
                <XIcon className="h-4 w-4" />
              </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 shadow-lg border-border" align="start">
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
            captionLayout="dropdown"
            startMonth={new Date(2000, 0)}
            endMonth={new Date(new Date().getFullYear() + 5, 11)}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
