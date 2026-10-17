export interface AgentLoad {
  id: string;
  /** Number of OPEN + IN_PROGRESS tickets currently assigned to the agent. */
  activeTickets: number;
  createdAt: Date;
}

/**
 * Picks the agent with the fewest active tickets.
 * Ties go to the longest-standing agent (earliest createdAt), then by id, so the
 * choice is deterministic. Returns null when there are no agents.
 */
export function pickLeastLoadedAgent(agents: readonly AgentLoad[]): AgentLoad | null {
  let best: AgentLoad | null = null;
  for (const agent of agents) {
    if (
      best === null ||
      agent.activeTickets < best.activeTickets ||
      (agent.activeTickets === best.activeTickets &&
        (agent.createdAt.getTime() < best.createdAt.getTime() ||
          (agent.createdAt.getTime() === best.createdAt.getTime() && agent.id < best.id)))
    ) {
      best = agent;
    }
  }
  return best;
}
