import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { put } from "@vercel/blob";
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

    // Guardrail: avoid very large uploads (avatars only)
    const MAX_BYTES = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 400 },
      );
    }

    // Use Vercel Blob in production (when token is available)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        // Generate unique filename to prevent collisions
        const ext = path.extname(file.name) || ".png";
        const uniqueName = `avatars/${crypto.randomUUID()}${ext}`;

        const blob = await put(uniqueName, file, {
          access: "public",
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        return NextResponse.json({ imageUrl: blob.url });
      } catch (error) {
        console.error("Blob upload error:", error);
        return NextResponse.json(
          { error: "Failed to upload to storage" },
          { status: 500 },
        );
      }
    }

    // Fallback to local filesystem in development
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = path.extname(file.name) || ".png";
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    try {
      await fs.mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, uniqueName);
      await fs.writeFile(filePath, buffer);
      const imageUrl = `/uploads/${uniqueName}`;
      return NextResponse.json({ imageUrl });
    } catch (error) {
      console.error("Filesystem upload error:", error);
      return NextResponse.json(
        { error: "Failed to save file" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
