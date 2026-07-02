import React from "react";
import { ArrowLeft, Plus, Shuffle, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import * as restaurantApi from "../api/restaurantApi";
import { MESSAGES } from "../constants/messages";
import { useRestaurants } from "../hooks/useRestaurants";
import type { Restaurant } from "../types/restaurant";

type Row = {
  name: string;
  address: string;
  recommendedMenu: string;
  remark: string;
};

function emptyRow(): Row {
  return { name: "", address: "", recommendedMenu: "", remark: "" };
}

const ADD_COLUMNS = [
  { label: MESSAGES.colStoreName, required: true },
  { label: MESSAGES.colAddress, required: true },
  { label: MESSAGES.colRecommendedMenu, required: true },
  { label: MESSAGES.colRemark, required: false },
  { label: MESSAGES.deleteButton, required: false },
];

const LIST_COLUMNS = [
  { label: MESSAGES.colStoreName, required: true },
  { label: MESSAGES.colAddress, required: true },
  { label: MESSAGES.colRecommendedMenu, required: true },
  { label: MESSAGES.colRemark, required: false },
  { label: MESSAGES.colActions, required: false },
];

export function RestaurantsPage() {
  const restaurants = useRestaurants();
  const [localStatus, setLocalStatus] = React.useState<{ msg: string; isError: boolean } | null>(null);
  const [rows, setRows] = React.useState<Row[]>([emptyRow()]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [menuQuery, setMenuQuery] = React.useState("");
  const [recommended, setRecommended] = React.useState<Restaurant | null>(null);
  const [isRecommending, setIsRecommending] = React.useState(false);

  function setStatus(msg: string, isError: boolean) {
    setLocalStatus({ msg, isError });
  }

  const displayStatus = localStatus ?? { msg: restaurants.status, isError: restaurants.isError };
  const totalPages = Math.max(1, Math.ceil(restaurants.total / restaurants.size));

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function updateRow(index: number, field: keyof Row, value: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function removeRow(index: number) {
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [emptyRow()] : next;
    });
  }

  async function handleSave() {
    const filled = rows.filter((r) => r.name.trim() || r.address.trim() || r.recommendedMenu.trim() || r.remark.trim());
    if (filled.length === 0) {
      setStatus(MESSAGES.noRestaurantsToAdd, true);
      return;
    }
    if (filled.some((r) => !r.name.trim() || !r.address.trim() || !r.recommendedMenu.trim())) {
      setStatus(MESSAGES.fillRestaurantFields, true);
      return;
    }

    setIsSaving(true);
    setLocalStatus(null);
    try {
      await restaurants.saveRestaurantsBatch(
        filled.map((r) => ({
          name: r.name.trim(),
          address: r.address.trim(),
          recommended_menu: r.recommendedMenu.trim(),
          remark: r.remark.trim() || undefined,
        })),
      );
      setRows([emptyRow()]);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : MESSAGES.unknownError, true);
    } finally {
      setIsSaving(false);
    }
  }

  function handleSearch() {
    restaurants.search(menuQuery.trim());
  }

  async function handleRecommend() {
    setIsRecommending(true);
    setLocalStatus(null);
    try {
      // 전체 후보(현재 메뉴 검색 조건 적용)에서 랜덤으로 하나 뽑는다.
      // ponytail: 식당이 1000곳을 넘는 조직은 없다고 가정.
      const data = await restaurantApi.getRestaurants({ page: 1, size: 1000, menuName: menuQuery.trim() || undefined });
      if (data.items.length === 0) {
        setRecommended(null);
        setStatus(MESSAGES.recommendEmpty, true);
        return;
      }
      setRecommended(data.items[Math.floor(Math.random() * data.items.length)]);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : MESSAGES.unknownError, true);
    } finally {
      setIsRecommending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-ink">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Grouply</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {MESSAGES.restaurantsPageTitle}
            </h1>
            <p className={`mt-2 text-sm ${displayStatus.isError ? "text-red-600" : "text-black/50"}`}>
              {displayStatus.msg}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-black/10 px-4 text-sm font-semibold hover:bg-black/[0.03]"
            >
              <ArrowLeft size={15} />
              {MESSAGES.backToUsersButton}
            </Link>
          </div>
        </header>

        <section className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-bold">{MESSAGES.recommendResultTitle}</h2>
          <div className="flex flex-wrap gap-2">
            <input
              className="h-10 flex-1 min-w-[200px] rounded-md border border-black/10 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
              value={menuQuery}
              placeholder={MESSAGES.menuSearchPlaceholder}
              onChange={(e) => setMenuQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#265d61] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isRecommending}
              onClick={handleRecommend}
            >
              <Shuffle size={16} />
              {MESSAGES.recommendButton}
            </button>
          </div>

          {recommended && (
            <div className="mt-4 rounded-md border border-brand/30 bg-brand/5 p-4">
              <p className="text-lg font-bold">{recommended.Name}</p>
              <p className="mt-1 text-sm text-black/70">{recommended.Address}</p>
              <p className="mt-1 text-sm font-semibold text-brand">{recommended.RecommendedMenu}</p>
              {recommended.Remark && <p className="mt-1 text-sm text-black/50">{recommended.Remark}</p>}
            </div>
          )}
        </section>

        <section className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-bold">{MESSAGES.addRestaurantsTitle}</h2>
          <div className="mb-3 flex gap-2">
            <button
              className="inline-flex h-9 items-center gap-1 rounded-md border border-black/10 px-3 text-sm font-semibold hover:bg-black/[0.03]"
              onClick={addRow}
            >
              <Plus size={15} />
              {MESSAGES.addRowButton}
            </button>
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#265d61] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={handleSave}
            >
              {MESSAGES.saveBatchButton}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-sm">
              <thead>
                <tr>
                  {ADD_COLUMNS.map((col) => (
                    <th key={col.label} className="border-b border-black/10 bg-[#f9fafb] px-3 py-2 text-left text-xs font-semibold text-black/60">
                      {col.label}
                      {col.required && <span className="text-red-500"> *</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index}>
                    <td className="border-b border-black/5 px-2 py-1.5">
                      <input
                        className="h-9 w-full rounded-md border border-black/10 px-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                        value={row.name}
                        placeholder={MESSAGES.colStoreName}
                        onChange={(e) => updateRow(index, "name", e.target.value)}
                      />
                    </td>
                    <td className="border-b border-black/5 px-2 py-1.5">
                      <input
                        className="h-9 w-full rounded-md border border-black/10 px-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                        value={row.address}
                        placeholder={MESSAGES.colAddress}
                        onChange={(e) => updateRow(index, "address", e.target.value)}
                      />
                    </td>
                    <td className="border-b border-black/5 px-2 py-1.5">
                      <input
                        className="h-9 w-full rounded-md border border-black/10 px-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                        value={row.recommendedMenu}
                        placeholder={MESSAGES.colRecommendedMenu}
                        onChange={(e) => updateRow(index, "recommendedMenu", e.target.value)}
                      />
                    </td>
                    <td className="border-b border-black/5 px-2 py-1.5">
                      <input
                        className="h-9 w-full rounded-md border border-black/10 px-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                        value={row.remark}
                        placeholder={MESSAGES.colRemark}
                        onChange={(e) => updateRow(index, "remark", e.target.value)}
                      />
                    </td>
                    <td className="border-b border-black/5 px-2 py-1.5">
                      <button
                        className="inline-flex h-9 items-center gap-1 rounded-md border border-red-200 px-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                        onClick={() => removeRow(index)}
                      >
                        <Trash2 size={14} />
                        {MESSAGES.deleteRowButton}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-bold">{MESSAGES.restaurantListTitle}</h2>
          {restaurants.restaurants.length === 0 ? (
            <div className="flex min-h-24 items-center justify-center rounded-md border border-dashed border-black/20 bg-[#f9fafb] text-sm text-black/50">
              {MESSAGES.restaurantsEmpty}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-sm">
                <thead>
                  <tr>
                    {LIST_COLUMNS.map((col) => (
                      <th key={col.label} className="border-b border-black/10 bg-[#f9fafb] px-3 py-2 text-left text-xs font-semibold text-black/60">
                        {col.label}
                        {col.required && <span className="text-red-500"> *</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {restaurants.restaurants.map((restaurant) => (
                    <RestaurantRow
                      key={restaurant.ID}
                      restaurant={restaurant}
                      onUpdate={restaurants.saveRestaurant}
                      onDelete={restaurants.removeRestaurant}
                      globalSetStatus={setStatus}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 flex items-center justify-end gap-3 text-sm">
            <span className="text-black/50">
              {MESSAGES.restaurantPageInfo(restaurants.page, restaurants.total, restaurants.size)}
            </span>
            <div className="flex gap-2">
              <button
                className="inline-flex h-8 items-center rounded-md border border-black/10 px-3 text-xs font-semibold hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={restaurants.page <= 1}
                onClick={() => restaurants.goToPage(restaurants.page - 1)}
              >
                {MESSAGES.prevPage}
              </button>
              <button
                className="inline-flex h-8 items-center rounded-md border border-black/10 px-3 text-xs font-semibold hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={restaurants.page >= totalPages}
                onClick={() => restaurants.goToPage(restaurants.page + 1)}
              >
                {MESSAGES.nextPage}
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

type RestaurantRowProps = {
  restaurant: Restaurant;
  onUpdate: (id: number, payload: { name: string; address: string; recommended_menu: string; remark?: string }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  globalSetStatus: (msg: string, isError: boolean) => void;
};

function RestaurantRow({ restaurant, onUpdate, onDelete, globalSetStatus }: RestaurantRowProps) {
  const [name, setName] = React.useState(restaurant.Name);
  const [address, setAddress] = React.useState(restaurant.Address);
  const [recommendedMenu, setRecommendedMenu] = React.useState(restaurant.RecommendedMenu);
  const [remark, setRemark] = React.useState(restaurant.Remark);
  const [isBusy, setIsBusy] = React.useState(false);
  const lastSaved = React.useRef({
    name: restaurant.Name,
    address: restaurant.Address,
    recommendedMenu: restaurant.RecommendedMenu,
    remark: restaurant.Remark,
  });

  async function handleFieldBlur(next: { name: string; address: string; recommendedMenu: string; remark: string }) {
    const current = {
      name: next.name.trim(),
      address: next.address.trim(),
      recommendedMenu: next.recommendedMenu.trim(),
      remark: next.remark.trim(),
    };
    if (JSON.stringify(current) === JSON.stringify(lastSaved.current)) return;
    if (!current.name || !current.address || !current.recommendedMenu) {
      globalSetStatus(MESSAGES.fillRestaurantUpdateFields, true);
      return;
    }
    setIsBusy(true);
    try {
      await onUpdate(restaurant.ID, {
        name: current.name,
        address: current.address,
        recommended_menu: current.recommendedMenu,
        remark: current.remark || undefined,
      });
      lastSaved.current = current;
    } catch (err) {
      globalSetStatus(err instanceof Error ? err.message : MESSAGES.unknownError, true);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(MESSAGES.confirmDeleteRestaurant(restaurant.Name))) return;
    setIsBusy(true);
    try {
      await onDelete(restaurant.ID);
    } catch (err) {
      globalSetStatus(err instanceof Error ? err.message : MESSAGES.unknownError, true);
      setIsBusy(false);
    }
  }

  const inputClass =
    "h-9 w-full rounded-md border border-black/10 px-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";

  return (
    <tr className="hover:bg-[#fafafa]">
      <td className="border-b border-black/5 px-2 py-1.5">
        <input
          className={inputClass}
          value={name}
          disabled={isBusy}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => handleFieldBlur({ name, address, recommendedMenu, remark })}
        />
      </td>
      <td className="border-b border-black/5 px-2 py-1.5">
        <input
          className={inputClass}
          value={address}
          disabled={isBusy}
          onChange={(e) => setAddress(e.target.value)}
          onBlur={() => handleFieldBlur({ name, address, recommendedMenu, remark })}
        />
      </td>
      <td className="border-b border-black/5 px-2 py-1.5">
        <input
          className={inputClass}
          value={recommendedMenu}
          disabled={isBusy}
          onChange={(e) => setRecommendedMenu(e.target.value)}
          onBlur={() => handleFieldBlur({ name, address, recommendedMenu, remark })}
        />
      </td>
      <td className="border-b border-black/5 px-2 py-1.5">
        <input
          className={inputClass}
          value={remark}
          disabled={isBusy}
          onChange={(e) => setRemark(e.target.value)}
          onBlur={() => handleFieldBlur({ name, address, recommendedMenu, remark })}
        />
      </td>
      <td className="border-b border-black/5 px-2 py-1.5">
        <button
          className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isBusy}
          onClick={handleDelete}
        >
          {MESSAGES.deleteButton}
        </button>
      </td>
    </tr>
  );
}
