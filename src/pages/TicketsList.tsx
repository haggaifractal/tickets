import { useMemo, useState, useEffect } from "react";
import { useTickets, useTicketMutations } from "@/hooks/useTickets";
import { useClients, useClientMutations } from "@/hooks/useClients";
import { useDebounceTimeLogger } from "@/hooks/useDebounceTimeLogger";
import { Ticket, Client } from "@/types/models";
import { useAuth } from "@/context/AuthContext";
import { useUsers } from "@/hooks/useUsers";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Loader2, MoreHorizontal, Plus, Minus, Edit, Trash2 } from "lucide-react";
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

export function TicketsList() {
  const { data: tickets, isLoading } = useTickets();
  const { createTicket, updateTicket, deleteTicket } = useTicketMutations();
  const { data: clients } = useClients();
  const { updateClient } = useClientMutations();
  const { user } = useAuth();
  const { users } = useUsers();

  const currentUserRole = users?.find(u => u.uid === user?.uid)?.role || 'tech';
  const isAdmin = currentUserRole === 'admin';
  const validTechs = users?.filter(u => ['tech', 'admin'].includes(u.role || '')) || [];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);

  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);

  const handleOpenCreate = () => {
    setEditingTicket(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (ticket: Ticket) => {
    setEditingTicket(ticket);
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

  const { addTime, pendingLogs } = useDebounceTimeLogger(5000);

  const handleTimeSubmit = (ticketId: string, additionalMinutes: number) => {
    const ticket = tickets?.find(t => t.id === ticketId);
    if (!ticket) return;
    const current = Number(ticket.timeLoggedMinutes) || 0;
    const pending = pendingLogs[ticketId] || 0;
    if (current + pending + additionalMinutes < 0) {
      toast.error("Cannot reduce time below zero");
      return;
    }
    addTime(ticketId, additionalMinutes);
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
      cell: ({ row }) => {
        const id = row.getValue("id") as string;
        return <div className="font-medium font-mono text-primary">{id.substring(0, 8).toUpperCase()}</div>;
      }
    },
    {
      accessorKey: "clientId",
      header: "Client Name",
      cell: ({ row }) => {
        const clientId = row.getValue("clientId") as string;
        const client = clients?.find(c => c.id === clientId);
        return (
          <Button 
            variant="link" 
            className="p-0 h-auto font-normal text-muted-foreground hover:text-primary"
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
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const priority = row.getValue("priority") as string;
        const ticket = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
              <Badge variant="outline" className={`cursor-pointer hover:opacity-80 transition-opacity
                ${priority === 'critical' ? 'border-error text-error bg-error/10' : ''}
                ${priority === 'high' ? 'border-orange-500 text-orange-500 bg-orange-500/10' : ''}
                ${priority === 'medium' ? 'border-primary text-primary bg-primary/10' : ''}
                ${priority === 'low' ? 'border-secondary text-secondary bg-secondary/10' : ''}
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
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const ticket = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
              <Badge variant="secondary" className={`cursor-pointer hover:opacity-80 transition-opacity
                ${status === 'open' ? 'bg-error text-background' : ''}
                ${status === 'in_progress' ? 'bg-primary text-background' : ''}
                ${status === 'resolved' ? 'bg-secondary text-background border-outline' : ''}
              `}>
                 {status.replace('_', ' ').toUpperCase()}
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
      header: "Time Logged",
      cell: ({ row }) => {
        const ticket = row.original;
        const currentSavedMinutes = Number(row.getValue("timeLoggedMinutes") || 0);
        const pending = pendingLogs[ticket.id!] || 0;
        const minutes = currentSavedMinutes + pending;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return (
          <div className="flex items-center gap-1 justify-center max-w-[120px]">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-error hover:bg-error/10" 
              onClick={() => handleTimeSubmit(ticket.id!, -15)} 
              title="Subtract 15 minutes"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-sm font-medium w-14 text-center cursor-default shrink-0">
              {h > 0 ? `${h}h ${m}m` : `${m}m`}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10" 
              onClick={() => handleTimeSubmit(ticket.id!, 15)} 
              title="Add 15 minutes"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        );
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
        
        <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-lg border border-border">
          <Input 
            placeholder="Search tickets..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="max-w-xs bg-background" 
          />
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" className="w-[180px] justify-between bg-background font-normal border-input" />}>
              {statusFilter.length === 0 ? "All Statuses" : `${statusFilter.length} Statuses Selected`}
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
            <DropdownMenuTrigger render={<Button variant="outline" className="w-[180px] justify-between bg-background font-normal border-input" />}>
              {techFilter.length === 0 ? "All Technicians" : `${techFilter.length} Techs Selected`}
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
      <DataTable columns={columns} data={filteredTickets} />
      <TicketFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        ticket={editingTicket}
        onSubmit={onSubmit}
        isLoading={isMutating}
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
