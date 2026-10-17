'use client';

import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import type { Ticket, User } from '@/lib/types';
import { Select } from './ui';

/** Admin-only dropdown that (re)assigns a ticket to an active agent. */
export function AssignSelect({
  ticket,
  agents,
  onAssigned,
}: {
  ticket: Ticket;
  agents: User[];
  onAssigned: (ticket: Ticket) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeAgents = agents.filter((agent) => agent.isActive);
  const closed = ticket.status === 'CLOSED';

  async function assign(agentId: string) {
    if (!agentId || agentId === ticket.assignedTo?.id) return;
    setSaving(true);
    setError(null);
    try {
      onAssigned(await api.patch<Ticket>(`/tickets/${ticket.id}/assign`, { agentId }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Select
        aria-label={`Assign "${ticket.title}"`}
        value={ticket.assignedTo?.id ?? ''}
        disabled={saving || closed}
        onChange={(e) => void assign(e.target.value)}
        title={closed ? 'Closed tickets cannot be reassigned' : undefined}
      >
        <option value="" disabled>
          {saving ? 'Assigning…' : 'Unassigned'}
        </option>
        {activeAgents.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.name}
          </option>
        ))}
        {/* Keep showing a deactivated current assignee so the select is not blank. */}
        {ticket.assignedTo && !activeAgents.some((a) => a.id === ticket.assignedTo?.id) && (
          <option value={ticket.assignedTo.id} disabled>
            {ticket.assignedTo.name} (inactive)
          </option>
        )}
      </Select>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
