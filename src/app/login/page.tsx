import type { Metadata } from "next";
import LoginPageContent from "@/components/marketing/login/LoginPageContent";

/**
 * Login — exact port of public/Login.html (approved design) + Supabase auth.
 */

export const metadata: Metadata = {
  title: "Sign in — EmaX",
  description: "Sign in to your EmaX account.",
};

export default function LoginPage() {
  return <LoginPageContent />;
}
