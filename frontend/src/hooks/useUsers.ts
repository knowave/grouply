import React from "react";
import * as userApi from "../api/userApi";
import { MESSAGES } from "../constants/messages";
import type { SlackUser, UpdateUserPayload } from "../types/user";

export type SortField = "birthday" | "name";
export type SortOrder = "asc" | "desc";

const PAGE_SIZE = 10;

export function useUsers() {
  const [users, setUsers] = React.useState<SlackUser[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState(MESSAGES.usersLoading);
  const [isError, setIsError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [sort, setSort] = React.useState<SortField>("birthday");
  const [order, setOrder] = React.useState<SortOrder>("asc");
  const [name, setName] = React.useState("");
  const [department, setDepartment] = React.useState("");

  // Used from event handlers and effects
  const load = React.useCallback(
    async (p: SortField, o: SortOrder, pg: number, nameFilter: string, departmentFilter: string) => {
      setStatus(MESSAGES.usersLoading);
      setIsError(false);
      setIsLoading(true);
      try {
        const data = await userApi.getUsers({
          page: pg,
          size: PAGE_SIZE,
          sort: p,
          order: o,
          name: nameFilter || undefined,
          department: departmentFilter || undefined,
        });
        setUsers(data.items);
        setTotal(data.total);
        setStatus(MESSAGES.usersLoaded(data.items.length));
      } catch (err) {
        const message = err instanceof Error ? err.message : MESSAGES.unknownError;
        setStatus(message);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    load(sort, order, page, name, department);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeSort(value: SortField) {
    setSort(value);
    setPage(1);
    load(value, order, 1, name, department);
  }

  function changeOrder(value: SortOrder) {
    setOrder(value);
    setPage(1);
    load(sort, value, 1, name, department);
  }

  function changeNameFilter(value: string) {
    setName(value);
    setPage(1);
    load(sort, order, 1, value, department);
  }

  function changeDepartmentFilter(value: string) {
    setDepartment(value);
    setPage(1);
    load(sort, order, 1, name, value);
  }

  function goToPage(value: number) {
    if (value < 1) return;
    setPage(value);
    load(sort, order, value, name, department);
  }

  async function saveUsersBatch(payloads: Parameters<typeof userApi.createUsersBatch>[0]) {
    await userApi.createUsersBatch(payloads);
    await load(sort, order, page, name, department);
    setStatus(MESSAGES.usersAdded(payloads.length));
  }

  async function saveUser(id: number, payload: UpdateUserPayload) {
    await userApi.updateUser(id, payload);
    await load(sort, order, page, name, department);
    setStatus(MESSAGES.userUpdated);
  }

  async function removeUser(id: number) {
    await userApi.deleteUser(id);
    await load(sort, order, page, name, department);
    setStatus(MESSAGES.userDeleted);
  }

  return {
    users,
    total,
    page,
    size: PAGE_SIZE,
    status,
    isError,
    isLoading,
    sort,
    order,
    name,
    department,
    changeSort,
    changeOrder,
    changeNameFilter,
    changeDepartmentFilter,
    goToPage,
    saveUsersBatch,
    saveUser,
    removeUser,
    reload: () => load(sort, order, page, name, department),
  };
}
