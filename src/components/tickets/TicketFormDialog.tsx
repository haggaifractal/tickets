import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Ticket } from "@/types/models";
import { useClients } from "@/hooks/useClients";
import { useAssets } from "@/hooks/useAssets";
import { useAuth } from "@/context/AuthContext";
import { useDebounceTimeLogger } from "@/hooks/useDebounceTimeLogger";
import { TicketNotesTimeline } from "./TicketNotesTimeline";
import { Minus, Plus } from "lucide-react";

const ticketSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters."),
  description: z.string().min(10, "Description is required."),
  status: z.enum(["open", "in_progress", "resolved"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  clientId: z.string().min(1, "Client is required."),
  assetId: z.string().optional(),
  assignedTechId: z.string().optional(),
  timeLoggedMinutes: z.coerce.number().min(0, "Time cannot be negative.").optional(),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

interface TicketFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket?: Ticket | null;
  onSubmit: (data: Partial<Ticket>) => Promise<void>;
  isLoading?: boolean;
}

export function TicketFormDialog({
  open,
  onOpenChange,
  ticket,
  onSubmit,
  isLoading,
  }: TicketFormDialogProps) {
  const { data: clients } = useClients();
  const { data: assets } = useAssets();
  const { user } = useAuth();
  const { addTime, pendingLogs } = useDebounceTimeLogger(5000);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "open",
      priority: "medium",
      clientId: "",
      assetId: "none",
      assignedTechId: "",
      timeLoggedMinutes: 0,
    },
  });

  const statusValue = watch("status");
  const priorityValue = watch("priority");
  const clientIdValue = watch("clientId");
  const assetIdValue = watch("assetId");
  const timeLoggedValue = watch("timeLoggedMinutes") || 0;

  const clientAssets = React.useMemo(() => {
    return assets?.filter((a) => a.clientId === clientIdValue) || [];
  }, [assets, clientIdValue]);

  React.useEffect(() => {
    if (ticket) {
      reset({
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        clientId: ticket.clientId,
        assetId: ticket.assetId || "none",
        assignedTechId: ticket.assignedTechId || "",
        timeLoggedMinutes: ticket.timeLoggedMinutes || 0,
      });
    } else {
      reset({
        title: "",
        description: "",
        status: "open",
        priority: "medium",
        clientId: "",
        assetId: "none",
        assignedTechId: user?.displayName || user?.email?.split('@')[0] || "",
        timeLoggedMinutes: 0,
      });
    }
  }, [ticket, reset, open, user]);

  const onFormSubmit = handleSubmit(async (data) => {
    const submitData: Partial<Ticket> = { ...data };
    if (submitData.assetId === "none" || !submitData.assetId) {
      delete submitData.assetId;
    }
    // Don't overwrite timeLoggedMinutes if editing since it's managed by db debounce
    if (ticket?.id) {
      delete submitData.timeLoggedMinutes;
    }
    await onSubmit(submitData);
    onOpenChange(false);
  });

  const formContent = (
    <form onSubmit={onFormSubmit} className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="title">Issue Title</Label>
        <Input id="title" {...register("title")} placeholder="e.g. Server unreachable" />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="clientId">Client</Label>
        <Select
          value={clientIdValue}
          onValueChange={(val: string) => {
            setValue("clientId", val);
            setValue("assetId", "none");
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Client" />
          </SelectTrigger>
          <SelectContent>
            {clients?.map((client) => (
              <SelectItem key={client.id} value={client.id!}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.clientId && <p className="text-sm text-destructive">{errors.clientId.message}</p>}
      </div>

      {clientIdValue && (
        <div className="space-y-2">
          <Label htmlFor="assetId">Related Asset (Optional)</Label>
          <Select value={assetIdValue} onValueChange={(val: string) => setValue("assetId", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Asset (Optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-- None --</SelectItem>
              {clientAssets.map((asset) => (
                <SelectItem key={asset.id} value={asset.id!}>
                  {asset.name} ({asset.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select value={priorityValue} onValueChange={(val: any) => setValue("priority", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          {errors.priority && <p className="text-sm text-destructive">{errors.priority.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={statusValue} onValueChange={(val: any) => setValue("status", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          className="min-h-[100px]"
          {...register("description")}
          placeholder="Describe the issue in detail..."
        />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="assignedTechId">Assigned Tech Name</Label>
          <Input
            id="assignedTechId"
            {...register("assignedTechId")}
            placeholder="Auto-assigned"
            readOnly
            className="bg-muted cursor-not-allowed"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timeLoggedMinutes">Time Logged (Minutes)</Label>
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                if (ticket?.id) {
                   addTime(ticket.id, -15);
                } else {
                   setValue("timeLoggedMinutes", Math.max(0, timeLoggedValue - 15));
                }
              }}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm items-center justify-center font-medium">
              {ticket?.id ? (
                <span>
                  {ticket.timeLoggedMinutes || 0}m {pendingLogs[ticket.id] ? <span className={(pendingLogs[ticket.id] > 0 ? "text-primary" : "text-error")}>({pendingLogs[ticket.id] > 0 ? '+' : ''}{pendingLogs[ticket.id]}m pending)</span> : ''}
                </span>
              ) : (
                <span>{timeLoggedValue}m</span>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                if (ticket?.id) {
                  addTime(ticket.id, 15);
                } else {
                  setValue("timeLoggedMinutes", timeLoggedValue + 15);
                }
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {errors.timeLoggedMinutes && (
            <p className="text-sm text-destructive">{errors.timeLoggedMinutes.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Ticket"}
        </Button>
      </div>
    </form>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ticket ? "Ticket Details" : "Create New Ticket"}</DialogTitle>
        </DialogHeader>

        {ticket ? (
          <Tabs defaultValue="details" className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-4">
              {formContent}
            </TabsContent>
            <TabsContent value="timeline" className="mt-4">
              <TicketNotesTimeline ticketId={ticket.id!} />
            </TabsContent>
          </Tabs>
        ) : (
          formContent
        )}
      </DialogContent>
    </Dialog>
  );
}
