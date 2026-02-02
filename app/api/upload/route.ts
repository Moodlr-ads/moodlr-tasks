import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // Guardrail: avoid very large uploads (avatars only)
    const MAX_BYTES = 5 * 1024 * 1024; // 5MB
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 400 },
      );
    }

    const ext = path.extname(file.name) || ".png";
    const fileName = `${crypto.randomUUID()}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    try {
      await fs.mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, fileName);
      await fs.writeFile(filePath, buffer);
      const imageUrl = `/uploads/${fileName}`;
      return NextResponse.json({ imageUrl });
    } catch (error) {
      // Read-only filesystem (e.g., serverless) fallback: inline base64 data URL
      const base64 = buffer.toString("base64");
      const mime =
        file.type ||
        (ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".gif"
            ? "image/gif"
            : "image/png");
      const imageUrl = `data:${mime};base64,${base64}`;
      console.warn("Upload fallback to data URL (fs write failed):", error);
      return NextResponse.json({ imageUrl, inline: true });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
