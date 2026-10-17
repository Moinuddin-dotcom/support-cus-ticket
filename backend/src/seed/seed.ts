/**
 * Seeds demo data: 1 admin, 2 agents, 3 customers and 10 tickets with comments.
 * Users are upserted (safe to re-run). Tickets are only created when the table is empty.
 *
 *   npm run seed            (dev, via ts-node)
 *   node dist/seed/seed.js  (production image)
 */
import { Priority, PrismaClient, Role, TicketStatus } from '@prisma/client';
import { existsSync } from 'node:fs';
import { hashPassword } from '../auth/password';
import { TicketCategory } from '../common/constants/categories';
import { computeIsOverdue, computeSlaDeadline } from '../tickets/sla';

if (!process.env.DATABASE_URL && existsSync('.env')) {
  process.loadEnvFile('.env');
}

const prisma = new PrismaClient();
const HOUR = 60 * 60 * 1000;

const USERS = [
  {
    key: 'admin',
    name: 'Ada Admin',
    email: 'admin@example.com',
    role: Role.ADMIN,
    password: 'Admin123!',
  },
  {
    key: 'agent1',
    name: 'Alice Agent',
    email: 'agent1@example.com',
    role: Role.AGENT,
    password: 'Agent123!',
  },
  {
    key: 'agent2',
    name: 'Bob Agent',
    email: 'agent2@example.com',
    role: Role.AGENT,
    password: 'Agent123!',
  },
  {
    key: 'cust1',
    name: 'Carol Customer',
    email: 'customer1@example.com',
    role: Role.CUSTOMER,
    password: 'Customer123!',
  },
  {
    key: 'cust2',
    name: 'Dan Customer',
    email: 'customer2@example.com',
    role: Role.CUSTOMER,
    password: 'Customer123!',
  },
  {
    key: 'cust3',
    name: 'Erin Customer',
    email: 'customer3@example.com',
    role: Role.CUSTOMER,
    password: 'Customer123!',
  },
] as const;

type UserKey = (typeof USERS)[number]['key'];

interface SeedTicket {
  title: string;
  description: string;
  category: TicketCategory;
  priority: Priority;
  status: TicketStatus;
  createdBy: UserKey;
  assignedTo: UserKey | null;
  hoursAgo: number;
  resolvedAfterHours?: number;
  comments?: { by: UserKey; message: string }[];
}

