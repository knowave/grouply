import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { MESSAGES } from "../../constants/messages";
import type { Department } from "../../types/department";

type Row = {
  name: string;
  email: string;
  slack_user_id: string;
  birthday: string;
  department_id: number | null;
};

function emptyRow(): Row {
  return { name: "", email: "", slack_user_id: "", birthday: "", department_id: null };
}

type AddUsersPanelProps = {
  departments: Department[];
  onSave: (rows: Row[]) => Promise<void>;
  globalSetStatus: (msg: string, isError: boolean) => void;
};

export function AddUsersPanel({ departments, onSave, globalSetStatus }: AddUsersPanelProps) {
  const [rows, setRows] = React.useState<Row[]>([emptyRow()]);
  const [isSaving, setIsSaving] = React.useState(false);

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
    const filled = rows.filter(
      (r) => r.name.trim() || r.email.trim() || r.slack_user_id.trim() || r.birthday,
    );
    if (filled.length === 0) {
      globalSetStatus(MESSAGES.noUsersToAdd, true);
      return;
    }
    if (filled.some((r) => !r.name.trim() || !r.email.trim() || !r.slack_user_id.trim() || !r.birthday)) {
      globalSetStatus(MESSAGES.fillAllFields, true);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(
        filled.map((r) => ({
          ...r,
          birthday: `${r.birthday}T00:00:00+09:00`,
        })),
      );
      setRows([emptyRow()]);
    } catch (err) {
      globalSetStatus(err instanceof Error ? err.message : MESSAGES.unknownError, true);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-bold">{MESSAGES.addUsersTitle}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr>
              {[
                MESSAGES.colName,
                MESSAGES.colEmail,
                MESSAGES.colSlackUserId,
                MESSAGES.colBirthday,
                MESSAGES.colDepartment,
                MESSAGES.deleteButton,
              ].map((h) => (
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
                    type="email"
                    className="h-9 w-full rounded-md border border-black/10 px-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                    value={row.email}
                    placeholder={MESSAGES.colEmail}
                    onChange={(e) => updateRow(index, "email", e.target.value)}
                  />
                </td>
                <td className="border-b border-black/5 px-2 py-1.5">
                  <input
                    className="h-9 w-full rounded-md border border-black/10 px-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                    value={row.slack_user_id}
                    placeholder="U0XXXXXXX"
                    onChange={(e) => updateRow(index, "slack_user_id", e.target.value)}
                  />
                </td>
                <td className="border-b border-black/5 px-2 py-1.5">
                  <input
                    type="date"
                    className="h-9 w-full rounded-md border border-black/10 px-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                    value={row.birthday}
                    onChange={(e) => updateRow(index, "birthday", e.target.value)}
                  />
                </td>
                <td className="border-b border-black/5 px-2 py-1.5">
                  <select
                    className="h-9 w-full rounded-md border border-black/10 px-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                    value={row.department_id ?? ""}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r, i) =>
                          i === index
                            ? { ...r, department_id: e.target.value ? Number(e.target.value) : null }
                            : r,
                        ),
                      )
                    }
                  >
                    <option value="">{MESSAGES.noDepartmentOption}</option>
                    {departments.map((d) => (
                      <option key={d.ID} value={d.ID}>
                        {d.Name}
                      </option>
                    ))}
                  </select>
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
  );
}
