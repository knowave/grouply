import type { CreateDepartmentPayload, Department, UpdateDepartmentPayload } from "../types/department";
import type { Paginated } from "../types/pagination";

const API_BASE_URL = ""; // same-origin, /api는 nginx(배포) / vite proxy(개발)가 라우팅

type ErrorBody = {
  message?: string;
  error?: string;
};

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    let message = `요청 실패 (${response.status})`;
    try {
      const body = (await response.json()) as ErrorBody;
      if (body.error) message = body.error;
      else if (body.message) message = body.message;
    } catch {
      // use status-based message
    }
    throw new Error(message);
  }

  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}

export type GetDepartmentsParams = {
  page: number;
  size: number;
  name?: string;
};

export function getDepartments(params: GetDepartmentsParams): Promise<Paginated<Department>> {
  const query = new URLSearchParams({ page: String(params.page), size: String(params.size) });
  if (params.name) query.set("name", params.name);
  return request<Paginated<Department>>(`${API_BASE_URL}/api/v1/departments?${query.toString()}`);
}

export function createDepartments(departments: CreateDepartmentPayload[]): Promise<unknown> {
  return request(`${API_BASE_URL}/api/v1/departments`, {
    method: "POST",
    body: JSON.stringify(departments),
  });
}

export function updateDepartment(id: number, payload: UpdateDepartmentPayload): Promise<Department> {
  return request<Department>(`${API_BASE_URL}/api/v1/departments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteDepartments(ids: number[]): Promise<unknown> {
  return request(`${API_BASE_URL}/api/v1/departments`, {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}
