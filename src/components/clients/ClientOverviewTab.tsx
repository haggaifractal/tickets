import React, { useMemo } from "react";
import { Ticket } from "@/types/models";
import { Clock, Ticket as TicketIcon } from "lucide-react";

interface ClientOverviewTabProps {
  tickets: Ticket[];
}

export function ClientOverviewTab({ tickets }: ClientOverviewTabProps) {
  const { totalMinutes, openTickets, resolvedTickets } = useMemo(() => {
    let mins = 0;
    let openCount = 0;
    let resolvedCount = 0;
    tickets.forEach((t) => {
      mins += t.timeLoggedMinutes || 0;
      if (t.status === "open" || t.status === "in_progress") openCount++;
      if (t.status === "resolved") resolvedCount++;
    });
    return {
      totalMinutes: mins,
      openTickets: openCount,
      resolvedTickets: resolvedCount,
    };
  }, [tickets]);

  const totalHours = Math.floor(totalMinutes / 60);
  const remainderMinutes = totalMinutes % 60;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-muted/20">
        <Clock className="h-8 w-8 text-primary mb-2" />
        <span className="text-2xl font-bold">
          {totalHours > 0 ? `${totalHours}h ` : ""}
          {remainderMinutes}m
        </span>
        <span className="text-sm text-muted-foreground">Total Time Logged</span>
      </div>

      <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-muted/20">
        <TicketIcon className="h-8 w-8 text-primary mb-2" />
        <div className="flex gap-4 w-full justify-center">
          <div className="text-center">
            <span className="text-2xl font-bold">{openTickets}</span>
            <p className="text-xs text-muted-foreground">Open</p>
          </div>
          <div className="text-center">
            <span className="text-2xl font-bold">{resolvedTickets}</span>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </div>
        </div>
      </div>
    </div>
  );
}
