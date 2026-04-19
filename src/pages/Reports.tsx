import { useState, useMemo } from "react";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useUsers } from "@/hooks/useUsers";
import { useTickets } from "@/hooks/useTickets";
import { useClients } from "@/hooks/useClients";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startOfMonth, startOfDay, endOfMonth, endOfDay, isWithinInterval } from "date-fns";
import { BillingQueue } from "@/components/reports/BillingQueue";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from "recharts";

const COLORS = [
  "#0ea5e9", // Sky 500
  "#8b5cf6", // Violet 500
  "#10b981", // Emerald 500
  "#f43f5e", // Rose 500
  "#f59e0b", // Amber 500
  "#06b6d4", // Cyan 500
  "#d946ef", // Fuchsia 500
  "#64748b", // Slate 500
];

export function Reports() {
  const [timeRange, setTimeRange] = useState<'today' | 'thisMonth' | 'all'>('thisMonth');
  
  const { data: entries, isLoading: loadingEntries, error } = useTimeEntries();
  const { users, isLoading: loadingUsers } = useUsers();
  const { data: tickets, isLoading: loadingTickets } = useTickets();
  const { data: clients, isLoading: loadingClients } = useClients();

  const isLoading = loadingEntries || loadingUsers || loadingTickets || loadingClients;

  // 1. Filter time entries by selected date range
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

  // 2. Enrich entries with Client Names and aggregate metrics
  const { techClientMatrix, clientDistribution, allClientNames, totalMinutes, activeTechsCount } = useMemo(() => {
    if (!filteredEntries || !tickets || !clients || !users) {
      return { techClientMatrix: [], clientDistribution: [], allClientNames: [], totalMinutes: 0, activeTechsCount: 0 };
    }

    let totalMin = 0;
    const clientTotals: Record<string, number> = {};
    const techTotals: Record<string, { total: number, clients: Record<string, number> }> = {};
    const activeTechs = new Set<string>();

    filteredEntries.forEach(entry => {
      const duration = entry.durationMinutes || 0;
      if (duration <= 0) return;

      totalMin += duration;
      activeTechs.add(entry.techId);

      // Resolve Ticket and Client
      const ticket = tickets.find(t => t.id === entry.ticketId);
      const client = ticket ? clients.find(c => c.id === ticket.clientId) : null;
      const clientName = client?.name || "Unknown Client";

      // Aggregate for Pie Chart
      clientTotals[clientName] = (clientTotals[clientName] || 0) + duration;

      // Aggregate for Tech Stacked Bar
      const techUser = users.find(u => u.uid === entry.techId);
      const techName = techUser?.displayName || techUser?.email?.split('@')[0] || entry.techId;

      if (!techTotals[techName]) {
        techTotals[techName] = { total: 0, clients: {} };
      }
      techTotals[techName].total += duration;
      techTotals[techName].clients[clientName] = (techTotals[techName].clients[clientName] || 0) + duration;
    });

    // Format for Recharts Tech Stacked Bar
    const uniqueClients = new Set<string>();
    const formattedMatrix = Object.entries(techTotals)
      .map(([techName, data]) => {
        const item: any = { name: techName, totalHours: Number((data.total / 60).toFixed(2)) };
        Object.entries(data.clients).forEach(([cName, min]) => {
          item[cName] = Number((min / 60).toFixed(2));
          uniqueClients.add(cName);
        });
        return item;
      })
      .sort((a, b) => b.totalHours - a.totalHours);

    // Format for Recharts Pie Chart
    const formattedPie = Object.entries(clientTotals)
      .map(([name, min]) => ({ name, value: Number((min / 60).toFixed(2)) }))
      .sort((a, b) => b.value - a.value);

    return { 
      techClientMatrix: formattedMatrix, 
      clientDistribution: formattedPie, 
      allClientNames: Array.from(uniqueClients),
      totalMinutes: totalMin,
      activeTechsCount: activeTechs.size
    };
  }, [filteredEntries, tickets, clients, users]);


  if (isLoading) {
    return <div className="p-8 flex items-center justify-center h-full text-muted-foreground">Loading analytics...</div>;
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-destructive text-center">
        <h2 className="text-xl font-bold mb-2">Failed to load reports</h2>
        <p className="text-sm font-mono bg-destructive/10 p-4 rounded-lg">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground text-lg mt-2">Deep dive into time allocation and team billing.</p>
        </div>
      </div>

      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="stats">Service Analytics</TabsTrigger>
          <TabsTrigger value="billing">Billing Queue</TabsTrigger>
        </TabsList>
        
        <TabsContent value="stats" className="space-y-6 mt-6">
          <div className="flex justify-end">
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
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Service Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{(totalMinutes / 60).toFixed(2)}<span className="text-xl text-muted-foreground ml-1">h</span></div>
                <p className="text-xs text-muted-foreground mt-1">Logged in selected period</p>
              </CardContent>
            </Card>
            <Card className="bg-card shadow-sm border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Technicians</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{activeTechsCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Contributors</p>
              </CardContent>
            </Card>
            <Card className="bg-card shadow-sm border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{clientDistribution.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Receiving service</p>
              </CardContent>
            </Card>
          </div>

          {totalMinutes === 0 ? (
            <Card className="bg-card shadow-sm border-border"><CardContent className="pt-6 text-center text-muted-foreground">No time logged for this period.</CardContent></Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-card shadow-sm border-border col-span-2 lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg">Technician Time by Client (Hours)</CardTitle>
                  <CardDescription>Visualizing how each technician distributes their time across clients.</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={techClientMatrix} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} maxBarSize={60}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} className="text-xs font-medium" tick={{ fill: 'currentColor', opacity: 0.6 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} className="text-xs font-medium" tick={{ fill: 'currentColor', opacity: 0.6 }} dx={-10} />
                      <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} iconType="circle" />
                      {allClientNames.map((clientName, index) => (
                        <Bar key={clientName} dataKey={clientName} fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]}>
                          <LabelList 
                            dataKey={clientName} 
                            position="top" 
                            style={{ fill: 'currentColor', opacity: 0.8, fontSize: 11, fontWeight: 500 }} 
                            formatter={(val: number) => val > 0 ? `${val}h` : ''} 
                          />
                        </Bar>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-card shadow-sm border-border col-span-2 lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg">Global Time Distribution</CardTitle>
                  <CardDescription>Total support hours consumed globally per client.</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={clientDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        labelLine={false}
                      >
                        {clientDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} hours`, 'Time']} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" wrapperStyle={{ fontSize: '13px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-card shadow-sm border-border col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Data Breakdown Matrix</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border border-border rounded-md overflow-x-auto bg-background">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted text-muted-foreground whitespace-nowrap">
                        <tr>
                          <th className="px-4 py-3 font-semibold w-1/4">Technician</th>
                          <th className="px-4 py-3 font-semibold text-right border-l w-1/4">Total Hours</th>
                          {allClientNames.map(clientName => (
                            <th key={clientName} className="px-4 py-3 font-semibold text-right border-l truncate max-w-[150px]">{clientName}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {techClientMatrix.map((row) => (
                          <tr key={row.name} className="hover:bg-muted/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{row.name}</td>
                            <td className="px-4 py-3 font-bold text-primary text-right border-l">{row.totalHours}h</td>
                            {allClientNames.map(clientName => (
                              <td key={clientName} className="px-4 py-3 text-muted-foreground text-right border-l">
                                {row[clientName] ? `${row[clientName]}h` : '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="billing" className="mt-6">
          <BillingQueue />
        </TabsContent>
      </Tabs>
    </div>
  );
}