const TICKETS: SeedTicket[] = [
  {
    title: 'Charged twice for my monthly plan',
    description:
      'My card statement shows two charges of $29 on the 3rd for the Pro plan. Please refund one.',
    category: 'Billing',
    priority: Priority.HIGH,
    status: TicketStatus.IN_PROGRESS,
    createdBy: 'cust1',
    assignedTo: 'agent1',
    hoursAgo: 2,
    comments: [
      {
        by: 'agent1',
        message: 'Thanks Carol, I can see the duplicate charge and have started the refund.',
      },
      { by: 'cust1', message: 'Great, how long does it usually take?' },
    ],
  },
  {
    title: 'App crashes when uploading a PDF',
    description:
      'Every time I upload a PDF larger than 10MB the web app freezes and then shows a blank page.',
    category: 'Technical',
    priority: Priority.HIGH,
    status: TicketStatus.OPEN,
    createdBy: 'cust2',
    assignedTo: 'agent2',
    hoursAgo: 7, // past the 4h SLA -> overdue
  },
  {
    title: 'Cannot reset my password',
    description: 'The password reset email never arrives. I checked spam. My username is dan.c.',
    category: 'Account',
    priority: Priority.MEDIUM,
    status: TicketStatus.OPEN,
    createdBy: 'cust2',
    assignedTo: 'agent1',
    hoursAgo: 30, // past the 24h SLA -> overdue
  },
  {
    title: 'Please add dark mode',
    description: 'Would love a dark theme for the dashboard, it is hard on the eyes at night.',
    category: 'Feature Request',
    priority: Priority.LOW,
    status: TicketStatus.OPEN,
    createdBy: 'cust3',
    assignedTo: null,
    hoursAgo: 1,
  },
  {
    title: 'Invoice is missing VAT number',
    description: 'Our company invoices need our VAT number printed on them. Where can I add it?',
    category: 'Billing',
    priority: Priority.MEDIUM,
    status: TicketStatus.RESOLVED,
    createdBy: 'cust1',
    assignedTo: 'agent2',
    hoursAgo: 50,
    resolvedAfterHours: 6,
    comments: [
      {
        by: 'agent2',
        message:
          'You can add it under Settings → Billing → Tax details. New invoices will include it.',
      },
      { by: 'cust1', message: 'Found it, thank you!' },
    ],
  },
  {
    title: 'API returns 500 on /v1/orders',
    description:
      'Since this morning our integration gets HTTP 500 from the orders endpoint for every request.',
    category: 'Technical',
    priority: Priority.HIGH,
    status: TicketStatus.CLOSED,
    createdBy: 'cust3',
    assignedTo: 'agent1',
    hoursAgo: 72,
    resolvedAfterHours: 3,
    comments: [
      {
        by: 'agent1',
        message: 'A bad deploy caused this; it has been rolled back. Sorry for the trouble.',
      },
    ],
  },
  {
    title: 'How do I export my data?',
    description: 'Is there a way to export all of my projects to CSV before our annual review?',
    category: 'General',
    priority: Priority.LOW,
    status: TicketStatus.IN_PROGRESS,
    createdBy: 'cust3',
    assignedTo: 'agent2',
    hoursAgo: 20,
  },
  {
    title: 'Change the email on my account',
    description:
      'I changed jobs and need my login email updated from my old work address to my new one.',
    category: 'Account',
    priority: Priority.LOW,
    status: TicketStatus.RESOLVED,
    createdBy: 'cust2',
    assignedTo: 'agent1',
    hoursAgo: 40,
    resolvedAfterHours: 12,
  },
  {
    title: 'Dashboard is very slow to load',
    description:
      'The main dashboard takes more than 20 seconds to load for our team since last week.',
    category: 'Technical',
    priority: Priority.MEDIUM,
    status: TicketStatus.IN_PROGRESS,
    createdBy: 'cust1',
    assignedTo: 'agent2',
    hoursAgo: 10,
    comments: [
      { by: 'agent2', message: 'Could you tell me roughly how many projects your workspace has?' },
    ],
  },
  {
    title: 'Request: Slack integration',
    description: 'It would be great to get a Slack notification when a project status changes.',
    category: 'Feature Request',
    priority: Priority.LOW,
    status: TicketStatus.OPEN,
    createdBy: 'cust1',
    assignedTo: 'agent1',
    hoursAgo: 5,
  },
];

async function main(): Promise<void> {
  const ids = {} as Record<UserKey, string>;
  for (const user of USERS) {
    const passwordHash = await hashPassword(user.password);
    const saved = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, passwordHash, isActive: true },
      create: { name: user.name, email: user.email, role: user.role, passwordHash },
    });
    ids[user.key] = saved.id;
  }
  console.log(`Upserted ${USERS.length} users`);

  if ((await prisma.ticket.count()) > 0) {
    console.log('Tickets already exist; skipping ticket seed');
    return;
  }

  const now = Date.now();
  for (const t of TICKETS) {
    const createdAt = new Date(now - t.hoursAgo * HOUR);
    const slaDeadline = computeSlaDeadline(t.priority, createdAt);
    const resolvedAt =
      t.resolvedAfterHours !== undefined
        ? new Date(createdAt.getTime() + t.resolvedAfterHours * HOUR)
        : null;
    await prisma.ticket.create({
      data: {
        title: t.title,
        description: t.description,
        category: t.category,
        priority: t.priority,
        status: t.status,
        createdById: ids[t.createdBy],
        assignedToId: t.assignedTo ? ids[t.assignedTo] : null,
        slaDeadline,
        isOverdue: computeIsOverdue({ status: t.status, slaDeadline }, new Date(now)),
        resolvedAt,
        createdAt,
        comments: {
          create: (t.comments ?? []).map((comment, index) => ({
            userId: ids[comment.by],
            message: comment.message,
            createdAt: new Date(createdAt.getTime() + (index + 1) * 15 * 60 * 1000),
          })),
        },
      },
    });
  }
  console.log(`Created ${TICKETS.length} tickets`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
