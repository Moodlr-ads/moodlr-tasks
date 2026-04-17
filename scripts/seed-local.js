/**
 * Seed the dev database with fixed Moodlr users, workspace, board, tags, and tasks.
 *
 * Usage:
 *   node scripts/seed-local.js            # Dry run (no writes)
 *   node scripts/seed-local.js --apply    # Apply changes (rebuilds the target board)
 *   node scripts/seed-local.js --apply --reset  # Wipe the whole workspace before seeding
 */
const { PrismaClient, Priority } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const defaultPassword = process.env.MOODLR_DEFAULT_PASSWORD || null;

const USERS = [
  {
    name: "Marcelo",
    email: "marcelo@moodlr.com",
    password: defaultPassword || "marcelorola221",
    image: null,
  },
  {
    name: "Vitor",
    email: "vitor@moodlr.com",
    password: defaultPassword || "vitorlopes223",
    image: null,
  },
  {
    name: "Kayan",
    email: "kayan@moodlr.com",
    password: defaultPassword || "kayanmoodlr226",
    image: null,
  },
  {
    name: "Gilailson",
    email: "gilailson@moodlr.com",
    password: defaultPassword || "gilacarneiro227",
    image: null,
  },
  {
    name: "Andhy",
    email: "andhy@moodlr.com",
    password: defaultPassword || "andhymoodlr229",
    image: null,
  },
];

const TAG_NAMES = ["Aureon", "TNDigital", "Moodlr"];

const STATUS_DEFS = [
  { name: "To Do", color: "#94a3b8", order: 0 },
  { name: "In Progress", color: "#3b82f6", order: 1 },
  { name: "Done", color: "#22c55e", order: 2 },
];

