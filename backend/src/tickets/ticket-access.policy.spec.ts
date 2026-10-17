import { Role } from '@prisma/client';
import { canAccessTicket, canChangeStatus, ticketScopeFor } from './ticket-access.policy';

const customer = { id: 'cust-1', role: Role.CUSTOMER };
const otherCustomer = { id: 'cust-2', role: Role.CUSTOMER };
const agent = { id: 'agent-1', role: Role.AGENT };
const otherAgent = { id: 'agent-2', role: Role.AGENT };
const admin = { id: 'admin-1', role: Role.ADMIN };

const ticket = { createdById: 'cust-1', assignedToId: 'agent-1' };
const unassigned = { createdById: 'cust-1', assignedToId: null };

describe('ticket access policy', () => {
  describe('canAccessTicket', () => {
    it('lets a customer see only their own tickets', () => {
      expect(canAccessTicket(customer, ticket)).toBe(true);
      expect(canAccessTicket(otherCustomer, ticket)).toBe(false);
    });

    it('lets an agent see only tickets assigned to them', () => {
      expect(canAccessTicket(agent, ticket)).toBe(true);
      expect(canAccessTicket(otherAgent, ticket)).toBe(false);
      expect(canAccessTicket(agent, unassigned)).toBe(false);
    });

    it('lets an admin see every ticket', () => {
      expect(canAccessTicket(admin, ticket)).toBe(true);
      expect(canAccessTicket(admin, unassigned)).toBe(true);
    });
  });

  describe('ticketScopeFor', () => {
    it('builds the matching list filter for each role', () => {
      expect(ticketScopeFor(customer)).toEqual({ createdById: 'cust-1' });
      expect(ticketScopeFor(agent)).toEqual({ assignedToId: 'agent-1' });
      expect(ticketScopeFor(admin)).toEqual({});
    });
  });

  describe('canChangeStatus', () => {
    it('allows the assigned agent and admins only', () => {
      expect(canChangeStatus(agent, ticket)).toBe(true);
      expect(canChangeStatus(admin, ticket)).toBe(true);
      expect(canChangeStatus(otherAgent, ticket)).toBe(false);
      expect(canChangeStatus(customer, ticket)).toBe(false);
    });
  });
});
