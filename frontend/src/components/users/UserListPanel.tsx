import React from "react";
import { MESSAGES } from "../../constants/messages";
import type { SlackUser, UpdateUserPayload } from "../../types/user";
import type { Department } from "../../types/department";
import type { SortField, SortOrder } from "../../hooks/useUsers";

type UserListPanelProps = {
  users: SlackUser[];
  departments: Department[];
  sort: SortField;
  order: SortOrder;
  name: string;
  department: string;
  page: number;
  size: number;
  total: number;
  onSortChange: (value: SortField) => void;
  onOrderChange: (value: SortOrder) => void;
  onNameFilterChange: (value: string) => void;
  onDepartmentFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onUpdate: (id: number, payload: UpdateUserPayload) => Promise<void>;
  onDelete: (id: number, name: string) => Promise<void>;
  globalSetStatus: (msg: string, isError: boolean) => void;
};

const COLUMNS = [
  { label: MESSAGES.colName, required: true },
  { label: MESSAGES.colEmail, required: true },
  { label: MESSAGES.colSlackUserId, required: true },
  { label: MESSAGES.colBirthday, required: true },
  { label: MESSAGES.colDepartment, required: false },
  { label: MESSAGES.colActions, required: false },
];

function toDateInputValue(isoString: string) {
  if (!isoString) return "";
  return isoString.slice(0, 10);
}

