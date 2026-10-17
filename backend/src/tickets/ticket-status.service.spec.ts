import { TicketStatus } from '@prisma/client';
import {
  assertValidTransition,
  canTransition,
  getNextStatus,
  InvalidStatusTransitionError,
  STATUS_FLOW,
  TransitionErrorCode,
  validateTransition,
} from './ticket-status.service';

const { OPEN, IN_PROGRESS, RESOLVED, CLOSED } = TicketStatus;
const ALL = Object.values(TicketStatus);

/** Expected outcome for every (from, to) pair: 'OK' or the error code. 4 x 4 = 16 cases. */
const MATRIX: Record<TicketStatus, Record<TicketStatus, 'OK' | TransitionErrorCode>> = {
  OPEN: { OPEN: 'SAME_STATUS', IN_PROGRESS: 'OK', RESOLVED: 'SKIP', CLOSED: 'SKIP' },
  IN_PROGRESS: { OPEN: 'BACKWARD', IN_PROGRESS: 'SAME_STATUS', RESOLVED: 'OK', CLOSED: 'SKIP' },
  RESOLVED: { OPEN: 'BACKWARD', IN_PROGRESS: 'BACKWARD', RESOLVED: 'SAME_STATUS', CLOSED: 'OK' },
  CLOSED: {
    OPEN: 'TERMINAL_STATUS',
    IN_PROGRESS: 'TERMINAL_STATUS',
    RESOLVED: 'TERMINAL_STATUS',
    CLOSED: 'TERMINAL_STATUS',
  },
};

const cases = ALL.flatMap((from) => ALL.map((to) => [from, to, MATRIX[from][to]] as const));

describe('ticket status transitions', () => {
  it('covers every status pair in the matrix', () => {
    expect(cases).toHaveLength(ALL.length * ALL.length);
    expect(STATUS_FLOW).toEqual([OPEN, IN_PROGRESS, RESOLVED, CLOSED]);
  });

  describe('valid transitions', () => {
    it.each([
      [OPEN, IN_PROGRESS],
      [IN_PROGRESS, RESOLVED],
      [RESOLVED, CLOSED],
    ])('%s -> %s is allowed', (from, to) => {
      expect(validateTransition(from, to)).toEqual({ valid: true });
      expect(canTransition(from, to)).toBe(true);
      expect(() => assertValidTransition(from, to)).not.toThrow();
    });

    it('allows exactly three transitions in total', () => {
      expect(cases.filter(([, , expected]) => expected === 'OK')).toHaveLength(3);
    });
  });

  describe('full matrix', () => {
    it.each(cases)('%s -> %s => %s', (from, to, expected) => {
      const result = validateTransition(from, to);
      if (expected === 'OK') {
        expect(result.valid).toBe(true);
      } else {
        expect(result).toMatchObject({ valid: false, code: expected });
        expect(canTransition(from, to)).toBe(false);
      }
    });
  });

  describe('invalid transitions throw InvalidStatusTransitionError', () => {
    const invalid = cases.filter(([, , expected]) => expected !== 'OK');

    it.each(invalid)('%s -> %s throws %s', (from, to, expected) => {
      let caught: unknown;
      try {
        assertValidTransition(from, to);
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(InvalidStatusTransitionError);
      const error = caught as InvalidStatusTransitionError;
      expect(error.code).toBe(expected);
      expect(error.from).toBe(from);
      expect(error.to).toBe(to);
      expect(error.message.length).toBeGreaterThan(0);
    });
  });

  describe('error messages', () => {
    it('explains skipped steps and names the allowed next status', () => {
      expect(() => assertValidTransition(OPEN, RESOLVED)).toThrow(
        'Cannot skip steps: OPEN can only move to IN_PROGRESS, not RESOLVED.',
      );
      expect(() => assertValidTransition(OPEN, CLOSED)).toThrow(/Cannot skip steps/);
      expect(() => assertValidTransition(IN_PROGRESS, CLOSED)).toThrow(
        'Cannot skip steps: IN_PROGRESS can only move to RESOLVED, not CLOSED.',
      );
    });

    it('explains backward moves', () => {
      expect(() => assertValidTransition(RESOLVED, OPEN)).toThrow(
        'Cannot move a ticket backwards from RESOLVED to OPEN.',
      );
      expect(() => assertValidTransition(IN_PROGRESS, OPEN)).toThrow(/backwards/);
      expect(() => assertValidTransition(RESOLVED, IN_PROGRESS)).toThrow(/backwards/);
    });

    it('explains same-status moves', () => {
      expect(() => assertValidTransition(OPEN, OPEN)).toThrow('Ticket is already OPEN.');
      expect(() => assertValidTransition(RESOLVED, RESOLVED)).toThrow(
        'Ticket is already RESOLVED.',
      );
    });

    it('treats CLOSED as terminal, including CLOSED -> CLOSED', () => {
      for (const to of ALL) {
        expect(() => assertValidTransition(CLOSED, to)).toThrow(
          /closed ticket cannot change status/,
        );
      }
    });
  });

  describe('getNextStatus', () => {
    it.each([
      [OPEN, IN_PROGRESS],
      [IN_PROGRESS, RESOLVED],
      [RESOLVED, CLOSED],
      [CLOSED, null],
    ])('next of %s is %s', (current, next) => {
      expect(getNextStatus(current)).toBe(next);
    });

    it('agrees with validateTransition for every status', () => {
      for (const from of ALL) {
        const allowed = ALL.filter((to) => canTransition(from, to));
        const next = getNextStatus(from);
        expect(allowed).toEqual(next ? [next] : []);
      }
    });
  });

  it('rejects unknown statuses loudly', () => {
    expect(() => validateTransition('PENDING' as TicketStatus, OPEN)).toThrow(
      /Unknown ticket status/,
    );
    expect(() => validateTransition(OPEN, 'DONE' as TicketStatus)).toThrow(/Unknown ticket status/);
  });
});
