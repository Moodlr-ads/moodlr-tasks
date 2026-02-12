import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      redirect("/login");
    }
  } catch (error: any) {
    // NEXT_REDIRECT is thrown by redirect() — rethrow so Next.js handles it
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    // On transient errors (cold start, DB issues), let the page render.
    // The client-side SessionProvider will handle auth state.
    console.error("Session check error (allowing render):", error);
  }

  return <>{children}</>;
}
