import React from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { MESSAGES } from "../constants/messages";
import { useDepartments } from "../hooks/useDepartments";
import type { Department } from "../types/department";

type Row = {
  name: string;
  description: string;
};

function emptyRow(): Row {
  return { name: "", description: "" };
}

export function DepartmentsPage() {
  const departments = useDepartments();
  const [localStatus, setLocalStatus] = React.useState<{ msg: string; isError: boolean } | null>(null);
  const [rows, setRows] = React.useState<Row[]>([emptyRow()]);
  const [isSaving, setIsSaving] = React.useState(false);

  function setStatus(msg: string, isError: boolean) {
    setLocalStatus({ msg, isError });
  }

  const displayStatus = localStatus ?? { msg: departments.status, isError: departments.isError };
  const totalPages = Math.max(1, Math.ceil(departments.total / departments.size));

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function updateRow(index: number, field: keyof Row, value: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function removeRow(index: number) {
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [emptyRow()] : next;
    });
  }

  async function handleSave() {
    const filled = rows.filter((r) => r.name.trim() || r.description.trim());
    if (filled.length === 0) {
      setStatus(MESSAGES.noDepartmentsToAdd, true);
      return;
    }
    if (filled.some((r) => !r.name.trim())) {
      setStatus(MESSAGES.fillDepartmentFields, true);
      return;
    }

    setIsSaving(true);
    setLocalStatus(null);
    try {
      await departments.saveDepartmentsBatch(
        filled.map((r) => ({ name: r.name.trim(), description: r.description.trim() || undefined })),
      );
      setRows([emptyRow()]);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : MESSAGES.unknownError, true);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-ink">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Grouply</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {MESSAGES.departmentsPageTitle}
            </h1>
            <p className={`mt-2 text-sm ${displayStatus.isError ? "text-red-600" : "text-black/50"}`}>
              {displayStatus.msg}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-black/10 px-4 text-sm font-semibold hover:bg-black/[0.03]"
            >
              <ArrowLeft size={15} />
              {MESSAGES.backToUsersButton}
            </Link>
          </div>
        </header>

        <section className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-bold">{MESSAGES.addDepartmentsTitle}</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-sm">
              <thead>
                <tr>
                  {[MESSAGES.colName, MESSAGES.colDescription, MESSAGES.deleteButton].map((h) => (
                    <th key={h} className="border-b border-black/10 bg-[#f9fafb] px-3 py-2 text-left text-xs font-semibold text-black/60">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index}>
                    <td className="border-b border-black/5 px-2 py-1.5">
                      <input
                        className="h-9 w-full rounded-md border border-black/10 px-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                        value={row.name}
                        placeholder={MESSAGES.colName}
                        onChange={(e) => updateRow(index, "name", e.target.value)}
                      />
                    </td>
                    <td className="border-b border-black/5 px-2 py-1.5">
                      <input
                        className="h-9 w-full rounded-md border border-black/10 px-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                        value={row.description}
                        placeholder={MESSAGES.colDescription}
                        onChange={(e) => updateRow(index, "description", e.target.value)}
                      />
                    </td>
                    <td className="border-b border-black/5 px-2 py-1.5">
                      <button
                        className="inline-flex h-9 items-center gap-1 rounded-md border border-red-200 px-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                        onClick={() => removeRow(index)}
                      >
                        <Trash2 size={14} />
                        {MESSAGES.deleteRowButton}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              className="inline-flex h-9 items-center gap-1 rounded-md border border-black/10 px-3 text-sm font-semibold hover:bg-black/[0.03]"
              onClick={addRow}
            >
              <Plus size={15} />
              {MESSAGES.addRowButton}
            </button>
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#265d61] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={handleSave}
            >
              {MESSAGES.saveBatchButton}
            </button>
          </div>
        </section>

        <section className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-bold">{MESSAGES.departmentListTitle}</h2>
          {departments.departments.length === 0 ? (
            <div className="flex min-h-24 items-center justify-center rounded-md border border-dashed border-black/20 bg-[#f9fafb] text-sm text-black/50">
              {MESSAGES.departmentsEmpty}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-sm">
                <thead>
                  <tr>
                    {[MESSAGES.colName, MESSAGES.colDescription, MESSAGES.colActions].map((h) => (
                      <th key={h} className="border-b border-black/10 bg-[#f9fafb] px-3 py-2 text-left text-xs font-semibold text-black/60">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {departments.departments.map((department) => (
                    <DepartmentRow
                      key={department.ID}
                      department={department}
                      onUpdate={departments.saveDepartment}
                      onDelete={departments.removeDepartment}
                      globalSetStatus={setStatus}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 flex items-center justify-end gap-3 text-sm">
            <span className="text-black/50">
              {MESSAGES.departmentPageInfo(departments.page, departments.total, departments.size)}
            </span>
            <div className="flex gap-2">
              <button
                className="inline-flex h-8 items-center rounded-md border border-black/10 px-3 text-xs font-semibold hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={departments.page <= 1}
                onClick={() => departments.goToPage(departments.page - 1)}
              >
                {MESSAGES.prevPage}
              </button>
              <button
                className="inline-flex h-8 items-center rounded-md border border-black/10 px-3 text-xs font-semibold hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={departments.page >= totalPages}
                onClick={() => departments.goToPage(departments.page + 1)}
              >
                {MESSAGES.nextPage}
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

type DepartmentRowProps = {
  department: Department;
  onUpdate: (id: number, payload: { name: string; description?: string }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  globalSetStatus: (msg: string, isError: boolean) => void;
};

function DepartmentRow({ department, onUpdate, onDelete, globalSetStatus }: DepartmentRowProps) {
  const [name, setName] = React.useState(department.Name);
  const [description, setDescription] = React.useState(department.Description);
  const [isBusy, setIsBusy] = React.useState(false);

  async function handleUpdate() {
    if (!name.trim()) {
      globalSetStatus(MESSAGES.fillDepartmentUpdateFields, true);
      return;
    }
    if (!confirm(MESSAGES.confirmUpdateDepartment)) return;
    setIsBusy(true);
    try {
      await onUpdate(department.ID, { name: name.trim(), description: description.trim() || undefined });
    } catch (err) {
      globalSetStatus(err instanceof Error ? err.message : MESSAGES.unknownError, true);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(MESSAGES.confirmDeleteDepartment(department.Name))) return;
    setIsBusy(true);
    try {
      await onDelete(department.ID);
    } catch (err) {
      globalSetStatus(err instanceof Error ? err.message : MESSAGES.unknownError, true);
      setIsBusy(false);
    }
  }

  const inputClass =
    "h-9 w-full rounded-md border border-black/10 px-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";

  return (
    <tr className="hover:bg-[#fafafa]">
      <td className="border-b border-black/5 px-2 py-1.5">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </td>
      <td className="border-b border-black/5 px-2 py-1.5">
        <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
      </td>
      <td className="border-b border-black/5 px-2 py-1.5">
        <div className="flex gap-2">
          <button
            className="inline-flex h-9 items-center justify-center rounded-md bg-brand px-3 text-xs font-semibold text-white transition hover:bg-[#265d61] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            onClick={handleUpdate}
          >
            {MESSAGES.editButton}
          </button>
          <button
            className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy}
            onClick={handleDelete}
          >
            {MESSAGES.deleteButton}
          </button>
        </div>
      </td>
    </tr>
  );
}
