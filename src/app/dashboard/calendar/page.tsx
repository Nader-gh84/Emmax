import { redirect } from "next/navigation";

/** Standalone Calendar nav removed — week view lives on Today. */
export default function CalendarRedirectPage() {
  redirect("/dashboard/today");
}
