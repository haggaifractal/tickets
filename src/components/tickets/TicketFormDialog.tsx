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
import { useTicketMutations } from "@/hooks/useTickets";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { TicketNotesTimeline } from "./TicketNotesTimeline";
import { Minus, Plus, Pencil, Trash2, Lock } from "lucide-react";
import { format } from "date-fns";

const ticketSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters."),
  description: z.string().min(10, "Description is required."),
  status: z.enum(["open", "in_progress", "resolved"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  clientId: z.string().min(1, "Client is required."),
  assetId: z.string().optional(),
  assignedTechId: z.string().optional(),
  contactName: z.string().optional(),
  approvedBy: z.string().optional(),
  timeLoggedMinutes: z.coerce.number().min(0, "Time cannot be negative.").optional(),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

interface TicketFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket?: Ticket | null;
  onSubmit: (data: Partial<Ticket>) => Promise<void>;
  isLoading?: boolean;
  defaultTab?: "details" | "timeline";
}

export function TicketFormDialog({
  open,
  onOpenChange,
  ticket,
  onSubmit,
  isLoading,
  defaultTab = "details",
  }: TicketFormDialogProps) {
  const { data: clients } = useClients();
  const { data: assets } = useAssets();
  const { user } = useAuth();
  const { logTicketTime, updateTicketTimeEntry, deleteTicketTimeEntry } = useTicketMutations();
  const { data: entries } = useTimeEntries();

  const [logMinutes, setLogMinutes] = React.useState<number>(15);
  const [logDesc, setLogDesc] = React.useState("");

  const [editingEntryId, setEditingEntryId] = React.useState<string | null>(null);
  const [editMinutes, setEditMinutes] = React.useState<number>(15);
  const [editDesc, setEditDesc] = React.useState("");
  
  const [draftNote, setDraftNote] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"details" | "timeline">(defaultTab);

  const ticketEntries = React.useMemo(() => {
    if (!entries || !ticket?.id) return [];
    return entries.filter(e => e.ticketId === ticket.id).sort((a,b) => b.date.getTime() - a.date.getTime());
  }, [entries, ticket?.id]);

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
      contactName: "",
      approvedBy: "",
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
        contactName: ticket.contactName || "",
        approvedBy: ticket.approvedBy || "",
        timeLoggedMinutes: ticket.timeLoggedMinutes || 0,
      });
      setDraftNote("");
    } else {
      reset({
        title: "",
        description: "",
        status: "open",
        priority: "medium",
        clientId: "",
        assetId: "none",
        assignedTechId: user?.displayName || user?.email?.split('@')[0] || "",
        contactName: "",
        approvedBy: "",
        timeLoggedMinutes: 0,
      });
      setDraftNote("");
    }
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [ticket, reset, open, user, defaultTab]);

  const selectedClient = React.useMemo(() => clients?.find(c => c.id === clientIdValue), [clients, clientIdValue]);

  React.useEffect(() => {
    // Auto-fill contact name from client defaults if it's currently empty
    if (selectedClient && !watch("contactName")) {
       if (selectedClient.contactName) {
          setValue("contactName", selectedClient.contactName);
       }
    }
  }, [selectedClient, setValue, watch]);

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
        <div className="grid grid-cols-2 gap-4">
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
          <div className="space-y-2">
            <Label htmlFor="contactName">Reported By (Contact Person)</Label>
            <Input id="contactName" {...register("contactName")} placeholder="e.g. Yossi Cohen" />
          </div>
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
        <div className="space-y-4">
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
             <Label htmlFor="approvedBy">Approved By (Client Sign-off)</Label>
             <Input 
                id="approvedBy" 
                list="approversList" 
                {...register("approvedBy")} 
                placeholder="Name of approver..." 
             />
             <datalist id="approversList">
                {selectedClient?.authorizedApprovers?.map(name => (
                   <option key={name} value={name} />
                ))}
             </datalist>
           </div>
        </div>
        <div className="space-y-2">
          <Label>Quick Time Logging</Label>
          {ticket?.id ? (
            <div className="flex flex-col space-y-2 border rounded-md p-3 bg-muted/30">
               <div className="flex space-x-2 items-center">
                 <div className="flex items-center justify-between border rounded-md p-1 bg-background w-32 shrink-0">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setLogMinutes(p => Math.max(15, p - 15))} disabled={logMinutes <= 15} className="h-8 w-8 p-0">
                       <Minus className="h-4 w-4" />
                    </Button>
                    <div className="text-sm font-medium w-16 text-center">{logMinutes}m</div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setLogMinutes(p => p + 15)} className="h-8 w-8 p-0">
                       <Plus className="h-4 w-4" />
                    </Button>
                 </div>
                 <Input 
                   value={logDesc}
                   onChange={e => setLogDesc(e.target.value)}
                   placeholder="Description of work done..."
                   className="flex-1"
                 />
               </div>
               <Button
                 type="button"
                 variant="secondary"
                 disabled={logMinutes <= 0 || logDesc.trim().length === 0}
                 onClick={async () => {
                    if (logMinutes > 0 && logDesc.trim().length > 0) {
                      await logTicketTime.mutateAsync({ ticketId: ticket.id!, additionalMinutes: logMinutes, description: logDesc });
                      setLogMinutes(15);
                      setLogDesc("");
                    }
                 }}
               >
                 Log Time
               </Button>
               <div className="text-xs text-muted-foreground mt-1">
                 Total logged so far: {ticket.timeLoggedMinutes || 0}m
               </div>
            </div>
          ) : (
             <div className="text-sm text-muted-foreground">Save the ticket first to enable quick time logging.</div>
          )}
        </div>
      </div>

      {ticket?.id && ticketEntries.length > 0 && (
         <div className="space-y-2 mt-4 pt-4 border-t">
           <Label className="text-primary font-semibold">Your Time Logs</Label>
           <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
             {ticketEntries.map(entry => {
               const isLocked = entry.billing_locked;
               const canEdit = !isLocked && user?.uid === entry.techId;
               const isEditing = editingEntryId === entry.id;

               return (
                 <div key={entry.id} className="text-sm border rounded-md p-3 bg-background relative flex flex-col space-y-2">
                    {isEditing ? (
                       <div className="flex flex-col space-y-2 border bg-muted/20 p-2 rounded-md">
                         <div className="flex space-x-2 items-center">
                           <div className="flex items-center justify-between border rounded-md p-1 bg-background w-32 shrink-0">
                              <Button type="button" variant="ghost" size="sm" onClick={() => setEditMinutes(p => Math.max(15, p - 15))} disabled={editMinutes <= 15} className="h-8 w-8 p-0">
                                 <Minus className="h-4 w-4" />
                              </Button>
                              <div className="text-sm font-medium w-16 text-center">{editMinutes}m</div>
                              <Button type="button" variant="ghost" size="sm" onClick={() => setEditMinutes(p => p + 15)} className="h-8 w-8 p-0">
                                 <Plus className="h-4 w-4" />
                              </Button>
                           </div>
                           <Input 
                             value={editDesc}
                             onChange={e => setEditDesc(e.target.value)}
                             placeholder="Description..."
                             className="flex-1"
                           />
                         </div>
                         <div className="flex justify-end space-x-2">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingEntryId(null)}>Cancel</Button>
                            <Button type="button" variant="default" size="sm" onClick={async () => {
                               if (editMinutes > 0 && editDesc.trim().length > 0) {
                                 await updateTicketTimeEntry.mutateAsync({
                                    entryId: entry.id,
                                    ticketId: ticket.id!,
                                    oldMinutes: entry.durationMinutes,
                                    newMinutes: editMinutes,
                                    newDescription: editDesc.trim()
                                 });
                                 setEditingEntryId(null);
                               }
                            }}>Save Log</Button>
                         </div>
                       </div>
                    ) : (
                       <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-primary">{entry.durationMinutes}m <span className="text-muted-foreground font-normal ml-2">{format(entry.date, "MMM d, HH:mm")}</span></div>
                            <div className="text-foreground mt-1 whitespace-pre-wrap">{entry.description}</div>
                          </div>
                          <div className="flex items-center space-x-1 shrink-0">
                             {isLocked ? (
                               <div className="flex items-center text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                 <Lock className="h-3 w-3 mr-1" /> Locked
                               </div>
                             ) : canEdit && (
                               <>
                                 <Button 
                                   type="button" 
                                   variant="ghost" 
                                   size="sm" 
                                   className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                                   onClick={() => {
                                     setEditingEntryId(entry.id);
                                     setEditMinutes(entry.durationMinutes);
                                     setEditDesc(entry.description || "");
                                   }}
                                 >
                                   <Pencil className="h-4 w-4" />
                                 </Button>
                                 <Button 
                                   type="button" 
                                   variant="ghost" 
                                   size="sm" 
                                   className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                   onClick={async () => {
                                     if(confirm("Delete this time log?")) {
                                        await deleteTicketTimeEntry.mutateAsync({
                                          entryId: entry.id,
                                          ticketId: ticket.id!,
                                          minutes: entry.durationMinutes
                                        });
                                     }
                                   }}
                                 >
                                   <Trash2 className="h-4 w-4" />
                                 </Button>
                               </>
                             )}
                          </div>
                       </div>
                    )}
                 </div>
               );
             })}
           </div>
         </div>
      )}

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
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-4">
              {formContent}
            </TabsContent>
            <TabsContent value="timeline" className="mt-4">
              <TicketNotesTimeline 
                ticketId={ticket.id!} 
                draftNote={draftNote} 
                onDraftChange={setDraftNote} 
              />
            </TabsContent>
          </Tabs>
        ) : (
          formContent
        )}
      </DialogContent>
    </Dialog>
  );
}
