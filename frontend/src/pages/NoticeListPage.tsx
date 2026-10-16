import React from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getNotices } from "../api/noticeApi";
import { StatusBadge, STATUS_LABELS } from "../components/notice/StatusBadge";
import { NOTICE_STATUSES } from "../types/notice";
import type { Notice, NoticeStatus } from "../types/notice";
import { formatKst } from "../utils/noticeSchedule";

const SIZE = 10;

function noticeTitle(n: Notice): string {
  const d = n.data ?? {};
  return d.title || d.eventName || d.trainingName || n.message.split("\n")[0] || "-";
}

export function NoticeListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const statusParam = params.get("status");
  const status = NOTICE_STATUSES.find((s) => s === statusParam) as NoticeStatus | undefined;

  const [items, setItems] = React.useState<Notice[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    getNotices({ page, size: SIZE, status })
      .then((res) => {
        if (cancelled) return;
        setError("");
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "공지 목록을 불러오지 못했습니다");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, status]);

  const totalPages = Math.max(1, Math.ceil(total / SIZE));

  function update(nextPage: number, nextStatus: NoticeStatus | undefined) {
    const next = new URLSearchParams();
    if (nextPage > 1) next.set("page", String(nextPage));
    if (nextStatus) next.set("status", nextStatus);
    setParams(next);
  }

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-ink">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Grouply</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">공지</h1>
            <p className="mt-2 text-sm text-black/50">총 {total}건</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-black/10 px-4 text-sm font-semibold hover:bg-black/[0.03]"
            >
              <ArrowLeft size={15} />
              돌아가기
            </Link>
            <Link
              to="/notices/new"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:opacity-90"
            >
              <Plus size={15} />
              새 공지
            </Link>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-semibold" htmlFor="notice-status">
            상태
          </label>
          <select
            id="notice-status"
            className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm outline-none focus:border-brand"
            value={status ?? ""}
            onChange={(e) => update(1, (e.target.value || undefined) as NoticeStatus | undefined)}
          >
            <option value="">전체</option>
            {NOTICE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-md border border-black/10 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-black/10 bg-black/[0.02] text-xs uppercase text-black/50">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">템플릿</th>
                <th className="px-4 py-3">제목</th>
                <th className="px-4 py-3">예약 일시</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">발송 일시</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-black/50">
                    불러오는 중...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-black/50">
                    공지가 없습니다
                  </td>
                </tr>
              ) : (
                items.map((n) => (
                  <tr
                    key={n.id}
                    className="cursor-pointer border-b border-black/5 last:border-0 hover:bg-black/[0.02]"
                    onClick={() => navigate(`/notices/${n.id}`)}
                  >
                    <td className="px-4 py-3">{n.id}</td>
                    <td className="px-4 py-3">{n.templateCode}</td>
                    <td className="px-4 py-3 font-medium">{noticeTitle(n)}</td>
                    <td className="px-4 py-3">{formatKst(n.scheduledAt)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={n.status} />
                    </td>
                    <td className="px-4 py-3">{formatKst(n.sentAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => update(page - 1, status)}
            className="h-9 rounded-md border border-black/10 px-3 font-semibold disabled:opacity-40"
          >
            이전
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => update(page + 1, status)}
            className="h-9 rounded-md border border-black/10 px-3 font-semibold disabled:opacity-40"
          >
            다음
          </button>
        </div>
      </section>
    </main>
  );
}
