import React from "react";
import { Ticket } from "@/types/models";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ClientTicketsTabProps {
  tickets: Ticket[];
}

export function ClientTicketsTab({ tickets }: ClientTicketsTabProps) {
  return (
    <div className="border rounded-md">
      <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
        {tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No tickets found for this client.
          </p>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="flex flex-col space-y-2 p-3 border rounded-lg bg-card"
            >
              <div className="flex justify-between items-start">
                <span className="font-semibold text-sm">{ticket.title}</span>
                <Badge
                  variant={ticket.status === "resolved" ? "secondary" : "default"}
                  className="text-xs"
                >
                  {ticket.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>
                  {ticket.createdAt?.seconds
                    ? format(new Date(ticket.createdAt.seconds * 1000), "MMM d, yyyy")
                    : "Unknown Date"}
                </span>
                <span>Tech: {ticket.assignedTechId || "Unassigned"}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
