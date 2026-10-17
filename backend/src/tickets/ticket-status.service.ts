import { TicketStatus } from '@prisma/client';

/**
 * Ticket lifecycle: OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED.
 * Each status may only move to the single next step. No skipping, no going back,
 * and CLOSED is terminal.
 *
 * This module is deliberately framework-free (pure functions, no I/O) so the
 * whole transition matrix can be unit tested in isolation.
 */
export const STATUS_FLOW: readonly TicketStatus[] = [
  TicketStatus.OPEN,
  TicketStatus.IN_PROGRESS,
  TicketStatus.RESOLVED,
  TicketStatus.CLOSED,
];

export const ACTIVE_STATUSES: readonly TicketStatus[] = [
  TicketStatus.OPEN,
  TicketStatus.IN_PROGRESS,
];

export type TransitionErrorCode = 'SAME_STATUS' | 'TERMINAL_STATUS' | 'BACKWARD' | 'SKIP';

export type TransitionResult =
  { valid: true } | { valid: false; code: TransitionErrorCode; message: string };

export class InvalidStatusTransitionError extends Error {
  constructor(
    readonly from: TicketStatus,
    readonly to: TicketStatus,
    readonly code: TransitionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'InvalidStatusTransitionError';
  }
}

/** The only status a ticket may move to next, or null when it is CLOSED. */
export function getNextStatus(current: TicketStatus): TicketStatus | null {
  const index = STATUS_FLOW.indexOf(current);
  return index >= 0 && index < STATUS_FLOW.length - 1 ? STATUS_FLOW[index + 1] : null;
}

export function validateTransition(from: TicketStatus, to: TicketStatus): TransitionResult {
  const fromIndex = STATUS_FLOW.indexOf(from);
  const toIndex = STATUS_FLOW.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) {
    throw new Error(`Unknown ticket status: ${fromIndex === -1 ? from : to}`);
  }

  if (from === TicketStatus.CLOSED) {
    return {
      valid: false,
      code: 'TERMINAL_STATUS',
      message: 'Ticket is CLOSED; a closed ticket cannot change status.',
    };
  }
  if (from === to) {
    return { valid: false, code: 'SAME_STATUS', message: `Ticket is already ${from}.` };
  }
  if (toIndex < fromIndex) {
    return {
      valid: false,
      code: 'BACKWARD',
      message: `Cannot move a ticket backwards from ${from} to ${to}.`,
    };
  }
  if (toIndex > fromIndex + 1) {
    return {
      valid: false,
      code: 'SKIP',
      message: `Cannot skip steps: ${from} can only move to ${STATUS_FLOW[fromIndex + 1]}, not ${to}.`,
    };
  }
  return { valid: true };
}

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return validateTransition(from, to).valid;
}

/** Throws InvalidStatusTransitionError when the move is not allowed. */
export function assertValidTransition(from: TicketStatus, to: TicketStatus): void {
  const result = validateTransition(from, to);
  if (!result.valid) {
    throw new InvalidStatusTransitionError(from, to, result.code, result.message);
  }
}

export function isActiveStatus(status: TicketStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}
