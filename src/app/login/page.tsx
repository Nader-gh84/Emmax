import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy px-4 py-12">
      <Link
        href="/"
        className="mb-8 text-2xl font-bold text-white hover:opacity-90"
      >
        Ema<span className="text-accent">X</span>
      </Link>
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}
