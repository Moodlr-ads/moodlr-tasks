/**
 * One-time script to inspect and clean duplicate boards/workspaces.
 * Run with: npx tsx scripts/cleanup-duplicates.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. List all workspaces
  const workspaces = await prisma.workspace.findMany({
    orderBy: { createdAt: "desc" },
    include: { boards: { orderBy: { createdAt: "asc" } } },
  });

  console.log("\n=== WORKSPACES ===");
  for (const ws of workspaces) {
    console.log(`  [${ws.id}] ${ws.icon} ${ws.name} (${ws.boards.length} boards)`);
    for (const b of ws.boards) {
      const taskCount = await prisma.task.count({ where: { boardId: b.id } });
      console.log(`    [${b.id}] ${b.icon} ${b.name} — ${taskCount} tasks`);
    }
  }

  // 2. Find duplicate boards (same name + same workspaceId)
  console.log("\n=== DUPLICATE BOARDS (same name in same workspace) ===");
  for (const ws of workspaces) {
    const nameMap = new Map<string, typeof ws.boards>();
    for (const b of ws.boards) {
      const existing = nameMap.get(b.name) || [];
      existing.push(b);
      nameMap.set(b.name, existing);
    }
    for (const [name, boards] of nameMap) {
      if (boards.length > 1) {
        console.log(`  Workspace "${ws.name}": board "${name}" appears ${boards.length} times`);
        // Keep the oldest one (most likely to have tasks), delete the rest
        const [keep, ...remove] = boards; // boards sorted by createdAt asc
        const keepTasks = await prisma.task.count({ where: { boardId: keep.id } });
        console.log(`    KEEP: [${keep.id}] (${keepTasks} tasks, created ${keep.createdAt.toISOString()})`);
        for (const dup of remove) {
          const dupTasks = await prisma.task.count({ where: { boardId: dup.id } });
          console.log(`    DELETE: [${dup.id}] (${dupTasks} tasks, created ${dup.createdAt.toISOString()})`);
        }
      }
    }
  }

  // 3. Actually delete duplicates (keeping oldest with most tasks)
  const args = process.argv.slice(2);
  if (!args.includes("--delete")) {
    console.log("\nDry run. Pass --delete to actually remove duplicates.");
    return;
  }

  console.log("\n=== DELETING DUPLICATES ===");
  for (const ws of workspaces) {
    const nameMap = new Map<string, typeof ws.boards>();
    for (const b of ws.boards) {
      const existing = nameMap.get(b.name) || [];
      existing.push(b);
      nameMap.set(b.name, existing);
    }
    for (const [name, boards] of nameMap) {
      if (boards.length > 1) {
        // Sort by task count desc, then createdAt asc — keep the one with most tasks
        const withCounts = await Promise.all(
          boards.map(async (b) => ({
            ...b,
            taskCount: await prisma.task.count({ where: { boardId: b.id } }),
          }))
        );
        withCounts.sort((a, b) => b.taskCount - a.taskCount || a.createdAt.getTime() - b.createdAt.getTime());

        const [keep, ...remove] = withCounts;
        console.log(`  Keeping "${name}" [${keep.id}] (${keep.taskCount} tasks)`);

        for (const dup of remove) {
          console.log(`  Deleting "${name}" [${dup.id}] (${dup.taskCount} tasks)...`);
          // Delete in FK order: TaskAssignee -> Task -> Status -> Group -> Board
          const taskIds = (await prisma.task.findMany({ where: { boardId: dup.id }, select: { id: true } })).map(t => t.id);
          if (taskIds.length > 0) {
            await prisma.taskAssignee.deleteMany({ where: { taskId: { in: taskIds } } });
            await prisma.task.deleteMany({ where: { boardId: dup.id } });
          }
          await prisma.status.deleteMany({ where: { boardId: dup.id } });
          await prisma.group.deleteMany({ where: { boardId: dup.id } });
          await prisma.board.delete({ where: { id: dup.id } });
          console.log(`    Done.`);
        }
      }
    }
  }

  // 4. Also remove duplicate workspaces (same name)
  const wsNameMap = new Map<string, typeof workspaces>();
  for (const ws of workspaces) {
    const existing = wsNameMap.get(ws.name) || [];
    existing.push(ws);
    wsNameMap.set(ws.name, existing);
  }
  for (const [name, wsList] of wsNameMap) {
    if (wsList.length > 1) {
      // Keep the one with the most boards/tasks
      const withCounts = await Promise.all(
        wsList.map(async (ws) => ({
          ...ws,
          totalTasks: await prisma.task.count({
            where: { board: { workspaceId: ws.id } },
          }),
        }))
      );
      withCounts.sort((a, b) => b.totalTasks - a.totalTasks || a.createdAt.getTime() - b.createdAt.getTime());

      const [keep, ...remove] = withCounts;
      console.log(`\n  Keeping workspace "${name}" [${keep.id}] (${keep.totalTasks} tasks)`);

      for (const dup of remove) {
        console.log(`  Deleting workspace "${name}" [${dup.id}] (${dup.totalTasks} tasks)...`);
        // Delete all boards in this workspace first
        const dupBoards = await prisma.board.findMany({ where: { workspaceId: dup.id } });
        for (const b of dupBoards) {
          const taskIds = (await prisma.task.findMany({ where: { boardId: b.id }, select: { id: true } })).map(t => t.id);
          if (taskIds.length > 0) {
            await prisma.taskAssignee.deleteMany({ where: { taskId: { in: taskIds } } });
            await prisma.task.deleteMany({ where: { boardId: b.id } });
          }
          await prisma.status.deleteMany({ where: { boardId: b.id } });
          await prisma.group.deleteMany({ where: { boardId: b.id } });
          await prisma.board.delete({ where: { id: b.id } });
        }
        await prisma.tag.deleteMany({ where: { workspaceId: dup.id } });
        await prisma.workspace.delete({ where: { id: dup.id } });
        console.log(`    Done.`);
      }
    }
  }

  console.log("\nCleanup complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
