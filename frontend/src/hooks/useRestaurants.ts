import React from "react";
import * as restaurantApi from "../api/restaurantApi";
import { MESSAGES } from "../constants/messages";
import type { CreateRestaurantPayload, Restaurant, UpdateRestaurantPayload } from "../types/restaurant";

const PAGE_SIZE = 10;

export function useRestaurants() {
  const [restaurants, setRestaurants] = React.useState<Restaurant[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [menuName, setMenuName] = React.useState("");
  const [status, setStatus] = React.useState(MESSAGES.restaurantsLoading);
  const [isError, setIsError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const load = React.useCallback(async (pg: number, menu: string) => {
    setStatus(MESSAGES.restaurantsLoading);
    setIsError(false);
    setIsLoading(true);
    try {
      const data = await restaurantApi.getRestaurants({ page: pg, size: PAGE_SIZE, menuName: menu || undefined });
      setRestaurants(data.items);
      setTotal(data.total);
      setStatus(MESSAGES.restaurantsLoaded(data.items.length));
    } catch (err) {
      const message = err instanceof Error ? err.message : MESSAGES.unknownError;
      setStatus(message);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goToPage(value: number) {
    if (value < 1) return;
    setPage(value);
    load(value, menuName);
  }

  function search(menu: string) {
    setMenuName(menu);
    setPage(1);
    load(1, menu);
  }

  async function saveRestaurantsBatch(payloads: CreateRestaurantPayload[]) {
    await restaurantApi.createRestaurants(payloads);
    await load(page, menuName);
    setStatus(MESSAGES.restaurantsAdded(payloads.length));
  }

  async function saveRestaurant(id: number, payload: UpdateRestaurantPayload) {
    await restaurantApi.updateRestaurant(id, payload);
    await load(page, menuName);
    setStatus(MESSAGES.restaurantUpdated);
  }

  async function removeRestaurant(id: number) {
    await restaurantApi.deleteRestaurants([id]);
    await load(page, menuName);
    setStatus(MESSAGES.restaurantDeleted);
  }

  return {
    restaurants,
    total,
    page,
    size: PAGE_SIZE,
    menuName,
    status,
    isError,
    isLoading,
    goToPage,
    search,
    saveRestaurantsBatch,
    saveRestaurant,
    removeRestaurant,
    reload: () => load(page, menuName),
  };
}
