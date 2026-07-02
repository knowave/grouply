import React from "react";
import { getUsers } from "../api/userApi";
import { getDepartments } from "../api/departmentApi";
import { MESSAGES } from "../constants/messages";
import type { SlackUser } from "../types/user";
import type { Department } from "../types/department";

type PeoplePickerProps = {
  selectedPeople: string[];
  onChange: (people: string[]) => void;
};

const ALL_FILTER = "__all__";
const NO_DEPARTMENT_FILTER = "__none__";

export function PeoplePicker({ selectedPeople, onChange }: PeoplePickerProps) {
  const [users, setUsers] = React.useState<SlackUser[]>([]);
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [departmentFilter, setDepartmentFilter] = React.useState(ALL_FILTER);

  React.useEffect(() => {
    // 팀 생성 화면은 전체 인원/부서를 한 번에 다뤄야 하므로 큰 size로 전체 로드한다.
    // ponytail: 인원·부서가 1000개를 넘는 조직은 없다고 가정. 넘으면 서버 필터로 전환.
    Promise.all([
      getUsers({ page: 1, size: 1000, sort: "name", order: "asc" }),
      getDepartments({ page: 1, size: 1000 }),
    ])
      .then(([usersData, departmentsData]) => {
        setUsers(usersData.items);
        setDepartments(departmentsData.items);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : MESSAGES.pickerError);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const departmentOptions = React.useMemo(
    () => departments.map((d) => ({ id: d.ID, name: d.Name })),
    [departments],
  );

  const filteredUsers = React.useMemo(() => {
    if (departmentFilter === ALL_FILTER) return users;
    if (departmentFilter === NO_DEPARTMENT_FILTER) return users.filter((u) => u.department_id == null);
    const id = Number(departmentFilter);
    return users.filter((u) => u.department_id === id);
  }, [users, departmentFilter]);

  const selectedSet = new Set(selectedPeople);
  const allSelected = filteredUsers.length > 0 && filteredUsers.every((u) => selectedSet.has(u.name));

  function toggle(name: string) {
    if (selectedSet.has(name)) {
      onChange(selectedPeople.filter((n) => n !== name));
    } else {
      onChange([...selectedPeople, name]);
    }
  }

  function toggleAll() {
    const filteredNames = new Set(filteredUsers.map((u) => u.name));
    if (allSelected) {
      onChange(selectedPeople.filter((n) => !filteredNames.has(n)));
    } else {
      const merged = new Set(selectedPeople);
      filteredUsers.forEach((u) => merged.add(u.name));
      onChange(Array.from(merged));
    }
  }

  return (
    <section className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">{MESSAGES.pickerTitle}</h2>
        {filteredUsers.length > 0 && (
          <button
            className="inline-flex h-8 items-center gap-1 rounded-md border border-black/10 px-3 text-xs font-semibold hover:bg-black/[0.03]"
            onClick={toggleAll}
          >
            {allSelected ? MESSAGES.pickerDeselectAll : MESSAGES.pickerSelectAll}
          </button>
        )}
      </div>

      {users.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              departmentFilter === ALL_FILTER ? "bg-brand text-white" : "border border-black/10 hover:bg-black/[0.03]"
            }`}
            onClick={() => setDepartmentFilter(ALL_FILTER)}
          >
            {MESSAGES.filterAll}
          </button>
          {departmentOptions.map((d) => (
            <button
              key={d.id}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                departmentFilter === String(d.id) ? "bg-brand text-white" : "border border-black/10 hover:bg-black/[0.03]"
              }`}
              onClick={() => setDepartmentFilter(String(d.id))}
            >
              {d.name}
            </button>
          ))}
          <button
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              departmentFilter === NO_DEPARTMENT_FILTER ? "bg-brand text-white" : "border border-black/10 hover:bg-black/[0.03]"
            }`}
            onClick={() => setDepartmentFilter(NO_DEPARTMENT_FILTER)}
          >
            {MESSAGES.noDepartment}
          </button>
        </div>
      )}

      {isLoading && (
        <p className="text-sm text-black/50">{MESSAGES.pickerLoading}</p>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {!isLoading && !error && users.length === 0 && (
        <div className="rounded-md border border-dashed border-black/20 px-3 py-4 text-sm text-black/50">
          {MESSAGES.pickerEmpty}
        </div>
      )}

      {users.length > 0 && (
        <>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {filteredUsers.map((user) => {
              const checked = selectedSet.has(user.name);
              return (
                <label
                  key={user.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                    checked ? "bg-brand/10 font-medium text-brand" : "hover:bg-black/[0.03]"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer accent-brand"
                    checked={checked}
                    onChange={() => toggle(user.name)}
                  />
                  <span className="min-w-0 flex-1 truncate">{user.name}</span>
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-right text-xs text-black/40">
            {MESSAGES.pickerSelected(selectedPeople.length)}
          </p>
        </>
      )}
    </section>
  );
}
