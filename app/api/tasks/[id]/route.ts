import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

function toUtcMidday(dateStr?: string | null) {
  if (!dateStr) return null;
  const trimmed = String(dateStr).trim();
  if (!trimmed) return null;
  // Midday UTC avoids timezone shifting one day back/forward when displayed locally
  return new Date(`${trimmed}T12:00:00Z`);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await req.json();
    const updateData: any = { ...data };

    // ✅ Permite atualizar/limpar datas corretamente
    if ("startDate" in data) {
      updateData.startDate = "startDate" in data ? toUtcMidday(data.startDate) : undefined;
    }
    if ("dueDate" in data) {
      updateData.dueDate = "dueDate" in data ? toUtcMidday(data.dueDate) : undefined;
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        // ✅ FIX: incluir image do assignee
        assignee: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Task deleted" });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
