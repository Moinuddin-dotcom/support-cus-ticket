export type Role = 'CUSTOMER' | 'AGENT' | 'ADMIN';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export const STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
export const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH'];
export const ROLES: Role[] = ['CUSTOMER', 'AGENT', 'ADMIN'];
export const CATEGORIES = ['Billing', 'Technical', 'Account', 'Feature Request', 'General'] as const;
export type Category = (typeof CATEGORIES)[number];

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface User extends SessionUser {
  isActive: boolean;
  createdAt: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  summary: string | null;
  status: TicketStatus;
  priority: Priority;
  category: string;
  slaDeadline: string;
  isOverdue: boolean;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: UserSummary;
  assignedTo: UserSummary | null;
  commentCount: number;
  nextStatus: TicketStatus | null;
}

export interface Comment {
  id: string;
  ticketId: string;
  message: string;
  createdAt: string;
  user: { id: string; name: string; role: Role };
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface AiSuggestion {
  category: Category;
  priority: Priority;
  summary: string;
  source: 'ai' | 'fallback';
}

export interface AgentWorkload {
  agentId: string;
  name: string;
  email: string;
  isActive: boolean;
  total: number;
  active: number;
  resolved: number;
}

export interface Reports {
  totalTickets: number;
  byStatus: Record<TicketStatus, number>;
  byPriority: Record<Priority, number>;
  byCategory: Record<string, number>;
  overdueCount: number;
  unassignedCount: number;
  ticketsPerAgent: AgentWorkload[];
  averageResolutionHours: number | null;
  generatedAt: string;
}

export const ROLE_HOME: Record<Role, string> = {
  CUSTOMER: '/customer/tickets',
  AGENT: '/agent/tickets',
  ADMIN: '/admin',
};
