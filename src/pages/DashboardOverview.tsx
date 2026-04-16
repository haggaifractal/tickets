import React from 'react';
import { Clock, AlertCircle, Laptop, ArrowUpRight, ArrowDownRight, CheckCircle2, Activity } from 'lucide-react';

// --- MOCK DATA BASED ON FIRESTORE SCHEMA ---
const mockTickets = [
  { id: 'TK-8012', title: 'Firewall VPN Tunnel Down', clientName: 'Fintech Solutions Ltd', status: 'Active', priority: 'High', time: '10m ago' },
  { id: 'TK-8013', title: 'New Employee Laptop Setup', clientName: 'CyberGuard IL', status: 'Open', priority: 'Medium', time: '1h ago' },
  { id: 'TK-8014', title: 'Exchange Server CPU Alert', clientName: 'HealthPlus Medical', status: 'Active', priority: 'High', time: '2h ago' },
  { id: 'TK-8015', title: 'Office 365 License Renewal', clientName: 'Fintech Solutions Ltd', status: 'Resolved', priority: 'Low', time: '1d ago' },
];

const metrics = [
  { title: 'Open Tickets', value: '14', change: '+2', trend: 'up', icon: <AlertCircle className="text-error" size={24} /> },
  { title: 'Unbilled Time (This Week)', value: '18.5h', change: '-2.5h', trend: 'down', icon: <Clock className="text-primary" size={24} /> },
  { title: 'Active Assets Monitored', value: '243', change: '+12', trend: 'up', icon: <Laptop className="text-outline" size={24} /> },
  { title: 'System Uptime', value: '99.98%', change: '0%', trend: 'neutral', icon: <Activity className="text-secondary" size={24} /> },
];

export const DashboardOverview: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-headline font-bold text-on-surface tracking-tight">
            NOC Overview
          </h1>
          <p className="text-sm text-secondary mt-1">
            Real-time infrastructure and ticketing snapshot.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-primary-container text-primary font-medium rounded hover:bg-primary-container/80 transition-colors text-sm border border-primary/20 shadow-sm">
            + New Ticket
          </button>
          <button className="px-4 py-2 bg-surface-container-high text-on-surface font-medium rounded hover:bg-surface-container-high/80 transition-colors text-sm border border-outline-variant shadow-sm">
            Quick Log Time
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => (
          <MetricCard key={idx} {...metric} />
        ))}
      </div>

      {/* Main Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Tickets Panel */}
        <div className="lg:col-span-2 rounded-xl border border-outline-variant bg-[#06122d]/40 backdrop-blur-sm p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-headline font-semibold text-on-surface flex items-center gap-2">
              <AlertCircle size={18} className="text-primary" />
              Action Required Tickets
            </h2>
            <button className="text-sm text-primary hover:underline font-medium">View All</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="text-xs text-secondary-container bg-surface-container-high/50">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-l">ID</th>
                  <th className="px-4 py-3 font-medium">Issue</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium rounded-r">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {mockTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-surface-container/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-primary">{ticket.id}</td>
                    <td className="px-4 py-3 text-on-surface font-medium">{ticket.title}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{ticket.clientName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border
                        ${ticket.priority === 'High' ? 'bg-error-container/30 text-error border-error/30' : 
                          ticket.priority === 'Medium' ? 'bg-outline-variant text-primary border-outline' : 
                          'bg-surface-container-high text-secondary border-outline-variant'}
                      `}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${
                          ticket.status === 'Active' ? 'bg-error animate-pulse shadow-[0_0_8px_rgba(238,125,119,0.8)]' : 
                          ticket.status === 'Open' ? 'bg-primary' : 'bg-outline'
                        }`} />
                        <span className="text-on-surface-variant font-medium">{ticket.status}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Time Entries Panel */}
        <div className="rounded-xl border border-outline-variant bg-[#06122d]/40 backdrop-blur-sm p-5 shadow-lg flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-headline font-semibold text-on-surface flex items-center gap-2">
              <Clock size={18} className="text-primary" />
              Recent Time Entries
            </h2>
          </div>
          
          <div className="flex-1 space-y-4">
            <TimeEntryItem client="CyberGuard IL" duration="45m" desc="Configured site-to-site VPN." billed />
            <TimeEntryItem client="HealthPlus Medical" duration="1h 15m" desc="Exchange storage expansion." />
            <TimeEntryItem client="Fintech Solutions Ltd" duration="30m" desc="O365 account provisioning." billed />
          </div>

          <button className="mt-4 w-full py-2 bg-surface-container rounded text-sm text-primary font-medium hover:bg-surface-container-high transition-colors border border-outline-variant">
            Generate Timesheet
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MODULAR UTILITY COMPONENTS ---

const MetricCard = ({ title, value, change, trend, icon }: any) => (
  <div className="p-5 rounded-xl border border-outline-variant bg-surface-container-low shadow-md flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-secondary mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-on-surface">{value}</h3>
      <div className="flex items-center gap-1 mt-2">
        {trend === 'up' ? <ArrowUpRight size={14} className="text-error" /> : 
         trend === 'down' ? <ArrowDownRight size={14} className="text-primary" /> : null}
        <span className={`text-xs font-medium ${trend === 'up' ? 'text-error' : trend === 'down' ? 'text-primary' : 'text-secondary'}`}>
          {change}
        </span>
      </div>
    </div>
    <div className="p-2 bg-surface-container rounded-lg border border-outline-variant/50 shadow-inner">
      {icon}
    </div>
  </div>
);

const TimeEntryItem = ({ client, duration, desc, billed = false }: { client: string, duration: string, desc: string, billed?: boolean }) => (
  <div className="border-b border-outline-variant/30 pb-3 last:border-0 last:pb-0">
    <div className="flex justify-between items-start mb-1">
      <span className="text-sm font-medium text-on-surface">{client}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-bold text-primary px-1.5 py-0.5 bg-primary-container/20 rounded border border-primary/10">{duration}</span>
        {billed && <CheckCircle2 size={14} className="text-outline" title="Billed" />}
      </div>
    </div>
    <p className="text-xs text-secondary leading-relaxed">{desc}</p>
  </div>
);
