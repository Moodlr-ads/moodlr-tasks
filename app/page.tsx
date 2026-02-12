import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  try {
    const session = await getServerSession(authOptions);

    if (session) {
      redirect("/dashboard");
    } else {
      redirect("/login");
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    // On transient errors, send to login as a safe default
    redirect("/login");
  }
}
