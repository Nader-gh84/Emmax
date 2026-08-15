import type { Metadata } from "next";
import SignupPageContent from "@/components/marketing/signup/SignupPageContent";

/**
 * Signup — exact port of public/Signup.html (approved design) + Supabase auth.
 */

export const metadata: Metadata = {
  title: "Create your account — EmaX",
  description: "Create your EmaX account and start your free trial.",
};

export default function SignupPage() {
  return <SignupPageContent />;
}
