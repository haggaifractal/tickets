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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Asset } from "@/types/models";
import { useClients } from "@/hooks/useClients";

const assetSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  type: z.enum(["workstation", "server", "network", "printer", "other"]),
  clientId: z.string().min(1, "Client is required."),
  specs: z.string().optional(),
  status: z.enum(["active", "maintenance", "retired"]),
});

type AssetFormValues = z.infer<typeof assetSchema>;

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: Asset | null;
  onSubmit: (data: Partial<Asset>) => Promise<void>;
  isLoading?: boolean;
}

export function AssetFormDialog({
  open,
  onOpenChange,
  asset,
  onSubmit,
  isLoading,
}: AssetFormDialogProps) {
  const { data: clients } = useClients();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: "",
      type: "workstation",
      clientId: "",
      specs: "",
      status: "active",
    },
  });

  const typeValue = watch("type");
  const statusValue = watch("status");
  const clientIdValue = watch("clientId");

  React.useEffect(() => {
    if (asset) {
      reset({
        name: asset.name,
        type: asset.type,
        clientId: asset.clientId,
        specs: asset.specs || "",
        status: asset.status,
      });
    } else {
      reset({
        name: "",
        type: "workstation",
        clientId: "",
        specs: "",
        status: "active",
      });
    }
  }, [asset, reset, open]);

  const onFormSubmit = handleSubmit(async (data) => {
    await onSubmit(data);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{asset ? "Edit Asset" : "Add New Asset"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onFormSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Asset Name/Hostname</Label>
            <Input id="name" {...register("name")} placeholder="SRV-DC-01" />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientId">Client</Label>
            <Select
              value={clientIdValue}
              onValueChange={(val: string) => setValue("clientId", val)}
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
            {errors.clientId && (
              <p className="text-sm text-destructive">{errors.clientId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={typeValue}
              onValueChange={(val: any) => setValue("type", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="workstation">Workstation</SelectItem>
                <SelectItem value="server">Server</SelectItem>
                <SelectItem value="network">Network Device</SelectItem>
                <SelectItem value="printer">Printer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-destructive">{errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={statusValue}
              onValueChange={(val: any) => setValue("status", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-sm text-destructive">{errors.status.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="specs">Specs / Details (Optional)</Label>
            <Input
              id="specs"
              {...register("specs")}
              placeholder="e.g. Dell R740, 64GB RAM"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Asset"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
