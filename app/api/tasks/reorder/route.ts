import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId, orderedIds } = await req.json();
    if (!boardId || !Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: "boardId and orderedIds are required" },
        { status: 400 },
      );
    }

    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        prisma.task.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering tasks:", error);
    return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
    );
  }
}
