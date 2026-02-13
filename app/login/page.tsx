"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const demoAccounts = [
  { label: "Vitor (owner)", email: "vitor@moodlr.com", password: "vitorlopes223" },
  { label: "Marcelo", email: "marcelo@moodlr.com", password: "marcelorola221" },
  { label: "Andhy", email: "andhy@moodlr.com", password: "andhymoodlr229" },
  { label: "Kayan", email: "kayan@moodlr.com", password: "kayanmoodlr226" },
  { label: "Gilailson", email: "gilailson@moodlr.com", password: "gilacarneiro227" },
];

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          toast.error("Invalid credentials");
        } else {
          toast.success("Welcome back!");
          router.push("/dashboard");
          router.refresh();
        }
      } else {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });

        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Registration failed");
        } else {
          toast.success("Account created! Logging in...");
          // Auto login after registration
          const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
          });
          if (!result?.error) {
            router.push("/dashboard");
            router.refresh();
          }
        }
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (account: (typeof demoAccounts)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    toast.success(`Filled with ${account.email}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="bg-slate-900 dark:bg-transparent p-3 dark:p-0 rounded-md flex items-center justify-center">
            <Image
              src="/moodlr-icon.png"
              alt="Moodlr"
              width={112}
              height={112}
              className="h-24 sm:h-28 w-auto mx-auto"
              priority
            />
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-xl border border-border p-8">
          <div className="flex gap-2 mb-6 bg-muted p-1 rounded-md">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                isLogin
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                !isLogin
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
              <Label htmlFor="name" className="text-sm font-medium text-foreground">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  className="mt-1"
                  placeholder="John Doe"
                />
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1"
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 font-medium shadow-sm"
              style={{ backgroundColor: "hsl(243, 75%, 59%)" }}
            >
              {loading ? "Please wait..." : isLogin ? "Log In" : "Create Account"}
            </Button>
          </form>

          {isLogin && (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-slate-500 text-center">
                Demo: use any email/password to sign up or pick a pre-seeded account below.
              </p>
              <div className="grid gap-2">
                {demoAccounts.map((account) => (
                  <Button
                    key={account.email}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => fillDemo(account)}
                    disabled={loading}
                  >
                    <span className="font-medium text-left">{account.label}</span>
                    <span className="text-xs text-muted-foreground">{account.email}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
