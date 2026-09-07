"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAttendance } from "@/components/attendance-provider";
import { useAuth } from "@/components/auth-provider";
import { useOperations } from "@/components/operations-provider";
import { useWorkforce } from "@/components/workforce-provider";
import { Avatar, EmptyState, PageHeading } from "@/components/ui";
import { attendanceStatusLabels, breakMinutesFor, formatShortDate } from "@/lib/attendance";
import type { LeaveStatus } from "@/lib/leave";
import { formatMinutes } from "@/lib/scheduling";
import { approvalFor } from "@/lib/workforce";

type ApprovalTab = "leave" | "corrections" | "timesheets";

export default function ApprovalsPage() {
  const { currentUser, canManageLeave } = useAuth();
  const { employees, leaveRequests, records, updateLeaveStatus } = useAttendance();
  const { settings, corrections, reviewCorrection, addAudit } = useOperations();
  const { approvals, reviewTimesheet } = useWorkforce();
  const [tab, setTab] = useState<ApprovalTab>("leave");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ ok: boolean; message: string }>();
  const teamIds = useMemo(() => new Set(currentUser?.teamIds || []), [currentUser?.teamIds]);

  const pendingLeave = leaveRequests.filter((item) => teamIds.has(item.employeeId) && (item.status === "Pending Manager" || item.status === "Pending"));
  const pendingCorrections = corrections.filter((item) => teamIds.has(item.employeeId) && item.status === "Pending");
  const pendingTimesheets = records.filter((record) => teamIds.has(record.employeeId) && !!record.checkIn && approvalFor(approvals, record.employeeId, record.date).status === "Pending").sort((a, b) => b.date.localeCompare(a.date));
  const counts: Record<ApprovalTab, number> = { leave: pendingLeave.length, corrections: pendingCorrections.length, timesheets: pendingTimesheets.length };

  function reviewLeave(id: string, decision: "approve" | "reject") {
    const request = pendingLeave.find((item) => item.id === id);
    if (!request || !canManageLeave || request.employeeId === currentUser?.employeeId) return;
    const next: LeaveStatus = decision === "approve" && settings.hrFinalApprovalRequired ? "Pending HR" : decision === "approve" ? "Approved" : "Rejected";
    updateLeaveStatus(id, next);
    addAudit(decision === "approve" ? "approved" : "rejected", "leave request", id, `${next}: ${request.employeeId} leave request.`);
  }

  const tabs: { id: ApprovalTab; label: string }[] = [
    { id: "leave", label: "Leave" },
    { id: "corrections", label: "Corrections" },
    { id: "timesheets", label: "Timesheets" },
  ];

  return <div className="space-y-6">
    <PageHeading title="Approvals" description="Review outstanding items for your direct reports." />
    {notice && <div className={`notice ${notice.ok ? "notice-success" : "notice-error"}`}>{notice.message}</div>}
    <section className="panel overflow-hidden">
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50/60 p-2" role="tablist" aria-label="Approval queues">{tabs.map((item) => <button className={`flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-semibold transition ${tab === item.id ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:bg-white hover:text-slate-800"}`} key={item.id} onClick={() => setTab(item.id)} role="tab" aria-selected={tab === item.id}>{item.label}<span className={`rounded-full px-2 py-0.5 text-[11px] ${tab === item.id ? "bg-blue-50 text-blue-700" : "bg-slate-200/70 text-slate-600"}`}>{counts[item.id]}</span></button>)}</div>

      {tab === "leave" && <div>{pendingLeave.length ? <div className="divide-y divide-slate-100">{pendingLeave.map((item) => { const employee = employees.find((entry) => entry.id === item.employeeId); return <article className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center" key={item.id}><Avatar initials={employee?.initials || item.employeeId.slice(-2)} /><div className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-950">{employee?.name || item.employeeId}</b><p className="mt-1 text-xs text-slate-500">{item.type} · {formatShortDate(item.startDate)}–{formatShortDate(item.endDate)} · {item.days} {item.days === 1 ? "day" : "days"}</p><p className="mt-2 text-sm text-slate-600">{item.reason}</p></div><div className="flex shrink-0 gap-2"><button className="btn-secondary text-rose-600" onClick={() => reviewLeave(item.id, "reject")}>Reject</button><button className="btn-primary" onClick={() => reviewLeave(item.id, "approve")}>{settings.hrFinalApprovalRequired ? "Send to HR" : "Approve"}</button></div></article>; })}</div> : <EmptyState title="No leave approvals" description="There are no team leave requests waiting for you." />}</div>}

      {tab === "corrections" && <div>{pendingCorrections.length ? <div className="divide-y divide-slate-100">{pendingCorrections.map((item) => { const employee = employees.find((entry) => entry.id === item.employeeId); return <article className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,.65fr)_auto] lg:items-center" key={item.id}><div className="flex min-w-0 items-center gap-3"><Avatar initials={employee?.initials || item.employeeId.slice(-2)} /><div className="min-w-0"><b className="block truncate text-sm text-slate-950">{employee?.name || item.employeeId}</b><p className="mt-1 text-xs text-slate-500">{formatShortDate(item.attendanceDate)} · {item.requestedStatus ? attendanceStatusLabels[item.requestedStatus] : "Clock-time update"}</p><p className="mt-2 text-sm text-slate-600">{item.reason}</p></div></div><input className="compact-select w-full" aria-label={`Review note for ${employee?.name || item.employeeId}`} placeholder="Optional review note" value={notes[item.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} /><div className="flex gap-2"><button className="btn-secondary text-rose-600" onClick={() => reviewCorrection(item.id, "Rejected", notes[item.id] || "")}>Reject</button><button className="btn-primary" onClick={() => reviewCorrection(item.id, "Approved", notes[item.id] || "")}>Approve</button></div></article>; })}</div> : <EmptyState title="No correction approvals" description="There are no attendance corrections waiting for you." />}</div>}

      {tab === "timesheets" && <div>{pendingTimesheets.length ? <div className="divide-y divide-slate-100">{pendingTimesheets.map((record) => { const employee = employees.find((item) => item.id === record.employeeId); const key = `${record.employeeId}:${record.date}`; return <article className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,.65fr)_auto] lg:items-center" key={key}><div className="flex min-w-0 items-center gap-3"><Avatar initials={employee?.initials || record.employeeId.slice(-2)} /><div className="min-w-0"><b className="block truncate text-sm text-slate-950">{employee?.name || record.employeeId}</b><p className="mt-1 text-xs text-slate-500">{formatShortDate(record.date)} · {record.checkIn || "—"}–{record.checkOut || "Open"}</p><p className="mt-2 text-sm text-slate-600">{formatMinutes(record.workedMinutes)} worked · {formatMinutes(breakMinutesFor(record))} break</p></div></div><input className="compact-select w-full" aria-label={`Timesheet note for ${employee?.name || record.employeeId}`} placeholder="Optional review note" value={notes[key] || ""} onChange={(event) => setNotes((current) => ({ ...current, [key]: event.target.value }))} /><div className="flex gap-2"><button className="btn-secondary text-rose-600" onClick={() => setNotice(reviewTimesheet(record.employeeId, record.date, "Rejected", notes[key] || ""))}>Reject</button><button className="btn-primary" onClick={() => setNotice(reviewTimesheet(record.employeeId, record.date, "Approved", notes[key] || ""))}>Approve</button></div></article>; })}</div> : <EmptyState title="No timesheet approvals" description="There are no clocked timesheets waiting for you." />}</div>}

      <div className="flex justify-end border-t border-slate-100 bg-slate-50/50 px-5 py-3"><Link className="text-link" href={tab === "leave" ? "/leave" : tab === "corrections" ? "/corrections" : "/timesheets"}>View {tab} history</Link></div>
    </section>
  </div>;
}
