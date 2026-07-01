import React from "react";
import { getUsers } from "../api/userApi";
import { MESSAGES } from "../constants/messages";
import type { SlackUser } from "../types/user";

type PeoplePickerProps = {
  selectedPeople: string[];
  onChange: (people: string[]) => void;
};

export function PeoplePicker({ selectedPeople, onChange }: PeoplePickerProps) {
  const [users, setUsers] = React.useState<SlackUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    getUsers("name", "asc")
      .then((data) => {
        setUsers(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : MESSAGES.pickerError);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const selectedSet = new Set(selectedPeople);
  const allSelected = users.length > 0 && users.every((u) => selectedSet.has(u.Name));

  function toggle(name: string) {
    if (selectedSet.has(name)) {
      onChange(selectedPeople.filter((n) => n !== name));
    } else {
      onChange([...selectedPeople, name]);
    }
  }

  function toggleAll() {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(users.map((u) => u.Name));
    }
  }

  return (
    <section className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">{MESSAGES.pickerTitle}</h2>
        {users.length > 0 && (
          <button
            className="inline-flex h-8 items-center gap-1 rounded-md border border-black/10 px-3 text-xs font-semibold hover:bg-black/[0.03]"
            onClick={toggleAll}
          >
            {allSelected ? MESSAGES.pickerDeselectAll : MESSAGES.pickerSelectAll}
          </button>
        )}
      </div>

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
            {users.map((user) => {
              const checked = selectedSet.has(user.Name);
              return (
                <label
                  key={user.ID}
                  className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                    checked ? "bg-brand/10 font-medium text-brand" : "hover:bg-black/[0.03]"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer accent-brand"
                    checked={checked}
                    onChange={() => toggle(user.Name)}
                  />
                  <span className="min-w-0 flex-1 truncate">{user.Name}</span>
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