const TASKS = [
  {
    title: "Ativar GoogleAds na Aureon",
    status: "In Progress",
    priority: Priority.medium,
    assigneeEmail: null,
    tags: ["Aureon", "TNDigital", "Moodlr"],
    startDate: "2026-02-04",
    dueDate: "2026-05-20",
  },
  {
    title: "Problema em Editar Conjunto pelo Painel",
    status: "Done",
    priority: Priority.low,
    assigneeEmail: "andhy@moodlr.com",
    tags: [],
    startDate: "2026-02-09",
    dueDate: "2026-02-10",
  },
  {
    title: "Flag de Chatbot para sites que rodam Chatbot",
    status: "In Progress",
    priority: Priority.low,
    assigneeEmail: null,
    tags: [],
    startDate: "2026-02-04",
    dueDate: null,
  },
  {
    title: "Criação do Sistema de Chatbot",
    status: "In Progress",
    priority: Priority.medium,
    assigneeEmail: "andhy@moodlr.com",
    tags: [],
  },
  {
    title: "Criar Sistema de Blocos de Anúncio (PriceRule)",
    status: "To Do",
    priority: Priority.medium,
    assigneeEmail: "andhy@moodlr.com",
    tags: [],
  },
  {
    title: "Sistema de Analise de Melhor Criativo",
    status: "To Do",
    priority: Priority.medium,
    assigneeEmail: "andhy@moodlr.com",
    tags: [],
  },
  {
    title: "Criar Sistema de Clone Writer",
    status: "To Do",
    priority: Priority.medium,
    assigneeEmail: "marcelo@moodlr.com",
    tags: [],
  },
  {
    title: "Esconder Dados Financeiros dos Auxiliares",
    status: "To Do",
    priority: Priority.medium,
    assigneeEmail: "andhy@moodlr.com",
    tags: [],
  },
  {
    title: "Sistema de Desativar Redirects",
    status: "To Do",
    priority: Priority.medium,
    assigneeEmail: "andhy@moodlr.com",
    tags: [],
  },
  {
    title: "Adicionar Gasto de GADs no Fechamento Mensal",
    status: "To Do",
    priority: Priority.medium,
    assigneeEmail: "andhy@moodlr.com",
    tags: [],
  },
  {
    title: "Lançar valores de receita ganha sem campanha",
    status: "To Do",
    priority: Priority.low,
    assigneeEmail: "andhy@moodlr.com",
    tags: [],
  },
  {
    title: "Criar texto do Yoast através do Claude",
    status: "To Do",
    priority: Priority.medium,
    assigneeEmail: "andhy@moodlr.com",
    tags: [],
  },
  {
    title: "Copiar SLUG do Redirect com notificação e opacidade",
    status: "To Do",
    priority: Priority.low,
    assigneeEmail: "andhy@moodlr.com",
    tags: [],
  },
  {
    title: "Mostrar Campanhas de Redirect Erradas (sem receita)",
    status: "To Do",
    priority: Priority.low,
    assigneeEmail: "andhy@moodlr.com",
    tags: [],
  },
  {
    title: "Ajustar Área de Fechamento (Antes e Depois)",
    status: "To Do",
    priority: Priority.low,
    assigneeEmail: "andhy@moodlr.com",
    tags: [],
  },
  {
    title: "Refazer Área de Resumo do Site",
    status: "To Do",
    priority: Priority.low,
    assigneeEmail: "andhy@moodlr.com",
    tags: [],
  },
  {
    title: "Aplicar Cartão da Ticketlad nos projetos dela",
    status: "To Do",
    priority: Priority.medium,
    assigneeEmail: "andhy@moodlr.com",
    tags: [],
  },
  {
    title: "Criação de Plugin de Subtítulo",
    status: "To Do",
    priority: Priority.medium,
    assigneeEmail: "gilailson@moodlr.com",
    tags: [],
  },
  {
    title: "Ativar Bloqueio em Botão de Atualizar Contas quando FB Não conectado",
    status: "To Do",
    priority: Priority.medium,
    assigneeEmail: "andhy@moodlr.com",
    tags: [],
  },
  {
    title: "Adicionar Valores em Reais em Gastos de Contas BRL",
    status: "To Do",
    priority: Priority.medium,
    assigneeEmail: "andhy@moodlr.com",
    tags: [],
  },
  {
    title: "Sistema de Backup Instantaneo Google Cloud",
    status: "To Do",
    priority: Priority.low,
    assigneeEmail: "andhy@moodlr.com",
    tags: [],
  },
  {
    title: "Novo Sistema de Relatório Integrado",
    status: "To Do",
    priority: Priority.low,
    assigneeEmail: "marcelo@moodlr.com",
    tags: [],
  },
  {
    title: "Fechamento Mensal com Uploads",
    status: "To Do",
    priority: Priority.low,
    assigneeEmail: "andhy@moodlr.com",
    tags: [],
  },
  {
    title: "Criação do sistema de Sites Autônomos",
    status: "To Do",
    priority: Priority.low,
    assigneeEmail: "marcelo@moodlr.com",
    tags: [],
  },
];

const WORKSPACE_NAME = "Production";
const BOARD_NAME = "Sprint1";

