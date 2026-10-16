import React from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  ApiError,
  cancelNotice,
  getNotice,
  getNoticeTemplate,
  previewNotice,
  sendNotice,
  updateNotice,
} from "../api/noticeApi";
import { NoticeForm } from "../components/notice/NoticeForm";
import { NoticePreview } from "../components/notice/NoticePreview";
import { StatusBadge } from "../components/notice/StatusBadge";
import { Toast } from "../components/Toast";
import type { Notice, TemplateDetail } from "../types/notice";
import { splitFieldErrors } from "../utils/noticeErrors";
import { formatKst, isoToKstParts, toScheduledAt } from "../utils/noticeSchedule";

type ToastState = { message: string; error: boolean } | null;

function buildData(template: TemplateDetail, data: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const f of template.fields) {
    const v = (data[f.name] ?? "").trim();
    if (v || f.required) out[f.name] = v;
  }
  return out;
}

export function NoticeDetailPage() {
  const id = Number(useParams().id);
  const [notice, setNotice] = React.useState<Notice | null>(null);
  const [template, setTemplate] = React.useState<TemplateDetail | null>(null);
  const [data, setData] = React.useState<Record<string, string>>({});
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [generalErrors, setGeneralErrors] = React.useState<string[]>([]);
  const [previewMessage, setPreviewMessage] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [toast, setToast] = React.useState<ToastState>(null);
  const closeToast = React.useCallback(() => setToast(null), []);

  // 서버에서 받은 Notice로 화면 상태(폼 포함)를 맞춘다.
  const applyNotice = React.useCallback((n: Notice) => {
    const parts = isoToKstParts(n.scheduledAt);
    setNotice(n);
    setData(n.data ?? {});
    setDate(parts.date);
    setTime(parts.time);
    setPreviewMessage(null);
    setFieldErrors({});
    setGeneralErrors([]);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    getNotice(id)
      .then(async (n) => {
        const t = await getNoticeTemplate(n.templateCode);
        if (cancelled) return;
        applyNotice(n);
        setTemplate(t);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setToast({ message: err instanceof Error ? err.message : "공지를 불러오지 못했습니다", error: true });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, applyNotice]);

  React.useEffect(() => {
    if (!toast || toast.error) return;
    const timer = setTimeout(closeToast, 3000);
    return () => clearTimeout(timer);
  }, [toast, closeToast]);

  async function run(action: () => Promise<Notice>, successMessage: string) {
    setPending(true);
    setFieldErrors({});
    setGeneralErrors([]);
    try {
      applyNotice(await action());
      setToast({ message: successMessage, error: false });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const split = splitFieldErrors(err.messages, err.message, template?.fields.map((f) => f.name) ?? []);
        setFieldErrors(split.fieldErrors);
        setGeneralErrors(split.generalErrors);
      } else if (err instanceof ApiError && err.status === 409) {
        setToast({ message: err.message, error: true });
        try {
          applyNotice(await getNotice(id));
        } catch {
          // 재조회 실패는 위 토스트로 충분하다.
        }
      } else if (err instanceof ApiError && err.status === 502 && err.notice) {
        applyNotice(err.notice);
        setToast({ message: `Slack 발송 실패: ${err.notice.errorMessage ?? err.message}`, error: true });
      } else {
        setToast({ message: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다", error: true });
      }
    } finally {
      setPending(false);
    }
  }

  function confirmThen(text: string, action: () => Promise<Notice>, successMessage: string) {
    if (window.confirm(text)) void run(action, successMessage);
  }

  function handleUpdate() {
    if (!template || !notice) return;
    if (!date || !time) {
      setFieldErrors({ scheduledAt: "필수 항목입니다" });
      return;
    }
    void run(
      () =>
        updateNotice(notice.id, {
          templateCode: notice.templateCode,
          scheduledAt: toScheduledAt(date, time),
          data: buildData(template, data),
        }),
      "수정했습니다",
    );
  }

  async function handlePreview() {
    if (!template || !notice) return;
    setPending(true);
    try {
      setPreviewMessage(await previewNotice({ templateCode: template.code, data: buildData(template, data) }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const split = splitFieldErrors(err.messages, err.message, template.fields.map((f) => f.name));
        setFieldErrors(split.fieldErrors);
        setGeneralErrors(split.generalErrors);
      } else {
        setToast({ message: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다", error: true });
      }
    } finally {
      setPending(false);
    }
  }

  const status = notice?.status;
  const editable = status === "PENDING";
  const btn = "h-10 rounded-md border border-black/10 px-4 text-sm font-semibold hover:bg-black/[0.03] disabled:opacity-50";
  const primaryBtn = "h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50";

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-ink">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Grouply</p>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold tracking-tight sm:text-4xl">
              공지 #{id}
              {notice && <StatusBadge status={notice.status} />}
            </h1>
          </div>
          <Link
            to="/notices"
            className="inline-flex h-10 items-center gap-2 self-start rounded-md border border-black/10 px-4 text-sm font-semibold hover:bg-black/[0.03]"
          >
            <ArrowLeft size={15} />
            목록
          </Link>
        </header>

        {loading ? (
          <p className="text-sm text-black/50">불러오는 중...</p>
        ) : notFound ? (
          <p className="text-sm text-red-600">
            공지를 찾을 수 없습니다.{" "}
            <Link to="/notices" className="underline">
              목록으로
            </Link>
          </p>
        ) : notice && template ? (
          <>
            <dl className="grid gap-2 rounded-md border border-black/10 bg-white p-4 text-sm shadow-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-black/50">템플릿</dt>
                <dd className="font-semibold">{template.name}</dd>
              </div>
              <div>
                <dt className="text-black/50">예약 일시</dt>
                <dd className="font-semibold">{formatKst(notice.scheduledAt)}</dd>
              </div>
              <div>
                <dt className="text-black/50">발송 일시</dt>
                <dd className="font-semibold">{formatKst(notice.sentAt)}</dd>
              </div>
              <div>
                <dt className="text-black/50">생성 일시</dt>
                <dd className="font-semibold">{formatKst(notice.createdAt)}</dd>
              </div>
            </dl>

            {status === "FAILED" && notice.errorMessage && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {notice.errorMessage}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-4 rounded-md border border-black/10 bg-white p-4 shadow-sm">
                {generalErrors.length > 0 && (
                  <ul className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {generalErrors.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                )}
                <NoticeForm
                  fields={template.fields}
                  data={data}
                  onDataChange={setData}
                  scheduledDate={date}
                  scheduledTime={time}
                  onScheduleChange={(d, t) => {
                    setDate(d);
                    setTime(t);
                  }}
                  fieldErrors={fieldErrors}
                  disabled={!editable || pending}
                />
                <div className="flex flex-wrap gap-2">
                  {editable && (
                    <>
                      <button type="button" disabled={pending} onClick={handlePreview} className={btn}>
                        미리보기
                      </button>
                      <button type="button" disabled={pending} onClick={handleUpdate} className={primaryBtn}>
                        수정 저장
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => confirmThen("이 공지를 취소할까요?", () => cancelNotice(notice.id), "취소했습니다")}
                        className={btn}
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          confirmThen("지금 Slack으로 발송합니다. 계속할까요?", () => sendNotice(notice.id), "발송했습니다")
                        }
                        className={btn}
                      >
                        즉시 발송
                      </button>
                    </>
                  )}
                  {status === "FAILED" && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        confirmThen("지금 Slack으로 발송합니다. 계속할까요?", () => sendNotice(notice.id), "발송했습니다")
                      }
                      className={primaryBtn}
                    >
                      재발송
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
                <h2 className="mb-3 text-lg font-bold">미리보기</h2>
                <NoticePreview message={previewMessage ?? notice.message} data={previewMessage !== null ? buildData(template, data) : notice.data} />
              </div>
            </div>
          </>
        ) : null}
      </section>
      {toast?.error && <Toast message={toast.message} onClose={closeToast} />}
      {toast && !toast.error && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-md bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast.message}
        </div>
      )}
    </main>
  );
}
