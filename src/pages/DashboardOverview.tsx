import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Clock, Server, CheckCircle2, Loader2, BarChart2 } from "lucide-react";
import { useTickets } from "@/hooks/useTickets";
import { useAssets } from "@/hooks/useAssets";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export function DashboardOverview() {
  const { data: tickets, isLoading: isLoadingTickets } = useTickets();
  const { data: assets, isLoading: isLoadingAssets } = useAssets();

  if (isLoadingTickets || isLoadingAssets) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeTickets = tickets?.filter(t => t.status !== 'resolved') || [];
  const resolvedTickets = tickets?.filter(t => t.status === 'resolved') || [];
  const recentActiveTickets = activeTickets.slice(0, 5);

  const statusCounts = tickets?.reduce((acc, ticket) => {
    acc[ticket.status] = (acc[ticket.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = [
    { name: 'Open', value: statusCounts?.open || 0, color: 'hsl(var(--error))' },
    { name: 'In Progress', value: statusCounts?.in_progress || 0, color: 'hsl(var(--primary))' },
    { name: 'Resolved', value: statusCounts?.resolved || 0, color: 'hsl(var(--secondary))' },
  ].filter(item => item.value > 0);

  const priorityCounts = tickets?.reduce((acc, ticket) => {
    acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const priorityData = [
    { name: 'Low', count: priorityCounts?.low || 0, color: 'hsl(var(--secondary))' },
    { name: 'Medium', count: priorityCounts?.medium || 0, color: 'hsl(var(--primary))' },
    { name: 'High', count: priorityCounts?.high || 0, color: '#f97316' },
    { name: 'Critical', count: priorityCounts?.critical || 0, color: 'hsl(var(--error))' },
  ];

  const totalMinutes = tickets?.reduce((acc, ticket) => {
    return acc + (Number(ticket.timeLoggedMinutes) || 0);
  }, 0) || 0;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const timeLoggedDisplay = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const METRICS = [
    { title: "Active Tickets", value: activeTickets.length.toString(), icon: AlertCircle, color: "text-error" },
    { title: "Total Resolved", value: resolvedTickets.length.toString(), icon: CheckCircle2, color: "text-primary" },
    { title: "Monitored Assets", value: (assets?.length || 0).toString(), icon: Server, color: "text-secondary" },
    { title: "Tech Time Logged", value: timeLoggedDisplay, icon: Clock, color: "text-on-surface-variant" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>
        <p className="text-muted-foreground font-body">
          Current operational status across all monitored clients and assets.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((metric) => (
          <Card key={metric.title} className="bg-card border-border hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground line-clamp-1">
                {metric.title}
              </CardTitle>
              <metric.icon className={`h-4 w-4 shrink-0 ${metric.color}`} />
            </CardHeader>
            <CardContent className="pb-4 md:pb-6">
              <div className="text-xl md:text-3xl font-bold text-foreground font-headline truncate">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 w-full md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full lg:col-span-4 bg-card border-border w-full flex flex-col overflow-hidden">
          <CardHeader className="px-4 md:px-6">
            <CardTitle>Recent Tickets</CardTitle>
            <CardDescription className="text-muted-foreground">
              {activeTickets.length} pending action
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 sm:px-6 w-full max-w-[100vw] overflow-x-auto">
            <Table className="w-full">
              <TableHeader className="bg-muted/50 rounded-t-lg">
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground pl-4 sm:pl-2">ID</TableHead>
                  <TableHead className="text-muted-foreground">Client</TableHead>
                  <TableHead className="text-muted-foreground hidden sm:table-cell">Issue</TableHead>
                  <TableHead className="text-muted-foreground hidden md:table-cell w-[100px]">Priority</TableHead>
                  <TableHead className="text-muted-foreground text-right pr-4 sm:pr-2">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActiveTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="border-border hover:bg-muted/30">
                    <TableCell className="font-medium font-mono text-primary text-xs pl-4 sm:pl-2">
                      {ticket.id?.substring(0, 5).toUpperCase()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs sm:text-sm">
                      {ticket.clientId.substring(0,8)}...
                    </TableCell>
                    <TableCell className="max-w-[100px] md:max-w-[200px] truncate hidden sm:table-cell text-sm">
                      {ticket.title}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className={`
                        ${ticket.priority === 'critical' ? 'border-error text-error bg-error/10' : ''}
                        ${ticket.priority === 'high' ? 'border-orange-500 text-orange-500 bg-orange-500/10' : ''}
                        ${ticket.priority === 'medium' ? 'border-primary text-primary bg-primary/10' : ''}
                        ${ticket.priority === 'low' ? 'border-secondary text-secondary bg-secondary/10' : ''}
                      `}>
                        {ticket.priority.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-4 sm:pr-2">
                      <Badge variant="secondary" className={`text-[10px] px-1 md:text-xs md:px-2.5
                        ${ticket.status === 'open' ? 'bg-error text-background' : ''}
                        ${ticket.status === 'in_progress' ? 'bg-primary text-background' : ''}
                        ${ticket.status === 'resolved' ? 'bg-secondary text-background border-outline' : ''}
                      `}>
                        {ticket.status.replace('_', ' ').substring(0, 6).toUpperCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {recentActiveTickets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      No active tickets!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="hidden lg:flex col-span-3 bg-card border-border flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5" />
              Ticket Analytics
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Distribution by status and priority.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-8">
            {tickets && tickets.length > 0 ? (
              <>
                <div className="h-[200px] w-full">
                  <h3 className="text-sm font-medium mb-2 text-center text-muted-foreground">Status Distribution</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-[200px] w-full">
                  <h3 className="text-sm font-medium mb-2 text-center text-muted-foreground">Priority Breakdown</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip 
                        cursor={{ fill: 'hsl(var(--muted))' }}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {priorityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-lg m-4 space-y-4 py-8">
                <BarChart2 className="w-8 h-8 opacity-50 block mx-auto" />
                <p>No ticket data to analyze yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
