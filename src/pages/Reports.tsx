import { useState, useMemo } from "react";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useUsers } from "@/hooks/useUsers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startOfMonth, startOfDay, endOfMonth, endOfDay, isWithinInterval } from "date-fns";

export function Reports() {
  const [timeRange, setTimeRange] = useState<'today' | 'thisMonth' | 'all'>('thisMonth');
  
  const { data: entries, isLoading: loadingEntries, error } = useTimeEntries();
  const { users, isLoading: loadingUsers } = useUsers();

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    const now = new Date();
    
    return entries.filter(entry => {
      if (!entry.date) return false;
      if (timeRange === 'all') return true;
      
      const start = timeRange === 'today' ? startOfDay(now) : startOfMonth(now);
      const end = timeRange === 'today' ? endOfDay(now) : endOfMonth(now);
      
      return isWithinInterval(entry.date, { start, end });
    });
  }, [entries, timeRange]);

  const statsByTech = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredEntries.forEach(entry => {
      stats[entry.techId] = (stats[entry.techId] || 0) + (entry.durationMinutes || 0);
    });
    return Object.entries(stats).map(([techId, totalMinutes]) => ({
      techId,
      totalMinutes,
      hours: (totalMinutes / 60).toFixed(2),
      techName: users?.find(u => u.uid === techId)?.displayName || techId
    })).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [filteredEntries, users]);

  if (loadingEntries || loadingUsers) {
    return <div className="p-8 flex items-center justify-center h-full text-muted-foreground">Loading reports...</div>;
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-destructive text-center">
        <h2 className="text-xl font-bold mb-2">Failed to load reports</h2>
        <p className="text-sm font-mono bg-destructive/10 p-4 rounded-lg">
          {(error as Error).message}
        </p>
      </div>
    );
  }

  const totalMinutesAcrossAll = statsByTech.reduce((sum, item) => sum + item.totalMinutes, 0);

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Technician Reports</h1>
          <p className="text-muted-foreground text-lg mt-2">View monthly, daily, and overall time tracking.</p>
        </div>
        <div className="w-[200px]">
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-card shadow-sm border-border">
          <CardHeader>
            <CardTitle className="text-primary">Total Time ({timeRange === 'today' ? 'Today' : timeRange === 'thisMonth' ? 'This Month' : 'All Time'})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">{(totalMinutesAcrossAll / 60).toFixed(2)} <span className="text-lg text-muted-foreground">Hours</span></div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card shadow-sm border-border mt-8">
        <CardHeader>
          <CardTitle className="text-primary">Time by Technician</CardTitle>
          <CardDescription>Total logged hours per technician for the selected period.</CardDescription>
        </CardHeader>
        <CardContent>
          {statsByTech.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">No time logged for this period.</div>
          ) : (
            <div className="border border-border rounded-md overflow-hidden bg-background">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Technician</th>
                    <th className="px-4 py-3 font-semibold">Total Minutes</th>
                    <th className="px-4 py-3 font-semibold">Total Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {statsByTech.map((stat, i) => (
                    <tr key={stat.techId} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{stat.techName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{stat.totalMinutes}m</td>
                      <td className="px-4 py-3 font-bold text-primary">{stat.hours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
