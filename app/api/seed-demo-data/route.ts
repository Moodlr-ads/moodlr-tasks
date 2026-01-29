import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user already has workspaces
    const existing = await prisma.workspace.findFirst({
      where: { ownerId: session.user.id },
    });

    if (existing) {
      return NextResponse.json({ message: "Demo data already exists" });
    }

    // Create workspaces with boards, groups, statuses, and tasks
    const workspace1 = await prisma.workspace.create({
      data: {
        name: "Product Development",
        description: "Main product workspace",
        ownerId: session.user.id,
        color: "#6366f1",
        icon: "🚀",
        boards: {
          create: [
            {
              name: "Q1 Sprint Planning",
              description: "Sprint planning for Q1 2025",
              color: "#6366f1",
              icon: "📋",
              statuses: {
                create: [
                  { name: "To Do", color: "#94a3b8", order: 0 },
                  { name: "In Progress", color: "#3b82f6", order: 1 },
                  { name: "Review", color: "#a855f7", order: 2 },
                  { name: "Done", color: "#10b981", order: 3 },
                ],
              },
              groups: {
                create: [
                  { name: "Frontend", order: 0 },
                  { name: "Backend", order: 1 },
                  { name: "Design", order: 2 },
                ],
              },
            },
            {
              name: "Bug Tracking",
              description: "Track and resolve bugs",
              color: "#ef4444",
              icon: "🐛",
              statuses: {
                create: [
                  { name: "New", color: "#94a3b8", order: 0 },
                  { name: "In Progress", color: "#3b82f6", order: 1 },
                  { name: "Testing", color: "#f59e0b", order: 2 },
                  { name: "Resolved", color: "#10b981", order: 3 },
                ],
              },
            },
          ],
        },
      },
    });

    await prisma.workspace.create({
      data: {
        name: "Marketing",
        description: "Marketing campaigns and content",
        ownerId: session.user.id,
        color: "#ec4899",
        icon: "📢",
        boards: {
          create: [
            {
              name: "Content Calendar",
              description: "Social media and blog content",
              color: "#ec4899",
              icon: "📅",
              statuses: {
                create: [
                  { name: "Idea", color: "#94a3b8", order: 0 },
                  { name: "Draft", color: "#f59e0b", order: 1 },
                  { name: "Scheduled", color: "#3b82f6", order: 2 },
                  { name: "Published", color: "#10b981", order: 3 },
                ],
              },
            },
          ],
        },
      },
    });

    // Get created boards to add tasks
    const boards = await prisma.board.findMany({
      where: {
        workspace: { ownerId: session.user.id },
      },
      include: {
        groups: true,
        statuses: true,
      },
    });

    const sprintBoard = boards.find((b) => b.name === "Q1 Sprint Planning");
    if (sprintBoard && sprintBoard.groups.length > 0) {
      const now = new Date();
      const frontendGroup = sprintBoard.groups.find((g) => g.name === "Frontend");
      const backendGroup = sprintBoard.groups.find((g) => g.name === "Backend");
      const designGroup = sprintBoard.groups.find((g) => g.name === "Design");

      await prisma.task.createMany({
        data: [
          {
            boardId: sprintBoard.id,
            groupId: frontendGroup?.id,
            title: "Implement user authentication",
            description: "Add JWT-based authentication with login/logout",
            statusId: sprintBoard.statuses[1]?.id,
            priority: "high",
            startDate: now,
            dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
            order: 0,
          },
          {
            boardId: sprintBoard.id,
            groupId: frontendGroup?.id,
            title: "Build dashboard layout",
            description: "Create responsive dashboard with sidebar and topbar",
            statusId: sprintBoard.statuses[2]?.id,
            priority: "high",
            startDate: now,
            dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
            order: 1,
          },
          {
            boardId: sprintBoard.id,
            groupId: frontendGroup?.id,
            title: "Add drag and drop functionality",
            description: "Implement drag and drop for tasks",
            statusId: sprintBoard.statuses[0]?.id,
            priority: "medium",
            dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            order: 2,
          },
          {
            boardId: sprintBoard.id,
            groupId: backendGroup?.id,
            title: "Design database schema",
            description: "Create normalized schema for MySQL portability",
            statusId: sprintBoard.statuses[3]?.id,
            priority: "critical",
            startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
            dueDate: now,
            order: 0,
          },
          {
            boardId: sprintBoard.id,
            groupId: backendGroup?.id,
            title: "Implement REST API endpoints",
            description: "Build CRUD endpoints for all entities",
            statusId: sprintBoard.statuses[1]?.id,
            priority: "high",
            startDate: now,
            dueDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
            order: 1,
          },
          {
            boardId: sprintBoard.id,
            groupId: designGroup?.id,
            title: "Create design system",
            description: "Define colors, typography, and component styles",
            statusId: sprintBoard.statuses[3]?.id,
            priority: "medium",
            startDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
            dueDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
            order: 0,
          },
          {
            boardId: sprintBoard.id,
            groupId: designGroup?.id,
            title: "Design table view mockups",
            description: "Create high-fidelity mockups for table view",
            statusId: sprintBoard.statuses[2]?.id,
            priority: "medium",
            startDate: now,
            dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
            order: 1,
          },
        ],
      });
    }

    return NextResponse.json(
      { message: "Demo data created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error seeding demo data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
