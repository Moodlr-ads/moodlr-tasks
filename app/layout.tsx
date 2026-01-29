import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaskFlow Pro",
  description: "Professional task management for teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.Node;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
