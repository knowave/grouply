import React from "react";
import { MESSAGES } from "../../constants/messages";
import type { SlackUser, UpdateUserPayload } from "../../types/user";
import type { SortField, SortOrder } from "../../hooks/useUsers";

type UserListPanelProps = {
  users: SlackUser[];
  sort: SortField;
  order: SortOrder;
  onSortChange: (value: SortField) => void;
  onOrderChange: (value: SortOrder) => void;
  onUpdate: (id: number, payload: UpdateUserPayload) => Promise<void>;
  onDelete: (id: number, name: string) => Promise<void>;
  globalSetStatus: (msg: string, isError: boolean) => void;
};

function toDateInputValue(isoString: string) {
  if (!isoString) return "";
  return isoString.slice(0, 10);
}

export function UserListPanel({
  users,
  sort,
  order,
  onSortChange,
  onOrderChange,
  onUpdate,
  onDelete,
  globalSetStatus,
}: UserListPanelProps) {
  return (
    <section className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{MESSAGES.userListTitle}</h2>
        <div className="flex flex-wrap items-center gap-3 text-sm">
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
          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead>
              <tr>
                {[MESSAGES.colName, MESSAGES.colEmail, MESSAGES.colSlackUserId, MESSAGES.colBirthday, MESSAGES.colActions].map((h) => (
                  <th key={h} className="border-b border-black/10 bg-[#f9fafb] px-3 py-2 text-left text-xs font-semibold text-black/60">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow
                  key={user.ID}
                  user={user}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  globalSetStatus={globalSetStatus}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

type UserRowProps = {
  user: SlackUser;
  onUpdate: (id: number, payload: UpdateUserPayload) => Promise<void>;
  onDelete: (id: number, name: string) => Promise<void>;
  globalSetStatus: (msg: string, isError: boolean) => void;
};

function UserRow({ user, onUpdate, onDelete, globalSetStatus }: UserRowProps) {
  const [name, setName] = React.useState(user.Name);
  const [email, setEmail] = React.useState(user.Email);
  const [birthday, setBirthday] = React.useState(toDateInputValue(user.Birthday));
  const [isBusy, setIsBusy] = React.useState(false);

  async function handleUpdate() {
    if (!name.trim() || !email.trim() || !birthday) {
      globalSetStatus(MESSAGES.fillUpdateFields, true);
      return;
    }
    if (!confirm(MESSAGES.confirmUpdate)) return;
    setIsBusy(true);
    try {
      await onUpdate(user.ID, {
        name: name.trim(),
        email: email.trim(),
        birthday: `${birthday}T00:00:00+09:00`,
      });
    } catch (err) {
      globalSetStatus(err instanceof Error ? err.message : MESSAGES.unknownError, true);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(MESSAGES.confirmDelete(user.Name))) return;
    setIsBusy(true);
    try {
      await onDelete(user.ID, user.Name);
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
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </td>
      <td className="border-b border-black/5 px-2 py-1.5">
        <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
      </td>
      <td className="border-b border-black/5 px-2 py-1.5">
        <input className={readonlyClass} value={user.SlackUserID} readOnly />
      </td>
      <td className="border-b border-black/5 px-2 py-1.5">
        <input type="date" className={inputClass} value={birthday} onChange={(e) => setBirthday(e.target.value)} />
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
