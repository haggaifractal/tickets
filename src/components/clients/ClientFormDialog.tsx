import React, { useMemo } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Client } from "@/types/models";
import { useTickets } from "@/hooks/useTickets";
import { ClientTicketsTab } from "./ClientTicketsTab";
import { ClientOverviewTab } from "./ClientOverviewTab";

const clientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  contactName: z.string().optional(),
  contactRole: z.string().optional(),
  contactEmail: z.string().email("Invalid email address."),
  contactPhone: z.string().min(5, "Contact phone is required."),
  status: z.enum(["active", "inactive"]),
  priorityCustomerId: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSubmit: (data: Partial<Client>) => Promise<void>;
  isLoading?: boolean;
}

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSubmit,
  isLoading,
}: ClientFormDialogProps) {
  const { data: allTickets } = useTickets();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      contactName: "",
      contactRole: "",
      contactEmail: "",
      contactPhone: "",
      status: "active",
      priorityCustomerId: "",
    },
  });

  const statusValue = watch("status");

  React.useEffect(() => {
    if (client) {
      reset({
        name: client.name,
        contactName: client.contactName || "",
        contactRole: client.contactRole || "",
        contactEmail: client.contactEmail,
        contactPhone: client.contactPhone,
        status: client.status,
        priorityCustomerId: client.priorityCustomerId || "",
      });
    } else {
      reset({
        name: "",
        contactName: "",
        contactRole: "",
        contactEmail: "",
        contactPhone: "",
        status: "active",
        priorityCustomerId: "",
      });
    }
  }, [client, reset, open]);

  const onFormSubmit = handleSubmit(async (data) => {
    await onSubmit(data);
    onOpenChange(false);
  });

  // Client 360 calculations
  const clientTickets = useMemo(() => {
    if (!client?.id || !allTickets) return [];
    return allTickets.filter(t => t.clientId === client.id);
  }, [allTickets, client?.id]);



  const formContent = (
    <form onSubmit={onFormSubmit} className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Company Name</Label>
          <Input id="name" {...register("name")} placeholder="Acme Corp" />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="priorityCustomerId">Priority ERP ID</Label>
          <Input id="priorityCustomerId" {...register("priorityCustomerId")} placeholder="e.g., C00001" />
          {errors.priorityCustomerId && (
            <p className="text-sm text-destructive">{errors.priorityCustomerId.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contactName">Contact Name</Label>
          <Input id="contactName" {...register("contactName")} placeholder="Jane Doe" />
          {errors.contactName && (
            <p className="text-sm text-destructive">{errors.contactName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactRole">Contact Role</Label>
          <Input id="contactRole" {...register("contactRole")} placeholder="IT Manager" />
          {errors.contactRole && (
             <p className="text-sm text-destructive">{errors.contactRole.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactEmail">Contact Email</Label>
        <Input
          id="contactEmail"
          type="email"
          {...register("contactEmail")}
          placeholder="contact@acme.com"
        />
        {errors.contactEmail && (
          <p className="text-sm text-destructive">
            {errors.contactEmail.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactPhone">Contact Phone</Label>
        <Input
          id="contactPhone"
          {...register("contactPhone")}
          placeholder="+1 555 123 4567"
        />
        {errors.contactPhone && (
          <p className="text-sm text-destructive">
            {errors.contactPhone.message}
          </p>
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
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        {errors.status && (
          <p className="text-sm text-destructive">{errors.status.message}</p>
        )}
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
          {isLoading ? "Saving..." : "Save Client"}
        </Button>
      </div>
    </form>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? `${client.name} - Summary` : "Add New Client"}</DialogTitle>
        </DialogHeader>

        {client ? (
          <Tabs defaultValue="details" className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="tickets">Tickets</TabsTrigger>
              <TabsTrigger value="time">Overview</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="mt-4">
              {formContent}
            </TabsContent>

            <TabsContent value="tickets" className="mt-4">
              <ClientTicketsTab tickets={clientTickets} />
            </TabsContent>

            <TabsContent value="time" className="mt-4">
              <ClientOverviewTab tickets={clientTickets} />
            </TabsContent>
          </Tabs>
        ) : (
          formContent
        )}
      </DialogContent>
    </Dialog>
  );
}
