"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center">
          <Image
            src="/moodlr-icon.png"
            alt="Moodlr"
            width={48}
            height={48}
            className="h-12 w-12"
            priority
          />
        </div>

        <div className="bg-slate-900 rounded-lg shadow-xl border border-slate-800 p-8">
          <div className="flex gap-2 mb-6 bg-slate-800 p-1 rounded-md">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                isLogin
                  ? "bg-slate-900 text-slate-50 shadow-sm"
                  : "text-slate-300 hover:text-slate-100"
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                !isLogin
                  ? "bg-slate-900 text-slate-50 shadow-sm"
                  : "text-slate-300 hover:text-slate-100"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-slate-200">
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
              <Label htmlFor="email" className="text-sm font-medium text-slate-200">
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
              <Label htmlFor="password" className="text-sm font-medium text-slate-200">
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
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                Demo: Use any email/password to create an account
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
