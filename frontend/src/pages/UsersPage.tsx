import { Building2, RefreshCw, Shuffle } from "lucide-react";
import { Link } from "react-router-dom";
import { AddUsersPanel } from "../components/users/AddUsersPanel";
import { UserListPanel } from "../components/users/UserListPanel";
import { MESSAGES } from "../constants/messages";
import { useUsers } from "../hooks/useUsers";
import { useDepartments } from "../hooks/useDepartments";
import React from "react";

export function UsersPage() {
  const users = useUsers();
  const departments = useDepartments(1000); // select 옵션용 — 부서 전체 목록
  const [localStatus, setLocalStatus] = React.useState<{ msg: string; isError: boolean } | null>(null);

  function setStatus(msg: string, isError: boolean) {
    setLocalStatus({ msg, isError });
  }

  const displayStatus = localStatus ?? { msg: users.status, isError: users.isError };

  async function handleSaveBatch(rows: Parameters<typeof users.saveUsersBatch>[0]) {
    setLocalStatus(null);
    try {
      await users.saveUsersBatch(rows);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : MESSAGES.unknownError, true);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-ink">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Grouply</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {MESSAGES.usersPageTitle}
            </h1>
            <p
              className={`mt-2 text-sm ${displayStatus.isError ? "text-red-600" : "text-black/50"}`}
            >
              {displayStatus.msg}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md border border-black/10 px-4 text-sm font-semibold hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={users.isLoading}
              onClick={() => { setLocalStatus(null); users.reload(); }}
            >
              <RefreshCw size={15} />
              {MESSAGES.reloadButton}
            </button>
            <Link
              to="/departments"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-black/10 px-4 text-sm font-semibold hover:bg-black/[0.03]"
            >
              <Building2 size={15} />
              {MESSAGES.departmentsNavButton}
            </Link>
            <Link
              to="/team-generate"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#265d61]"
            >
              <Shuffle size={15} />
              {MESSAGES.openGeneratorButton}
            </Link>
          </div>
        </header>

        <AddUsersPanel departments={departments.departments} onSave={handleSaveBatch} globalSetStatus={setStatus} />
        <UserListPanel
          users={users.users}
          departments={departments.departments}
          sort={users.sort}
          order={users.order}
          page={users.page}
          size={users.size}
          total={users.total}
          onSortChange={users.changeSort}
          onOrderChange={users.changeOrder}
          onPageChange={users.goToPage}
          onUpdate={users.saveUser}
          onDelete={users.removeUser}
          globalSetStatus={setStatus}
        />
      </section>
    </main>
  );
}
