export const TICKET_CATEGORIES = [
  'Billing',
  'Technical',
  'Account',
  'Feature Request',
  'General',
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const DEFAULT_CATEGORY: TicketCategory = 'General';
