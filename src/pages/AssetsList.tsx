import { useMemo, useState } from "react";
import { useAssets, useAssetMutations } from "@/hooks/useAssets";
import { Asset } from "@/types/models";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Loader2, MoreHorizontal, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssetFormDialog } from "@/components/assets/AssetFormDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function AssetsList() {
  const { data: assets, isLoading } = useAssets();
  const { createAsset, updateAsset, deleteAsset } = useAssetMutations();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const handleOpenCreate = () => {
    setEditingAsset(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this asset?")) {
      try {
        await deleteAsset.mutateAsync(id);
        toast.success("Asset deleted successfully");
      } catch (error) {
        toast.error("Failed to delete asset");
      }
    }
  };

  const onSubmit = async (data: Partial<Asset>) => {
    try {
      if (editingAsset?.id) {
        await updateAsset.mutateAsync({ id: editingAsset.id, data });
        toast.success("Asset updated successfully");
      } else {
        await createAsset.mutateAsync(data as Omit<Asset, "id">);
        toast.success("Asset created successfully");
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("An error occurred while saving the asset");
    }
  };

  const columns = useMemo<ColumnDef<Asset>[]>(() => [
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
      header: "Client ID",
      cell: ({ row }) => {
        return <div className="text-muted-foreground">{row.getValue("clientId")}</div>;
      }
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        return <div className="capitalize">{type}</div>;
      }
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant="secondary" className={`
            ${status === 'active' ? 'bg-primary text-background' : ''}
            ${status === 'retired' ? 'bg-error text-background' : ''}
            ${status === 'maintenance' ? 'bg-secondary text-background' : ''}
          `}>
             {status.toUpperCase()}
          </Badge>
        );
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const asset = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(asset.id!)}>
                Copy Asset ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleOpenEdit(asset)}>
                <Edit className="mr-2 h-4 w-4" /> Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(asset.id!)} className="text-destructive focus:text-destructive">
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

  const isMutating = createAsset.isPending || updateAsset.isPending;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Assets Inventory</h2>
          <p className="text-muted-foreground font-body">
            Manage hardware and software assets across clients.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Asset
        </Button>
      </div>
      <DataTable columns={columns} data={assets || []} />
      <AssetFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        asset={editingAsset}
        onSubmit={onSubmit}
        isLoading={isMutating}
      />
    </div>
  );
}
