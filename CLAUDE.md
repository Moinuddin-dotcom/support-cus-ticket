# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Support ticket system: customers create tickets, agents work on them, admins manage everything. Monorepo with `backend/` (NestJS + Prisma + BullMQ) and `frontend/` (Next.js App Router). `README.md` has the full spec-level documentation: API table, business rules, deployment steps, seed credentials.

## Commands

Backend (`cd backend`):
- `npm test`: Jest unit tests. They need no DB or Redis.
- Run one file: `npx jest src/tickets/ticket-status.service.spec.ts`. Run by test name: `npx jest -t "<pattern>"`.
- `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run build`
- `npx prisma migrate dev --name <change>` after editing `prisma/schema.prisma`. `npm run seed` loads demo data and is idempotent.
- `npm run start:dev` runs the API on :4000/api, with Swagger at /api/docs. It needs Postgres and Redis: `docker compose up -d postgres redis` from the root.
- `npm run eval` runs the AI classification accuracy report. It needs `AI_PROVIDER` and `AI_API_KEY`; without them it measures the fallback baseline.

Frontend (`cd frontend`): `npm run dev`, `npm run lint`, `npm run typecheck`, `npm run build`.

Whole stack: `docker compose up --build`. The backend container runs `prisma migrate deploy` and then the seed when `RUN_SEED=true`. Host ports can be overridden with `POSTGRES_PORT`, `REDIS_PORT`, `BACKEND_PORT` and `FRONTEND_PORT`.

## Architecture notes

- **Global guards** (registered in `app.module.ts`, and the order matters): `JwtAuthGuard` (opt out with `@Public()`), then `RolesGuard` (`@Roles(...)`), then `UserThrottlerGuard`, which rate limits per user or per IP and relies on `req.user` being set. `AllExceptionsFilter` gives every error the same JSON shape and maps Prisma P2002 to 409 and P2025 to 404.
- **Ticket visibility** is defined once, in `tickets/ticket-access.policy.ts`. `canAccessTicket` handles single lookups and `ticketScopeFor` builds the Prisma filter for lists. A ticket the caller can't see returns 404, not 403. `CommentsService` reuses `TicketsService.getAccessibleTicket`.
- **Status flow** lives in `tickets/ticket-status.service.ts` as pure functions (OPEN→IN_PROGRESS→RESOLVED→CLOSED, single steps only). Domain errors are mapped to 400 in `TicketsService`. Keep this file free of Nest and DB imports; the spec covers the full transition matrix.
- **SLA:** `tickets/sla.ts` holds the pure deadline and overdue logic. API responses compute `isOverdue` from it (in `ticket.mapper.ts`). The stored flag is set by the BullMQ `sla-check` job scheduler.
- **Queue** (`queue/`): one BullMQ queue, `tickets`, with jobs `auto-assign` and `sla-check`, both handled by `TicketsProcessor` in the API process. `TicketJobsProducer` assigns inline if Redis doesn't respond in time. The pure picker is in `auto-assign.ts`.
- **AI** (`ai/`): `AiService` is built through a factory, not DI, so `eval/run-eval.ts` can build it directly. `suggest()` never throws and returns `source: 'fallback'` on any failure. Allowed categories are in `common/constants/categories.ts`, which is shared with ticket validation.
- **Env** is validated with zod in `config/env.validation.ts`. Add new variables there and to `.env.example`.
- **Seed** lives in `src/seed/seed.ts`, not `prisma/`, so it compiles to `dist/seed/seed.js` for the Docker image.
- **Frontend auth is a BFF.** The browser never calls the API directly. `app/api/auth/*` stores the JWT in the httpOnly `st_token` cookie, and `app/api/proxy/[...path]` forwards requests with a Bearer header. Client code calls `api.get/post/patch` from `lib/api.ts` with API paths (e.g. `/tickets`). The API base URL is server-only: `API_URL` first, then `NEXT_PUBLIC_API_URL`.
- **Frontend route protection** happens in two places: `middleware.ts` makes a decode-only role redirect, and each role's `layout.tsx` calls `requireRole()`, which verifies through `/auth/me`. Client components read the user with `useSession()`.
- Keep scope tight: the README lists the spec and the documented assumptions (extra fields `isActive`, `resolvedAt`, `summary`).
