import type { CreateRestaurantPayload, Restaurant, UpdateRestaurantPayload } from "../types/restaurant";
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

export type GetRestaurantsParams = {
  page: number;
  size: number;
  menuName?: string;
};

export function getRestaurants(params: GetRestaurantsParams): Promise<Paginated<Restaurant>> {
  const query = new URLSearchParams({ page: String(params.page), size: String(params.size) });
  if (params.menuName) query.set("menuName", params.menuName);
  return request<Paginated<Restaurant>>(`${API_BASE_URL}/api/v1/restaurants?${query.toString()}`);
}

export function createRestaurants(restaurants: CreateRestaurantPayload[]): Promise<unknown> {
  return request(`${API_BASE_URL}/api/v1/restaurants`, {
    method: "POST",
    body: JSON.stringify(restaurants),
  });
}

export function updateRestaurant(id: number, payload: UpdateRestaurantPayload): Promise<Restaurant> {
  return request<Restaurant>(`${API_BASE_URL}/api/v1/restaurants/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteRestaurants(ids: number[]): Promise<unknown> {
  return request(`${API_BASE_URL}/api/v1/restaurants`, {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}
