import React from "react";
import * as userApi from "../api/userApi";
import { MESSAGES } from "../constants/messages";
import type { SlackUser, UpdateUserPayload } from "../types/user";

export type SortField = "birthday" | "name";
export type SortOrder = "asc" | "desc";

export function useUsers() {
  const [users, setUsers] = React.useState<SlackUser[]>([]);
  const [status, setStatus] = React.useState(MESSAGES.usersLoading);
  const [isError, setIsError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [sort, setSort] = React.useState<SortField>("birthday");
  const [order, setOrder] = React.useState<SortOrder>("asc");

  // Initial load on mount — setState only in .then/.catch (not synchronously in effect body)
  React.useEffect(() => {
    let cancelled = false;
    userApi
      .getUsers("birthday", "asc")
      .then((data) => {
        if (cancelled) return;
        setUsers(data);
        setStatus(MESSAGES.usersLoaded(data.length));
        setIsError(false);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : MESSAGES.unknownError;
        setStatus(message);
        setIsError(true);
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Used from event handlers (not effects)
  async function loadUsers(s: SortField, o: SortOrder) {
    setStatus(MESSAGES.usersLoading);
    setIsError(false);
    setIsLoading(true);
    try {
      const data = await userApi.getUsers(s, o);
      setUsers(data);
      setStatus(MESSAGES.usersLoaded(data.length));
    } catch (err) {
      const message = err instanceof Error ? err.message : MESSAGES.unknownError;
      setStatus(message);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }

  function changeSort(value: SortField) {
    setSort(value);
    loadUsers(value, order);
  }

  function changeOrder(value: SortOrder) {
    setOrder(value);
    loadUsers(sort, value);
  }

  async function saveUsersBatch(payloads: Parameters<typeof userApi.createUsersBatch>[0]) {
    await userApi.createUsersBatch(payloads);
    await loadUsers(sort, order);
    setStatus(MESSAGES.usersAdded(payloads.length));
  }

  async function saveUser(id: number, payload: UpdateUserPayload) {
    await userApi.updateUser(id, payload);
    await loadUsers(sort, order);
    setStatus(MESSAGES.userUpdated);
  }

  async function removeUser(id: number) {
    await userApi.deleteUser(id);
    await loadUsers(sort, order);
    setStatus(MESSAGES.userDeleted);
  }

  return {
    users,
    status,
    isError,
    isLoading,
    sort,
    order,
    changeSort,
    changeOrder,
    saveUsersBatch,
    saveUser,
    removeUser,
    reload: () => loadUsers(sort, order),
  };
}
