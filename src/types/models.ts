export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus = 'open' | 'in_progress' | 'resolved';

export interface Ticket {
  id?: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  clientId: string;
  assetId?: string;
  assignedTechId?: string;
  contactName?: string;
  approvedBy?: string;
  timeLoggedMinutes?: number;
  notesCount?: number;
  unreadNotes?: Record<string, number>;
  createdAt: any; 
  updatedAt: any; 
}

export interface TicketNote {
  id?: string;
  ticketId: string;
  text: string;
  createdBy: string; // Tech name
  createdAt: any;
}

export type AssetType = 'workstation' | 'server' | 'network' | 'printer' | 'other';
export type AssetStatus = 'active' | 'maintenance' | 'retired';

export interface Asset {
  id?: string;
  name: string;
  type: AssetType;
  clientId: string;
  specs: string;
  status: AssetStatus;
  createdAt: any;
}

export type ClientStatus = 'active' | 'inactive';

export interface Client {
  id?: string;
  name: string;
  contactName?: string;
  contactRole?: string;
  contactEmail: string;
  contactPhone: string;
  status: ClientStatus;
  priorityCustomerId?: string; // Mapped ID from Priority ERP (e.g. C00001)
  authorizedApprovers?: string[]; // List of names authorized to approve billing/support
}

export type UserRole = 'admin' | 'tech' | 'pending';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  role: UserRole;
  createdAt: any;
  priorityEmployeeId?: string; // Mapped ID from Priority ERP (Tech/Employee ID)
}

export interface TimeEntry {
  id?: string;
  ticketId: string;
  techId: string;
  durationMinutes: number;
  date: any;
  description: string;
  billing_locked: boolean;
  priority_synced?: boolean; // True if successfully synced to priority
  priority_error?: string; // Error log if priority sync failed
}
