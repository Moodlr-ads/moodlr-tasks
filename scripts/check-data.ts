import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const workspaces = await p.workspace.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      boards: {
        orderBy: { createdAt: "asc" },
        include: {
          tasks: { select: { id: true, title: true, statusId: true } },
          statuses: { select: { id: true, name: true } },
        },
      },
    },
  });

  for (const ws of workspaces) {
    console.log(`\n${ws.icon} ${ws.name} (${ws.id})`);
    for (const b of ws.boards) {
      console.log(`  ${b.icon} ${b.name} — ${b.tasks.length} tasks, ${b.statuses.length} statuses`);
      for (const t of b.tasks) {
        const status = b.statuses.find(s => s.id === t.statusId);
        console.log(`    - ${t.title} [${status?.name || 'no status'}]`);
      }
    }
  }
}

main().catch(console.error).finally(() => p.$disconnect());
