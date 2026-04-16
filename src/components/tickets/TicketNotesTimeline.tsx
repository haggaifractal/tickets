import React, { useState } from "react";
import { useTicketNotes, useTicketNoteMutations } from "@/hooks/useTicketNotes";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { format } from "date-fns";

interface TicketNotesTimelineProps {
  ticketId: string;
}

export function TicketNotesTimeline({ ticketId }: TicketNotesTimelineProps) {
  const { data: notes, isLoading } = useTicketNotes(ticketId);
  const { createNote } = useTicketNoteMutations(ticketId);
  const { user } = useAuth();
  
  const [newNote, setNewNote] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      await createNote.mutateAsync({
        text: newNote.trim(),
        createdBy: user?.displayName || user?.email?.split('@')[0] || "Unknown Tech",
      });
      setNewNote("");
    } catch (error) {
      console.error("Failed to add note", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4">
        {notes?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            No notes yet. Be the first to add an update!
          </p>
        ) : (
          notes?.map((note) => (
            <div key={note.id} className="flex flex-col bg-muted/30 p-3 rounded-md border text-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-primary">{note.createdBy}</span>
                <span className="text-xs text-muted-foreground">
                  {note.createdAt?.seconds 
                    ? format(new Date(note.createdAt.seconds * 1000), "MMM d, h:mm a")
                    : "Just now"}
                </span>
              </div>
              <p className="text-foreground whitespace-pre-wrap">{note.text}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 items-end mt-auto pt-2 border-t">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add an update or note..."
          className="min-h-[60px] resize-none flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={!newNote.trim() || createNote.isPending}
          className="h-10 w-10 shrink-0"
        >
          {createNote.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
