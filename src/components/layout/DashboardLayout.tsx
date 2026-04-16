import React, { useState } from 'react';
import { 
  Menu, X, LayoutDashboard, Ticket, Server, 
  Users, UserCircle, LogOut, Bell
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface font-body overflow-hidden">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 h-16 w-full px-4 flex items-center justify-between border-b border-outline-variant glass-effect">
        <div className="flex items-center gap-4">
          <button 
            className="md:hidden p-2 text-on-surface-variant hover:text-primary transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Toggle Sidebar"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center text-primary font-headline font-bold">
              IL
            </div>
            <span className="font-headline font-semibold text-lg hidden sm:block tracking-wide">
              MSP NOC Center
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 relative text-on-surface-variant hover:text-primary transition-colors" aria-label="Notifications">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-error"></span>
          </button>
          <div className="h-8 w-px bg-outline-variant mx-1"></div>
          <button className="flex items-center gap-2 text-on-surface hover:text-primary transition-colors" aria-label="User Menu">
            <UserCircle size={24} />
            <span className="text-sm font-medium hidden sm:block">Admin User</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-64 border-r border-outline-variant bg-surface-container 
          transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
          flex flex-col
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex items-center justify-between p-4 md:hidden border-b border-outline-variant">
            <span className="font-headline font-semibold">Menu</span>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="text-on-surface-variant hover:text-primary transition-colors"
              aria-label="Close Sidebar"
            >
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <NavItem icon={<LayoutDashboard size={20} />} label="Overview" active />
            <NavItem icon={<Ticket size={20} />} label="Tickets" />
            <NavItem icon={<Server size={20} />} label="Assets" />
            <NavItem icon={<Users size={20} />} label="Clients" />
          </nav>

          <div className="p-4 border-t border-outline-variant">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-error hover:bg-error-container hover:text-error transition-colors">
              <LogOut size={20} />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Canvas */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-background">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

// Modular Component for Navigation Items
const NavItem = ({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) => (
  <button className={`
    w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200
    ${active 
      ? 'bg-primary-container/30 text-primary border border-primary/20' 
      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}
  `}>
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);
