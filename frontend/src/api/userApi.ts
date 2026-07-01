import type { CreateUserPayload, SlackUser, UpdateUserPayload } from "../types/user";

// const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:1111`;
const API_BASE_URL = `http://localhost:8080`;

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

export function getUsers(sort: string, order: string): Promise<SlackUser[]> {
  const params = new URLSearchParams({ sort, order });
  return request<SlackUser[]>(`${API_BASE_URL}/api/v1/users?${params.toString()}`);
}

export function createUsersBatch(users: CreateUserPayload[]): Promise<unknown> {
  return request(`${API_BASE_URL}/api/v1/users/batch`, {
    method: "POST",
    body: JSON.stringify(users),
  });
}

export function updateUser(id: number, payload: UpdateUserPayload): Promise<SlackUser> {
  return request<SlackUser>(`${API_BASE_URL}/api/v1/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteUser(id: number): Promise<null> {
  return request<null>(`${API_BASE_URL}/api/v1/users/${id}`, {
    method: "DELETE",
  });
}
