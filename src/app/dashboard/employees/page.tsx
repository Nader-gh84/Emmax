import { redirect } from "next/navigation";

/**
 * Legacy sidebar route. There was never any real employee data here —
 * only a placeholder. Redirect into Advance Setting > Employees so the
 * nav entry stays useful without duplicating the registry UI.
 */
export default function EmployeesPage() {
  redirect("/dashboard/settings?section=employees");
}
