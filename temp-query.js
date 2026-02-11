const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const tasks = await p.task.findMany({ where: { boardId: 'restore-prod-board' }, select: { id: true, title: true, boardId: true }, take: 5 });
  console.log(tasks);
  await p.$disconnect();
})();