export function UserListPanel({
  users,
  departments,
  sort,
  order,
  name,
  department,
  page,
  size,
  total,
  onSortChange,
  onOrderChange,
  onNameFilterChange,
  onDepartmentFilterChange,
  onPageChange,
  onUpdate,
  onDelete,
  globalSetStatus,
}: UserListPanelProps) {
  const totalPages = Math.max(1, Math.ceil(total / size));
  const [nameInput, setNameInput] = React.useState(name);

  return (
    <section className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{MESSAGES.userListTitle}</h2>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-1">
            <span className="text-black/60">{MESSAGES.filterNameLabel}</span>
            <input
              className="h-9 rounded-md border border-black/10 px-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
              value={nameInput}
              placeholder={MESSAGES.filterNamePlaceholder}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={() => onNameFilterChange(nameInput.trim())}
              onKeyDown={(e) => e.key === "Enter" && onNameFilterChange(nameInput.trim())}
            />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-black/60">{MESSAGES.filterDepartmentLabel}</span>
            <select
              className="h-9 rounded-md border border-black/10 bg-white px-2 text-sm outline-none focus:border-brand"
              value={department}
              onChange={(e) => onDepartmentFilterChange(e.target.value)}
            >
              <option value="">{MESSAGES.filterAllDepartments}</option>
              {departments.map((d) => (
                <option key={d.ID} value={d.Name}>
                  {d.Name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            <span className="text-black/60">{MESSAGES.sortLabel}</span>
            <select
              className="h-9 rounded-md border border-black/10 bg-white px-2 text-sm outline-none focus:border-brand"
              value={sort}
              onChange={(e) => onSortChange(e.target.value as SortField)}
            >
              <option value="birthday">{MESSAGES.sortBirthday}</option>
              <option value="name">{MESSAGES.sortName}</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            <span className="text-black/60">{MESSAGES.orderLabel}</span>
            <select
              className="h-9 rounded-md border border-black/10 bg-white px-2 text-sm outline-none focus:border-brand"
              value={order}
              onChange={(e) => onOrderChange(e.target.value as SortOrder)}
            >
              <option value="asc">{MESSAGES.orderAsc}</option>
              <option value="desc">{MESSAGES.orderDesc}</option>
            </select>
          </label>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="flex min-h-24 items-center justify-center rounded-md border border-dashed border-black/20 bg-[#f9fafb] text-sm text-black/50">
          {MESSAGES.usersEmpty}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col.label} className="border-b border-black/10 bg-[#f9fafb] px-3 py-2 text-left text-xs font-semibold text-black/60">
                    {col.label}
                    {col.required && <span className="text-red-500"> *</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  departments={departments}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  globalSetStatus={globalSetStatus}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 flex items-center justify-end gap-3 text-sm">
        <span className="text-black/50">{MESSAGES.pageInfo(page, total, size)}</span>
        <div className="flex gap-2">
          <button
            className="inline-flex h-8 items-center rounded-md border border-black/10 px-3 text-xs font-semibold hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            {MESSAGES.prevPage}
          </button>
          <button
            className="inline-flex h-8 items-center rounded-md border border-black/10 px-3 text-xs font-semibold hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            {MESSAGES.nextPage}
          </button>
        </div>
      </div>
    </section>
  );
}

type UserRowProps = {
  user: SlackUser;
  departments: Department[];
  onUpdate: (id: number, payload: UpdateUserPayload) => Promise<void>;
  onDelete: (id: number, name: string) => Promise<void>;
  globalSetStatus: (msg: string, isError: boolean) => void;
};

function UserRow({ user, departments, onUpdate, onDelete, globalSetStatus }: UserRowProps) {
  const [name, setName] = React.useState(user.name);
  const [email, setEmail] = React.useState(user.email);
  const [birthday, setBirthday] = React.useState(toDateInputValue(user.birthday));
  const [departmentId, setDepartmentId] = React.useState(user.department_id ?? null);
  const [isBusy, setIsBusy] = React.useState(false);
  const lastSaved = React.useRef({ name: user.name, email: user.email, birthday: toDateInputValue(user.birthday), departmentId: user.department_id ?? null });

  async function handleFieldBlur(next: { name: string; email: string; birthday: string; departmentId: number | null }) {
    const current = { name: next.name.trim(), email: next.email.trim(), birthday: next.birthday, departmentId: next.departmentId };
    if (JSON.stringify(current) === JSON.stringify(lastSaved.current)) return;
    if (!current.name || !current.email || !current.birthday) {
      globalSetStatus(MESSAGES.fillUpdateFields, true);
      return;
    }
    setIsBusy(true);
    try {
      await onUpdate(user.id, {
        name: current.name,
        email: current.email,
        birthday: `${current.birthday}T00:00:00+09:00`,
        department_id: current.departmentId,
      });
      lastSaved.current = current;
    } catch (err) {
      globalSetStatus(err instanceof Error ? err.message : MESSAGES.unknownError, true);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(MESSAGES.confirmDelete(user.name))) return;
    setIsBusy(true);
    try {
      await onDelete(user.id, user.name);
    } catch (err) {
      globalSetStatus(err instanceof Error ? err.message : MESSAGES.unknownError, true);
      setIsBusy(false);
    }
  }

  const inputClass =
    "h-9 w-full rounded-md border border-black/10 px-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";
  const readonlyClass =
    "h-9 w-full rounded-md border border-black/10 bg-[#f2f4f7] px-2 text-sm text-black/50";

  return (
    <tr className="hover:bg-[#fafafa]">
      <td className="border-b border-black/5 px-2 py-1.5">
        <input
          className={inputClass}
          value={name}
          disabled={isBusy}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => handleFieldBlur({ name, email, birthday, departmentId })}
        />
      </td>
      <td className="border-b border-black/5 px-2 py-1.5">
        <input
          type="email"
          className={inputClass}
          value={email}
          disabled={isBusy}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => handleFieldBlur({ name, email, birthday, departmentId })}
        />
      </td>
      <td className="border-b border-black/5 px-2 py-1.5">
        <input className={readonlyClass} value={user.slack_user_id} readOnly />
      </td>
      <td className="border-b border-black/5 px-2 py-1.5">
        <input
          type="date"
          className={inputClass}
          value={birthday}
          disabled={isBusy}
          onChange={(e) => setBirthday(e.target.value)}
          onBlur={() => handleFieldBlur({ name, email, birthday, departmentId })}
        />
      </td>
      <td className="border-b border-black/5 px-2 py-1.5">
        <select
          className={inputClass}
          value={departmentId ?? ""}
          disabled={isBusy}
          onChange={(e) => {
            const next = e.target.value ? Number(e.target.value) : null;
            setDepartmentId(next);
            handleFieldBlur({ name, email, birthday, departmentId: next });
          }}
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
          className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isBusy}
          onClick={handleDelete}
        >
          {MESSAGES.deleteButton}
        </button>
      </td>
    </tr>
  );
}
