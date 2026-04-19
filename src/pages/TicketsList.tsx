import { useMemo, useState, useEffect } from "react";
import { useTickets, useTicketMutations } from "@/hooks/useTickets";
import { useClients, useClientMutations } from "@/hooks/useClients";

import { Ticket, Client } from "@/types/models";
import { useAuth } from "@/context/AuthContext";
import { useUsers } from "@/hooks/useUsers";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Loader2, MoreHorizontal, Plus, Minus, Edit, Trash2, Pencil, Lock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TicketFormDialog } from "@/components/tickets/TicketFormDialog";
import { ClientFormDialog } from "@/components/clients/ClientFormDialog";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {  
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { format } from "date-fns";

const TimeLoggedCell = ({ ticket, currentSavedMinutes, logTicketTime, updateTicketTimeEntry, deleteTicketTimeEntry, user }: any) => {
  const [open, setOpen] = useState(false);
  const [minutesToAdd, setMinutesToAdd] = useState(15);
  const [quickDesc, setQuickDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: entries } = useTimeEntries();
  const ticketEntries = useMemo(() => {
    if (!entries || !ticket?.id) return [];
    return entries.filter((e: any) => e.ticketId === ticket.id).sort((a: any,b: any) => b.date.getTime() - a.date.getTime());
  }, [entries, ticket?.id]);

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editMinutes, setEditMinutes] = useState(15);
  const [editDesc, setEditDesc] = useState("");

  const h = Math.floor(currentSavedMinutes / 60);
  const m = currentSavedMinutes % 60;

  const handleMinus = () => setMinutesToAdd(prev => Math.max(15, prev - 15));
  const handlePlus = () => setMinutesToAdd(prev => prev + 15);

  const handleQuickLog = async () => {
    if (minutesToAdd > 0 && quickDesc.trim()) {
      setIsSubmitting(true);
      try {
        await logTicketTime.mutateAsync({ 
          ticketId: ticket.id, 
          additionalMinutes: minutesToAdd, 
          description: quickDesc.trim() 
        });
        toast.success("Time logged successfully.");
        setOpen(false);
        setQuickDesc("");
        setMinutesToAdd(15);
      } catch (err: any) {
        toast.error("Failed to log time", { description: err.message });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="flex items-center gap-2 justify-start min-w-[120px]">
      <span className="text-sm font-medium cursor-default shrink-0">
        {h > 0 ? `${h}h ${m}m` : `${m}m`}
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-primary rounded-full">
            <Plus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[340px] p-4" side="right" align="start">
          <div className="space-y-3">
            <h4 className="font-medium text-sm leading-none">Quick Time Log</h4>
            <p className="text-xs text-muted-foreground">Add time directly to this ticket.</p>
            
            <div className="grid gap-4 mt-2">
              <div className="flex items-center justify-between border rounded-md p-1 bg-muted/20">
                <Button variant="ghost" size="sm" onClick={handleMinus} disabled={minutesToAdd <= 15} className="h-8 w-8 p-0">
                   <Minus className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium w-16 text-center">{minutesToAdd}m</div>
                <Button variant="ghost" size="sm" onClick={handlePlus} className="h-8 w-8 p-0">
                   <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-2">
                <Label htmlFor={`desc-${ticket.id}`} className="text-xs text-right">Desc</Label>
                <Input
                  id={`desc-${ticket.id}`}
                  className="col-span-3 h-8 text-sm"
                  placeholder="Work done..."
                  value={quickDesc}
                  onChange={(e) => setQuickDesc(e.target.value)}
                />
              </div>
              <Button 
                size="sm" 
                className="mt-2 text-xs h-8" 
                disabled={isSubmitting || !quickDesc.trim() || minutesToAdd <= 0}
                onClick={handleQuickLog}
              >
                {isSubmitting ? "Logging..." : "Log Time"}
              </Button>
            </div>

            {ticketEntries.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                 <h4 className="font-medium text-xs mb-2 text-muted-foreground">Recent Logs</h4>
                 <div className="space-y-2 max-h-[200px] overflow-y-auto">
                   {ticketEntries.map((entry: any) => {
                      const isLocked = entry.billing_locked;
                      const canEdit = !isLocked && user?.uid === entry.techId;
                      const isEditing = editingEntryId === entry.id;

                      return (
                         <div key={entry.id} className="text-xs border rounded p-2 bg-muted/20 flex flex-col gap-2">
                            {isEditing ? (
                               <div className="flex flex-col gap-2">
                                  <div className="flex items-center justify-between border rounded p-1 bg-background w-24">
                                     <Button variant="ghost" size="sm" onClick={() => setEditMinutes(p => Math.max(15, p - 15))} disabled={editMinutes <= 15} className="h-4 w-4 p-0"><Minus className="h-3 w-3" /></Button>
                                     <span className="font-medium">{editMinutes}m</span>
                                     <Button variant="ghost" size="sm" onClick={() => setEditMinutes(p => p + 15)} className="h-4 w-4 p-0"><Plus className="h-3 w-3" /></Button>
                                  </div>
                                  <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} className="h-6 text-xs" />
                                  <div className="flex justify-end gap-1">
                                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setEditingEntryId(null)}>Cancel</Button>
                                    <Button size="sm" className="h-6 px-2 text-xs" disabled={editMinutes <= 0 || !editDesc.trim()} onClick={async () => {
                                       await updateTicketTimeEntry.mutateAsync({ entryId: entry.id, ticketId: ticket.id, oldMinutes: entry.durationMinutes, newMinutes: editMinutes, newDescription: editDesc.trim() });
                                       setEditingEntryId(null);
                                    }}>Save</Button>
                                  </div>
                               </div>
                            ) : (
                               <div className="flex justify-between items-start">
                                 <div>
                                   <div className="font-semibold text-primary">{entry.durationMinutes}m <span className="text-muted-foreground font-normal ml-1">{format(entry.date, "MMM d, HH:mm")}</span></div>
                                   <div className="text-muted-foreground mt-0.5 whitespace-pre-wrap">{entry.description}</div>
                                 </div>
                                 <div className="flex items-center gap-1 shrink-0">
                                   {isLocked ? (
                                      <Lock className="h-3 w-3 text-muted-foreground" />
                                   ) : canEdit && (
                                      <>
                                        <Button variant="ghost" className="h-5 w-5 p-0" onClick={() => { setEditingEntryId(entry.id); setEditMinutes(entry.durationMinutes); setEditDesc(entry.description || ""); }}><Pencil className="h-3 w-3" /></Button>
                                        <Button variant="ghost" className="h-5 w-5 p-0 text-destructive hover:text-destructive" onClick={async () => {
                                           if (confirm("Delete this time log?")) await deleteTicketTimeEntry.mutateAsync({ entryId: entry.id, ticketId: ticket.id, minutes: entry.durationMinutes });
                                        }}><Trash2 className="h-3 w-3" /></Button>
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
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export function TicketsList() {
  const { data: tickets, isLoading } = useTickets();
  const { createTicket, updateTicket, deleteTicket, logTicketTime, updateTicketTimeEntry, deleteTicketTimeEntry } = useTicketMutations();
  const { data: clients } = useClients();
  const { updateClient } = useClientMutations();
  const { user } = useAuth();
  const { users } = useUsers();

  const currentUserRole = users?.find(u => u.uid === user?.uid)?.role || 'tech';
  const isAdmin = currentUserRole === 'admin';
  const validTechs = users?.filter(u => ['tech', 'admin'].includes(u.role || '')) || [];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [defaultDialogTab, setDefaultDialogTab] = useState<'details' | 'timeline'>('details');

  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);

  const handleOpenCreate = () => {
    setEditingTicket(null);
    setDefaultDialogTab('details');
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (ticket: Ticket, tab: 'details' | 'timeline' = 'details') => {
    setEditingTicket(ticket);
    setDefaultDialogTab(tab);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (confirm("Are you sure you want to delete this ticket?")) {
      try {
        await deleteTicket.mutateAsync(id);
        toast.success("Ticket deleted successfully.");
      } catch (e) {
        toast.error("Failed to delete ticket.");
      }
    }
  };

  const onSubmit = async (data: Partial<Ticket>) => {
    try {
      if (editingTicket?.id) {
        await updateTicket.mutateAsync({ id: editingTicket.id, ...data });
        toast.success("Ticket updated successfully.");
      } else {
        await createTicket.mutateAsync(data as Omit<Ticket, "id">);
        toast.success("Ticket created successfully.");
      }
    } catch (e) {
      toast.error("Failed to save ticket.");
    }
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ticketsState_statusFilter');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [techFilter, setTechFilter] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ticketsState_techFilter');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('ticketsState_statusFilter', JSON.stringify(statusFilter));
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem('ticketsState_techFilter', JSON.stringify(techFilter));
  }, [techFilter]);

  const techs = useMemo(() => {
    if (!tickets) return [];
    const techIds = tickets.map((t) => t.assignedTechId).filter(Boolean) as string[];
    return Array.from(new Set(techIds));
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter((t) => {
      const matchesSearch = searchTerm
        ? t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
          t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.id?.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      const matchesStatus = statusFilter.length === 0 ? true : statusFilter.includes(t.status);
      const matchesTech = techFilter.length === 0 ? true : 
        (t.assignedTechId ? techFilter.includes(t.assignedTechId) : false);
      return matchesSearch && matchesStatus && matchesTech;
    });
  }, [tickets, searchTerm, statusFilter, techFilter]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateTicket.mutateAsync({ id, status: newStatus as any });
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleAssignTech = async (ticketId: string, techId: string) => {
    try {
      await updateTicket.mutateAsync({ id: ticketId, assignedTechId: techId });
      toast.success("Ticket assigned successfully");
    } catch {
      toast.error("Failed to assign ticket");
    }
  };

  const handlePriorityChange = async (id: string, newPriority: string) => {
    try {
      await updateTicket.mutateAsync({ id, priority: newPriority as any });
      toast.success("Priority updated");
    } catch {
      toast.error("Failed to update priority");
    }
  };



  const handleClientClick = (clientId: string) => {
    const client = clients?.find((c) => c.id === clientId);
    if (client) {
      setViewingClient(client);
      setIsClientDialogOpen(true);
    }
  };

  const handleClientSubmit = async (data: Partial<Client>) => {
    try {
      if (viewingClient?.id) {
        await updateClient.mutateAsync({ id: viewingClient.id, ...data });
        toast.success("Client updated successfully.");
      }
      setIsClientDialogOpen(false);
    } catch {
      toast.error("Failed to update client.");
    }
  };

  const columns = useMemo<ColumnDef<Ticket>[]>(() => [
    {
      accessorKey: "id",
      header: "ID",
      meta: { className: "hidden lg:table-cell" },
      cell: ({ row }) => {
        const id = row.getValue("id") as string;
        return <div className="font-medium font-mono text-primary">{id.substring(0, 8).toUpperCase()}</div>;
      }
    },
    {
      accessorKey: "clientId",
      header: "Client",
      meta: { className: "w-[80px] md:w-auto" },
      cell: ({ row }) => {
        const clientId = row.getValue("clientId") as string;
        const client = clients?.find(c => c.id === clientId);
        return (
          <Button 
            variant="link" 
            className="p-0 h-auto font-normal text-muted-foreground hover:text-primary max-w-[80px] md:max-w-none truncate inline-block"
            onClick={() => handleClientClick(clientId)}
          >
            {client?.name || clientId}
          </Button>
        );
      }
    },
    {
      accessorKey: "title",
      header: "Issue",
      meta: { className: "max-w-[120px] md:max-w-none" },
      cell: ({ row }) => {
        const title = row.getValue("title") as string;
        const unreadCount = row.original.unreadNotes?.[user?.uid || ""] || 0;
        
        return (
          <div className="flex items-center gap-1 md:gap-2">
            <span className="font-medium text-foreground text-sm md:text-base line-clamp-2 md:line-clamp-none leading-snug">{title}</span>
            <Badge 
              variant="outline" 
              className={`h-5 px-1.5 min-w-[20px] text-[10px] gap-1 flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
                unreadCount > 0 
                ? 'bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90 focus:ring-destructive' 
                : 'bg-muted/50 text-muted-foreground hover:bg-muted/80 border-transparent shadow-none'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEdit(row.original, 'timeline');
              }}
              title={unreadCount > 0 ? `${unreadCount} unread notes` : "Open chat timeline"}
            >
              <MessageSquare className="h-3 w-3 shrink-0" />
              {unreadCount > 0 && <span className="font-bold">{unreadCount}</span>}
            </Badge>
          </div>
        );
      }
    },
    {
      accessorKey: "priority",
      header: "Priority",
      meta: { className: "hidden lg:table-cell" },
      cell: ({ row }) => {
        const priority = row.getValue("priority") as string;
        const ticket = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
              <Badge variant="outline" className={`cursor-pointer hover:opacity-80 transition-opacity
                ${priority === 'critical' ? 'border-destructive text-destructive bg-destructive/10' : ''}
                ${priority === 'high' ? 'border-orange-500 text-orange-500 bg-orange-500/10' : ''}
                ${priority === 'medium' ? 'border-primary text-primary bg-primary/10' : ''}
                ${priority === 'low' ? 'border-secondary text-secondary-foreground bg-secondary/10' : ''}
              `}>
                {priority.toUpperCase()}
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handlePriorityChange(ticket.id!, 'low')}>Low</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePriorityChange(ticket.id!, 'medium')}>Medium</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePriorityChange(ticket.id!, 'high')}>High</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePriorityChange(ticket.id!, 'critical')}>Critical</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    },
    {
      accessorKey: "status",
      header: "Status",
      meta: { className: "hidden sm:table-cell" },
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const ticket = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
              <Badge variant="secondary" className={`cursor-pointer hover:opacity-80 transition-opacity
                ${status === 'open' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
                ${status === 'in_progress' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
                ${status === 'resolved' ? 'bg-secondary text-secondary-foreground border-border' : ''}
              `}>
                 {status.replace('_', ' ').substring(0, 6).toUpperCase()}
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleStatusChange(ticket.id!, 'open')}>Open</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange(ticket.id!, 'in_progress')}>In Progress</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange(ticket.id!, 'resolved')}>Resolved</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    },
    {
      accessorKey: "assignedTechId",
      header: "Tech Name",
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) => {
        const ticket = row.original;
        const techId = row.getValue("assignedTechId") as string;
        const techUser = users?.find(u => u.uid === techId);
        const techName = techUser?.displayName || techId || "Unassigned";

        if (isAdmin) {
          return (
            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none">
                <Button variant="ghost" className="h-8 -ml-3 px-3 text-left font-normal text-muted-foreground justify-start hover:bg-muted/50 hover:text-foreground">
                  {techName}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleAssignTech(ticket.id!, "")}>Unassigned</DropdownMenuItem>
                <DropdownMenuSeparator />
                {validTechs.map((tech) => (
                  <DropdownMenuItem key={tech.uid} onClick={() => handleAssignTech(ticket.id!, tech.uid)}>
                    {tech.displayName || tech.email || tech.uid}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        return <div className="text-muted-foreground">{techName}</div>;
      }
    },
    {
      accessorKey: "timeLoggedMinutes",
      header: "Time",
      meta: { className: "w-[130px] pr-0 md:pr-4" },
      cell: ({ row }) => {
        const ticket = row.original;
        const currentSavedMinutes = Number(row.getValue("timeLoggedMinutes") || 0);
        return <TimeLoggedCell 
                 ticket={ticket} 
                 currentSavedMinutes={currentSavedMinutes} 
                 logTicketTime={logTicketTime} 
                 updateTicketTimeEntry={updateTicketTimeEntry} 
                 deleteTicketTimeEntry={deleteTicketTimeEntry} 
                 user={user} 
               />
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const ticket = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(ticket.id!)}>
                Copy Ticket ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleOpenEdit(ticket)}>
                <Edit className="mr-2 h-4 w-4" /> Edit Details
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => handleDelete(ticket.id!)} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [clients, updateTicket, isAdmin, validTechs, users]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isMutating = createTicket.isPending || updateTicket.isPending;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Support Tickets</h2>
            <p className="text-muted-foreground font-body">
              Manage and resolve operational issues.
            </p>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" /> Create Ticket
          </Button>
        </div>
        
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-4 bg-muted/30 p-2 md:p-4 rounded-lg border border-border">
          <Input 
            placeholder="Search tickets..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full md:max-w-xs bg-background" 
          />
          <div className="flex gap-2 w-full md:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" className="flex-1 md:w-[180px] justify-between bg-background font-normal border-input text-xs sm:text-sm px-2 sm:px-4" />}>
                {statusFilter.length === 0 ? "All Statuses" : `${statusFilter.length} Statuses`}
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[180px]">
                <DropdownMenuCheckboxItem 
                  checked={statusFilter.length === 0} 
                  onCheckedChange={() => setStatusFilter([])}
                >
                  All Statuses
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {['open', 'in_progress', 'resolved'].map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={statusFilter.includes(status)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setStatusFilter([...statusFilter, status]);
                      } else {
                        setStatusFilter(statusFilter.filter(s => s !== status));
                      }
                    }}
                  >
                    {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" className="flex-1 md:w-[180px] justify-between bg-background font-normal border-input text-xs sm:text-sm px-2 sm:px-4" />}>
                {techFilter.length === 0 ? "All Techs" : `${techFilter.length} Techs`}
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[180px]">
                <DropdownMenuCheckboxItem 
                  checked={techFilter.length === 0} 
                  onCheckedChange={() => setTechFilter([])}
                >
                  All Technicians
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {techs.map((techName) => (
                  <DropdownMenuCheckboxItem
                    key={techName}
                    checked={techFilter.includes(techName)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setTechFilter([...techFilter, techName]);
                      } else {
                        setTechFilter(techFilter.filter(t => t !== techName));
                      }
                    }}
                  >
                    {techName}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <DataTable columns={columns} data={filteredTickets} />
      </div>
      <TicketFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        ticket={editingTicket}
        onSubmit={onSubmit}
        isLoading={isMutating}
        defaultTab={defaultDialogTab}
      />
      <ClientFormDialog
        open={isClientDialogOpen}
        onOpenChange={setIsClientDialogOpen}
        client={viewingClient}
        onSubmit={handleClientSubmit}
        isLoading={false}
      />
    </div>
  );
}
