import { useState, useMemo, Fragment } from "react";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useUsers } from "@/hooks/useUsers";
import { useTickets, useTicketMutations } from "@/hooks/useTickets";
import { useClients } from "@/hooks/useClients";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, AlertCircle, RefreshCw, LockOpen, Lock, Pencil, Trash2, Minus, Plus } from "lucide-react";
import { format } from "date-fns";
import { doc, writeBatch } from "firebase/firestore";
import { db } from "@/config/firebase";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BillingQueue() {
  const { data: entries, isLoading: loadingEntries } = useTimeEntries();
  const { users } = useUsers();
  const { data: tickets } = useTickets();
  const { data: clients } = useClients();
  const { updateTicketTimeEntry, deleteTicketTimeEntry } = useTicketMutations();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLocking, setIsLocking] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [editMinutes, setEditMinutes] = useState(15);
  const [editDesc, setEditDesc] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // We show entries that are NOT locked OR have a priority_error
  const queueEntries = useMemo(() => {
    if (!entries) return [];
    return entries.filter(e => !e.billing_locked || e.priority_error);
  }, [entries]);

  const lockedEntries = useMemo(() => {
    if (!entries) return [];
    return entries.filter(e => e.billing_locked && !e.priority_error);
  }, [entries]);

  const groupEntriesByClient = (entriesToGroup: typeof queueEntries) => {
    const grouped = entriesToGroup.reduce((acc, entry) => {
      const ticket = tickets?.find(t => t.id === entry.ticketId);
      const clientId = ticket?.clientId || "unknown";
      if (!acc[clientId]) acc[clientId] = [];
      acc[clientId].push(entry);
      return acc;
    }, {} as Record<string, typeof queueEntries>);
    return grouped;
  };

  const groupedPending = useMemo(() => groupEntriesByClient(queueEntries), [queueEntries, tickets]);
  const groupedLocked = useMemo(() => groupEntriesByClient(lockedEntries), [lockedEntries, tickets]);

  const toggleSelectAll = () => {
    if (selectedIds.size === queueEntries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(queueEntries.map(e => e.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectGroup = (entriesInGroup: typeof queueEntries) => {
    const next = new Set(selectedIds);
    const allSelected = entriesInGroup.every(e => next.has(e.id));
    if (allSelected) {
      entriesInGroup.forEach(e => next.delete(e.id));
    } else {
      entriesInGroup.forEach(e => next.add(e.id));
    }
    setSelectedIds(next);
  };

  const handleBulkLock = async () => {
    if (selectedIds.size === 0) return;
    setIsLocking(true);
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        const ref = doc(db, "time_entries", id);
        batch.update(ref, { billing_locked: true, updatedAt: new Date().toISOString() });
      });
      await batch.commit();
      toast.success(`Successfully locked ${selectedIds.size} entries for billing syncing.`);
      setSelectedIds(new Set());
    } catch (error: any) {
      toast.error("Failed to lock entries", { description: error.message });
    } finally {
      setIsLocking(false);
    }
  };

  const handleUnlockAndFix = async (id: string, isErrorFix: boolean = true) => {
    try {
      const ref = doc(db, "time_entries", id);
      await writeBatch(db).update(ref, { 
        billing_locked: false, 
        priority_error: null,
        updatedAt: new Date().toISOString()
      }).commit();
      toast.success(isErrorFix ? "Entry unlocked and ready to retry." : "Entry unlocked successfully.");
    } catch (error: any) {
      toast.error("Failed to unlock entry", { description: error.message });
    }
  };

  const openEdit = (entry: any) => {
    setEditingEntry(entry);
    setEditMinutes(entry.durationMinutes);
    setEditDesc(entry.description || "");
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    setIsSaving(true);
    try {
      await updateTicketTimeEntry.mutateAsync({
        entryId: editingEntry.id,
        ticketId: editingEntry.ticketId,
        oldMinutes: editingEntry.durationMinutes,
        newMinutes: editMinutes,
        newDescription: editDesc.trim(),
      });
      toast.success("Time entry updated.");
      setEditingEntry(null);
    } catch(err: any) {
      toast.error("Failed to update entry.", { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (entry: any) => {
    if (!confirm("Are you sure you want to delete this time entry? This will revert the hours on the ticket as well.")) return;
    try {
       await deleteTicketTimeEntry.mutateAsync({
         entryId: entry.id,
         ticketId: entry.ticketId,
         minutes: entry.durationMinutes
       });
       toast.success("Entry deleted successfully.");
    } catch(err: any) {
       toast.error("Failed to delete entry.", { description: err.message });
    }
  };

  if (loadingEntries) {
    return <div className="p-8 text-center text-muted-foreground">Loading queue...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Billing Approval Queue</h2>
          <p className="text-muted-foreground text-sm">Review unbilled time entries and lock them to sync with Priority ERP.</p>
        </div>
        {activeTab === "pending" && (
          <Button 
            onClick={handleBulkLock} 
            disabled={selectedIds.size === 0 || isLocking}
          >
            {isLocking ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Approve & Lock ({selectedIds.size})
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">Pending Approval ({queueEntries.length})</TabsTrigger>
          <TabsTrigger value="locked">Locked & Synced ({lockedEntries.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-0">
          <div className="border border-border rounded-md bg-background">
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedIds.size > 0 && selectedIds.size === queueEntries.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Ticket & Date</TableHead>
                    <TableHead>Contact & Approval</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.keys(groupedPending).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        All clear! No pending unbilled entries.
                      </TableCell>
                    </TableRow>
                  ) : (
                    Object.entries(groupedPending).map(([clientId, entriesForClient]) => {
                      const clientName = clients?.find(c => c.id === clientId)?.name || "Unknown Client";
                      const totalMinutes = entriesForClient.reduce((sum, e) => sum + e.durationMinutes, 0);
                      const allGroupSelected = entriesForClient.every(e => selectedIds.has(e.id));
                      
                      return (
                        <Fragment key={`group-${clientId}`}>
                          <TableRow className="bg-muted/40 font-medium border-t-2 border-border border-b">
                            <TableCell>
                              <Checkbox 
                                checked={allGroupSelected}
                                onCheckedChange={() => toggleSelectGroup(entriesForClient)}
                              />
                            </TableCell>
                            <TableCell colSpan={7} className="py-2 text-primary">
                              Client: <span className="font-bold">{clientName}</span> 
                              <span className="text-muted-foreground ml-2 text-sm">
                                (Total pending: {(totalMinutes / 60).toFixed(2)}h)
                              </span>
                            </TableCell>
                          </TableRow>
                          {entriesForClient.map(entry => {
                            const tech = users?.find(u => u.uid === entry.techId)?.displayName || "Unknown";
                            const ticketTitle = tickets?.find(t => t.id === entry.ticketId)?.title || "Unknown Ticket";
                            
                            return (
                              <TableRow key={entry.id} className={entry.priority_error ? "bg-destructive/10" : ""}>
                                <TableCell>
                                  <Checkbox 
                                    checked={selectedIds.has(entry.id)}
                                    onCheckedChange={() => toggleSelect(entry.id)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="font-semibold text-xs text-muted-foreground truncate max-w-[150px]" title={ticketTitle}>
                                    {ticketTitle}
                                  </div>
                                  <div className="whitespace-nowrap mt-0.5">
                                    {entry.date ? format(new Date(entry.date), "MMM d, yyyy HH:mm") : "N/A"}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {tickets?.find(t => t.id === entry.ticketId)?.contactName ? (
                                     <div className="text-xs whitespace-nowrap"><span className="font-medium text-muted-foreground mr-1">User:</span>{tickets?.find(t => t.id === entry.ticketId)?.contactName}</div>
                                  ) : (
                                     <div className="text-xs text-muted-foreground italic">No Contact</div>
                                  )}
                                  {tickets?.find(t => t.id === entry.ticketId)?.approvedBy && (
                                     <div className="text-xs mt-0.5 text-green-600 whitespace-nowrap"><span className="font-medium mr-1">Appr:</span>{tickets?.find(t => t.id === entry.ticketId)?.approvedBy}</div>
                                  )}
                                </TableCell>
                                <TableCell>{tech}</TableCell>
                                <TableCell className="max-w-[400px] whitespace-pre-wrap break-words">
                                  {entry.description || <span className="text-muted-foreground italic">No description</span>}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {(entry.durationMinutes / 60).toFixed(2)}h
                                </TableCell>
                                <TableCell>
                                  {entry.priority_error ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2 text-destructive cursor-pointer">
                                          <AlertCircle className="h-4 w-4" />
                                          <span className="text-xs font-semibold">Sync Error</span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="left" className="max-w-[300px] space-y-2">
                                        <p className="font-semibold text-destructive">ERP Sync Failed</p>
                                        <p className="text-sm">{entry.priority_error}</p>
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          className="w-full mt-2" 
                                          onClick={() => handleUnlockAndFix(entry.id, true)}
                                        >
                                          <LockOpen className="h-3 w-3 mr-2" />
                                          Unlock & Fix
                                        </Button>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <span className="text-xs font-medium bg-amber-500/10 text-amber-600 px-2 py-1 rounded-full border border-amber-500/20">
                                      Pending
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right space-x-1">
                                  <Button variant="ghost" size="sm" onClick={() => openEdit(entry)} className="h-8 w-8 p-0 text-muted-foreground hover:text-primary">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDelete(entry)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TooltipProvider>
          </div>
        </TabsContent>

        <TabsContent value="locked" className="mt-0">
          <div className="border border-border rounded-md bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket & Date</TableHead>
                  <TableHead>Contact & Approval</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.keys(groupedLocked).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No locked entries found.
                    </TableCell>
                  </TableRow>
                ) : (
                  Object.entries(groupedLocked).map(([clientId, entriesForClient]) => {
                    const clientName = clients?.find(c => c.id === clientId)?.name || "Unknown Client";
                    const totalMinutes = entriesForClient.reduce((sum, e) => sum + e.durationMinutes, 0);

                    return (
                      <Fragment key={`locked-group-${clientId}`}>
                        <TableRow className="bg-muted/40 font-medium border-t-2 border-border border-b">
                          <TableCell colSpan={7} className="py-2 text-primary">
                            Client: <span className="font-bold">{clientName}</span> 
                            <span className="text-muted-foreground ml-2 text-sm">
                              (Total logged: {(totalMinutes / 60).toFixed(2)}h)
                            </span>
                          </TableCell>
                        </TableRow>
                        {entriesForClient.map(entry => {
                          const tech = users?.find(u => u.uid === entry.techId)?.displayName || "Unknown";
                          const ticketTitle = tickets?.find(t => t.id === entry.ticketId)?.title || "Unknown Ticket";
                          
                          return (
                            <TableRow key={entry.id}>
                              <TableCell>
                                  <div className="font-semibold text-xs text-muted-foreground truncate max-w-[150px]" title={ticketTitle}>
                                    {ticketTitle}
                                  </div>
                                  <div className="whitespace-nowrap mt-0.5">
                                    {entry.date ? format(new Date(entry.date), "MMM d, yyyy HH:mm") : "N/A"}
                                  </div>
                              </TableCell>
                              <TableCell>
                                {tickets?.find(t => t.id === entry.ticketId)?.contactName ? (
                                    <div className="text-xs whitespace-nowrap"><span className="font-medium text-muted-foreground mr-1">User:</span>{tickets?.find(t => t.id === entry.ticketId)?.contactName}</div>
                                ) : (
                                    <div className="text-xs text-muted-foreground italic">No Contact</div>
                                )}
                                {tickets?.find(t => t.id === entry.ticketId)?.approvedBy && (
                                    <div className="text-xs mt-0.5 text-green-600 whitespace-nowrap"><span className="font-medium mr-1">Appr:</span>{tickets?.find(t => t.id === entry.ticketId)?.approvedBy}</div>
                                )}
                              </TableCell>
                              <TableCell>{tech}</TableCell>
                              <TableCell className="max-w-[400px] whitespace-pre-wrap break-words">
                                {entry.description || <span className="text-muted-foreground italic">No description</span>}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {(entry.durationMinutes / 60).toFixed(2)}h
                              </TableCell>
                              <TableCell>
                                {entry.priority_synced ? (
                                  <span className="text-xs font-medium bg-green-500/10 text-green-600 px-2 py-1 rounded-full border border-green-500/20 flex items-center justify-center w-fit">
                                    <Check className="h-3 w-3 mr-1" /> Synced
                                  </span>
                                ) : (
                                  <span className="text-xs font-medium bg-blue-500/10 text-blue-600 px-2 py-1 rounded-full border border-blue-500/20 flex items-center justify-center w-fit">
                                    <Lock className="h-3 w-3 mr-1" /> Locked
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-muted-foreground hover:text-foreground"
                                  onClick={() => handleUnlockAndFix(entry.id, false)}
                                  title="Unlock Entry"
                                >
                                  <LockOpen className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingEntry} onOpenChange={(val) => !val && setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Time Entry</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="space-y-2">
                <Label>Time (Minutes)</Label>
                <div className="flex items-center justify-between border rounded-md p-1 bg-muted/20 w-32">
                  <Button variant="ghost" size="sm" onClick={() => setEditMinutes(p => Math.max(15, p - 15))} disabled={editMinutes <= 15} className="h-8 w-8 p-0">
                     <Minus className="h-4 w-4" />
                  </Button>
                  <div className="text-sm font-medium w-16 text-center">{editMinutes}m</div>
                  <Button variant="ghost" size="sm" onClick={() => setEditMinutes(p => p + 15)} className="h-8 w-8 p-0">
                     <Plus className="h-4 w-4" />
                  </Button>
                </div>
             </div>
             <div className="space-y-2">
                <Label>Description</Label>
                <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="What was done?" />
             </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setEditingEntry(null)}>Cancel</Button>
             <Button onClick={handleSaveEdit} disabled={isSaving || !editDesc.trim()}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