function toUtcMidday(dateStr) {
  if (!dateStr) return null;
  const parsed = new Date(`${dateStr}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function upsertUsers() {
  const userMap = new Map();
  for (const user of USERS) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash,
        image: user.image || null,
      },
      create: {
        email: user.email,
        name: user.name,
        passwordHash,
        image: user.image || null,
      },
    });
    userMap.set(user.email, record);
  }
  return userMap;
}

async function resetWorkspace(workspaceId) {
  const boards = await prisma.board.findMany({
    where: { workspaceId },
    select: { id: true },
  });
  const boardIds = boards.map((b) => b.id);

  if (boardIds.length > 0) {
    const taskIds = (
      await prisma.task.findMany({
        where: { boardId: { in: boardIds } },
        select: { id: true },
      })
    ).map((t) => t.id);

    if (taskIds.length > 0) {
      await prisma.taskAssignee.deleteMany({ where: { taskId: { in: taskIds } } });
      await prisma.task.deleteMany({ where: { boardId: { in: boardIds } } });
    }

    await prisma.status.deleteMany({ where: { boardId: { in: boardIds } } });
    await prisma.group.deleteMany({ where: { boardId: { in: boardIds } } });
    await prisma.board.deleteMany({ where: { id: { in: boardIds } } });
  }

  await prisma.tag.deleteMany({ where: { workspaceId } });
}

async function resetBoard(boardId) {
  const taskIds = (
    await prisma.task.findMany({
      where: { boardId },
      select: { id: true },
    })
  ).map((t) => t.id);

  if (taskIds.length > 0) {
    await prisma.taskAssignee.deleteMany({ where: { taskId: { in: taskIds } } });
    await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
  }

  await prisma.status.deleteMany({ where: { boardId } });
  await prisma.group.deleteMany({ where: { boardId } });
}

async function seed() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const reset = args.includes("--reset");

  if (!apply) {
    console.log("Dry run. Pass --apply to write data. Use --reset to wipe the workspace first.");
    return;
  }

  const users = await upsertUsers();
  const owner = users.get("vitor@moodlr.com") || Array.from(users.values())[0];

  let workspace = await prisma.workspace.findFirst({ where: { name: WORKSPACE_NAME } });
  if (workspace && reset) {
    await resetWorkspace(workspace.id);
  }

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: WORKSPACE_NAME,
        description: "Workspace restaurado do dev",
        ownerId: owner.id,
        color: "#6366f1",
        icon: "📁",
      },
    });
  }

  let board = await prisma.board.findFirst({
    where: { name: BOARD_NAME, workspaceId: workspace.id },
  });
  if (board) {
    await resetBoard(board.id);
    await prisma.board.delete({ where: { id: board.id } });
  }

  board = await prisma.board.create({
    data: {
      name: BOARD_NAME,
      description: "Board restaurado",
      workspaceId: workspace.id,
      statuses: { create: STATUS_DEFS },
    },
    include: { statuses: true },
  });

  const statusMap = new Map(
    board.statuses.map((status) => [status.name, status]),
  );

  if (reset) {
    await prisma.tag.deleteMany({ where: { workspaceId: workspace.id } });
  }

  const tagRecords = await Promise.all(
    TAG_NAMES.map((name) =>
      prisma.tag.upsert({
        where: { workspaceId_name: { name, workspaceId: workspace.id } },
        update: {},
        create: { name, workspaceId: workspace.id },
      })
    ),
  );
  const tagMap = new Map(tagRecords.map((tag) => [tag.name, tag]));

  for (let i = 0; i < TASKS.length; i++) {
    const task = TASKS[i];
    const assignee = task.assigneeEmail ? users.get(task.assigneeEmail) : null;
    const status = statusMap.get(task.status);
    const tagConnect = (task.tags || [])
      .map((name) => tagMap.get(name))
      .filter(Boolean)
      .map((tag) => ({ id: tag.id }));

    await prisma.task.create({
      data: {
        title: task.title,
        boardId: board.id,
        statusId: status ? status.id : null,
        assigneeId: assignee ? assignee.id : null,
        priority: task.priority || Priority.medium,
        startDate: toUtcMidday(task.startDate),
        dueDate: toUtcMidday(task.dueDate),
        order: i,
        tags: tagConnect.length ? { connect: tagConnect } : undefined,
        assignees:
          assignee && assignee.id
            ? {
                create: [
                  {
                    user: { connect: { id: assignee.id } },
                  },
                ],
              }
            : undefined,
      },
    });
  }

  console.log("Seed applied.");
  console.log(`Users: ${users.size}, Workspace: ${workspace.name}, Board: ${board.name}, Tasks: ${TASKS.length}, Tags: ${TAG_NAMES.length}`);
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
