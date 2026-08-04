export type EmployeePayType = "hourly" | "salary";

export interface Employee {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  hire_date: string | null;
  pay_rate: number | null;
  pay_type: EmployeePayType;
  address_street: string | null;
  address_city: string | null;
  address_province: string | null;
  address_postal: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeFormData {
  full_name: string;
  email: string;
  phone: string;
  role: string;
  hire_date: string;
  pay_rate: string;
  pay_type: EmployeePayType;
  address_street: string;
  address_city: string;
  address_province: string;
  address_postal: string;
}

export const EMPTY_EMPLOYEE_FORM: EmployeeFormData = {
  full_name: "",
  email: "",
  phone: "",
  role: "",
  hire_date: "",
  pay_rate: "",
  pay_type: "hourly",
  address_street: "",
  address_city: "",
  address_province: "",
  address_postal: "",
};

export const EMPLOYEE_PAY_TYPES: {
  id: EmployeePayType;
  label: string;
}[] = [
  { id: "hourly", label: "Hourly" },
  { id: "salary", label: "Fixed / Salary" },
];

export function isEmployeePayType(value: string): value is EmployeePayType {
  return value === "hourly" || value === "salary";
}

export function formatEmployeeAddress(employee: {
  address_street?: string | null;
  address_city?: string | null;
  address_province?: string | null;
  address_postal?: string | null;
}): string {
  return [
    employee.address_street?.trim(),
    employee.address_city?.trim(),
    employee.address_province?.trim(),
    employee.address_postal?.trim(),
  ]
    .filter(Boolean)
    .join(", ");
}

export function formatPayRate(
  rate: number | null | undefined,
  payType: EmployeePayType | string | null | undefined
): string {
  if (rate == null || Number.isNaN(Number(rate))) return "—";
  const amount = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2,
  }).format(Number(rate));
  return payType === "salary" ? `${amount} / salary` : `${amount} / hr`;
}

export function employeeToForm(employee: Employee): EmployeeFormData {
  return {
    full_name: employee.full_name,
    email: employee.email ?? "",
    phone: employee.phone ?? "",
    role: employee.role ?? "",
    hire_date: employee.hire_date ?? "",
    pay_rate:
      employee.pay_rate == null || Number.isNaN(Number(employee.pay_rate))
        ? ""
        : String(employee.pay_rate),
    pay_type: isEmployeePayType(employee.pay_type)
      ? employee.pay_type
      : "hourly",
    address_street: employee.address_street ?? "",
    address_city: employee.address_city ?? "",
    address_province: employee.address_province ?? "",
    address_postal: employee.address_postal ?? "",
  };
}

export function employeeFormToPayload(form: EmployeeFormData) {
  const payRateRaw = form.pay_rate.trim();
  const payRate =
    payRateRaw === "" ? null : Number.parseFloat(payRateRaw);

  return {
    full_name: form.full_name.trim(),
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    role: form.role.trim() || null,
    hire_date: form.hire_date.trim() || null,
    pay_rate:
      payRate == null || Number.isNaN(payRate) ? null : payRate,
    pay_type: form.pay_type,
    address_street: form.address_street.trim() || null,
    address_city: form.address_city.trim() || null,
    address_province: form.address_province.trim() || null,
    address_postal: form.address_postal.trim() || null,
    updated_at: new Date().toISOString(),
  };
}
