import { useMemo, useState } from "react";
import { useClients, useClientMutations } from "@/hooks/useClients";
import { Client } from "@/types/models";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Loader2, MoreHorizontal, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientFormDialog } from "@/components/clients/ClientFormDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function ClientsList() {
  const { data: clients, isLoading } = useClients();
  const { createClient, updateClient, deleteClient } = useClientMutations();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const handleOpenCreate = () => {
    setEditingClient(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this client?")) {
      try {
        await deleteClient.mutateAsync(id);
        toast.success("Client deleted successfully");
      } catch (error) {
        toast.error("Failed to delete client");
      }
    }
  };

  const onSubmit = async (data: Partial<Client>) => {
    try {
      if (editingClient?.id) {
        await updateClient.mutateAsync({ id: editingClient.id, ...data });
        toast.success("Client updated successfully");
      } else {
        await createClient.mutateAsync(data as Omit<Client, "id">);
        toast.success("Client created successfully");
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("An error occurred while saving the client");
    }
  };

  const columns = useMemo<ColumnDef<Client>[]>(() => [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => {
        const id = row.getValue("id") as string;
        return <div className="font-medium font-mono text-primary">{id.substring(0, 8).toUpperCase()}</div>;
      }
    },
    {
      accessorKey: "name",
      header: "Client Name",
    },
    {
      accessorKey: "contactEmail",
      header: "Contact Email",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant="secondary" className={`
            ${status === 'active' ? 'bg-primary text-background' : ''}
            ${status === 'inactive' ? 'bg-error text-background' : ''}
          `}>
             {status.toUpperCase()}
          </Badge>
        );
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const client = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(client.id!)}>
                Copy Client ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleOpenEdit(client)}>
                <Edit className="mr-2 h-4 w-4" /> Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(client.id!)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isMutating = createClient.isPending || updateClient.isPending;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clients Settings</h2>
          <p className="text-muted-foreground font-body">
            Manage managed service clients and SLAs.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Client
        </Button>
      </div>

      <DataTable columns={columns} data={clients || []} />

      <ClientFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        client={editingClient}
        onSubmit={onSubmit}
        isLoading={isMutating}
      />
    </div>
  );
}
