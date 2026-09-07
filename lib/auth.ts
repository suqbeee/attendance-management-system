import { employees, type Employee } from "@/data/employees";
import type { AttendanceRecord } from "@/lib/attendance";
import type { LeaveRequest } from "@/lib/leave";

export type AppRole = "admin" | "hr" | "manager" | "employee";
export type AppSessionUser = { id: string; email: string; name: string; role: AppRole; employeeId?: string; teamIds: string[]; organizationId?: string; authSource: "demo" | "supabase" };
export type DemoRole = AppRole;
export type DemoUser = Omit<AppSessionUser, "authSource" | "organizationId"> & { passwordHash: string };
export type DemoSessionUser = AppSessionUser;

export const DEMO_SESSION_KEY = "northstar-demo-session-v1";
const directReportIds = (managerEmployeeId: string) => {
  const manager = employees.find((employee) => employee.id === managerEmployeeId);
  return manager ? employees.filter((employee) => employee.manager === manager.name && !employee.deletedAt).map((employee) => employee.id) : [];
};

export const demoUsers: DemoUser[] = [
  { id: "demo-admin", email: "admin@northstar.test", passwordHash: "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9", name: "Muneeb Ahmed", role: "admin", employeeId: "EMP-1011", teamIds: [] },
  { id: "demo-hr", email: "hr@northstar.test", passwordHash: "070a3b5e8d4bd5c46acccb91c9c54614c0cd649e78c4c4719e3a64270bae5ddf", name: "Zainab Noor", role: "hr", employeeId: "EMP-1005", teamIds: [] },
  { id: "demo-manager", email: "manager@northstar.test", passwordHash: "866485796cfa8d7c0cf7111640205b83076433547577511d81f8030ae99ecea5", name: "Usman Tariq", role: "manager", employeeId: "EMP-1012", teamIds: directReportIds("EMP-1012") },
  { id: "demo-employee", email: "employee@northstar.test", passwordHash: "5b2f8e27e2e5b4081c03ce70b288c87bd1263140cbd1bd9ae078123509b7caff", name: "Ayesha Khan", role: "employee", employeeId: "EMP-1001", teamIds: [] },
];

export function createDemoSession(user: DemoUser): DemoSessionUser {
  const { passwordHash: _, ...session } = user;
  void _;
  return { ...session, authSource: "demo" };
}

export async function verifyDemoPassword(user: DemoUser, password: string) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return hash === user.passwordHash;
}

export const roleLabels: Record<DemoRole, string> = { admin: "Admin", hr: "HR Manager", manager: "Manager", employee: "Employee" };
const routeRoles: { pattern: RegExp; roles: DemoRole[] }[] = [
  { pattern: /^\/$/, roles: ["admin", "hr", "manager", "employee"] },
  { pattern: /^\/employees\/new\/?$/, roles: ["admin", "hr"] },
  { pattern: /^\/employees\/[^/]+\/edit\/?$/, roles: ["admin", "hr"] },
  { pattern: /^\/employees(?:\/[^/]+)?\/?$/, roles: ["admin", "hr", "manager", "employee"] },
  { pattern: /^\/attendance\/?$/, roles: ["admin", "hr", "manager", "employee"] },
  { pattern: /^\/approvals\/?$/, roles: ["manager"] },
  { pattern: /^\/records\/?$/, roles: ["admin", "hr", "manager"] },
  { pattern: /^\/monthly\/?$/, roles: ["admin", "hr", "manager"] },
  { pattern: /^\/leave\/?$/, roles: ["admin", "hr", "manager", "employee"] },
  { pattern: /^\/schedule\/?$/, roles: ["admin", "hr", "manager", "employee"] },
  { pattern: /^\/time-clock\/?$/, roles: ["admin", "hr"] },
  { pattern: /^\/workforce\/?$/, roles: ["admin", "hr", "manager"] },
  { pattern: /^\/timesheets\/?$/, roles: ["admin", "hr", "manager", "employee"] },
  { pattern: /^\/shifts\/?$/, roles: ["admin", "hr"] },
  { pattern: /^\/holidays\/?$/, roles: ["admin"] },
  { pattern: /^\/reports\/?$/, roles: ["admin", "hr", "manager", "employee"] },
  { pattern: /^\/corrections\/?$/, roles: ["admin", "hr", "manager", "employee"] },
  { pattern: /^\/notifications\/?$/, roles: ["admin", "hr", "manager", "employee"] },
  { pattern: /^\/requests\/?$/, roles: ["admin", "hr", "employee"] },
  { pattern: /^\/departments\/?$/, roles: ["admin", "hr"] },
  { pattern: /^\/audit\/?$/, roles: ["admin", "hr"] },
  { pattern: /^\/settings\/?$/, roles: ["admin", "hr"] },
  { pattern: /^\/calendar\/?$/, roles: ["admin", "hr", "manager", "employee"] },
  { pattern: /^\/announcements\/?$/, roles: ["admin", "hr", "manager", "employee"] },
  { pattern: /^\/lifecycle\/?$/, roles: ["admin", "hr", "employee"] },
];

export function canAccessRoute(role: DemoRole, pathname: string) { return routeRoles.some(({ pattern, roles }) => pattern.test(pathname) && roles.includes(role)); }
export const canManageEmployees = (role: DemoRole) => role === "admin" || role === "hr";
export const canDeleteEmployees = (role: DemoRole) => role === "admin";
export const canManageAttendance = (role: DemoRole) => role === "admin" || role === "hr";
export const canManageLeave = (role: DemoRole) => role === "admin" || role === "hr" || role === "manager";
export const canManageShifts = (role: DemoRole) => role === "admin" || role === "hr";
export const canManageHolidays = (role: DemoRole) => role === "admin";
export const visibleEmployeeIds = (user: DemoSessionUser) => user.role === "admin" || user.role === "hr" ? null : new Set([...(user.employeeId ? [user.employeeId] : []), ...(user.role === "manager" ? user.teamIds : [])]);
export function getVisibleEmployees<T extends Employee>(items: T[], user: DemoSessionUser) { const ids = visibleEmployeeIds(user); return ids ? items.filter((item) => ids.has(item.id)) : items; }
export function getVisibleAttendance<T extends AttendanceRecord>(items: T[], user: DemoSessionUser) { const ids = visibleEmployeeIds(user); return ids ? items.filter((item) => ids.has(item.employeeId)) : items; }
export function getVisibleLeaveRequests<T extends LeaveRequest>(items: T[], user: DemoSessionUser) { const ids = visibleEmployeeIds(user); return ids ? items.filter((item) => ids.has(item.employeeId)) : items; }
export const canViewEmployee = (user: DemoSessionUser, employeeId: string) => visibleEmployeeIds(user)?.has(employeeId) ?? true;
