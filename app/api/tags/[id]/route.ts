import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

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
    if (!id) {
      return NextResponse.json({ error: "Tag id is required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const hard = searchParams.get("hard") === "true";

    if (hard) {
      await prisma.$transaction([
        prisma.tag.update({ where: { id }, data: { tasks: { set: [] } } }),
        prisma.tag.delete({ where: { id } }),
      ]);
      return NextResponse.json({ message: "Tag permanently deleted" });
    }

    // Marca como deletada e desvincula das tasks
    const deleted = await prisma.tag.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        tasks: { set: [] },
      },
      include: { tasks: true },
    });

    return NextResponse.json({ message: "Tag deleted", tag: deleted });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Tag id is required" }, { status: 400 });
    }

    const restored = await prisma.tag.update({
      where: { id },
      data: { deletedAt: null },
    });

    return NextResponse.json({ message: "Tag restored", tag: restored });
  } catch (error) {
    console.error("Error restoring tag:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
