import React from "react";
import * as departmentApi from "../api/departmentApi";
import { MESSAGES } from "../constants/messages";
import type { CreateDepartmentPayload, Department, UpdateDepartmentPayload } from "../types/department";

const PAGE_SIZE = 10;

// size를 크게 주면(예: 1000) 사실상 "전체 목록"으로 쓸 수 있다 — 부서 select 옵션 공급용.
// ponytail: 부서가 1000개를 넘는 조직은 없다고 가정. 넘으면 전용 검색 API로 교체.
export function useDepartments(size = PAGE_SIZE) {
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState(MESSAGES.departmentsLoading);
  const [isError, setIsError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const load = React.useCallback(
    async (pg: number) => {
      setStatus(MESSAGES.departmentsLoading);
      setIsError(false);
      setIsLoading(true);
      try {
        const data = await departmentApi.getDepartments({ page: pg, size });
        setDepartments(data.items);
        setTotal(data.total);
        setStatus(MESSAGES.departmentsLoaded(data.items.length));
      } catch (err) {
        const message = err instanceof Error ? err.message : MESSAGES.unknownError;
        setStatus(message);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [size],
  );

  React.useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goToPage(value: number) {
    if (value < 1) return;
    setPage(value);
    load(value);
  }

  async function saveDepartmentsBatch(payloads: CreateDepartmentPayload[]) {
    await departmentApi.createDepartments(payloads);
    await load(page);
    setStatus(MESSAGES.departmentsAdded(payloads.length));
  }

  async function saveDepartment(id: number, payload: UpdateDepartmentPayload) {
    await departmentApi.updateDepartment(id, payload);
    await load(page);
    setStatus(MESSAGES.departmentUpdated);
  }

  async function removeDepartment(id: number) {
    await departmentApi.deleteDepartments([id]);
    await load(page);
    setStatus(MESSAGES.departmentDeleted);
  }

  return {
    departments,
    total,
    page,
    size,
    status,
    isError,
    isLoading,
    goToPage,
    saveDepartmentsBatch,
    saveDepartment,
    removeDepartment,
    reload: () => load(page),
  };
}
