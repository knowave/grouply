import React from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, createNotice, getNoticeTemplate, getNoticeTemplates, previewNotice } from "../api/noticeApi";
import { NoticeForm } from "../components/notice/NoticeForm";
import { NoticePreview } from "../components/notice/NoticePreview";
import { Toast } from "../components/Toast";
import type { TemplateDetail, TemplateSummary } from "../types/notice";
import { splitFieldErrors } from "../utils/noticeErrors";
import { toScheduledAt } from "../utils/noticeSchedule";

// 템플릿 필드에 정의된 키만 보내고, 비어 있는 선택 값은 생략한다.
function buildData(template: TemplateDetail, data: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const f of template.fields) {
    const v = (data[f.name] ?? "").trim();
    if (v || f.required) out[f.name] = v;
  }
  return out;
}

export function NoticeNewPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = React.useState<TemplateSummary[]>([]);
  const [template, setTemplate] = React.useState<TemplateDetail | null>(null);
  const [data, setData] = React.useState<Record<string, string>>({});
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [generalErrors, setGeneralErrors] = React.useState<string[]>([]);
  const [previewMessage, setPreviewMessage] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [toast, setToast] = React.useState("");
  const closeToast = React.useCallback(() => setToast(""), []);

  React.useEffect(() => {
    getNoticeTemplates()
      .then(setTemplates)
      .catch((err) => setToast(err instanceof Error ? err.message : "템플릿을 불러오지 못했습니다"));
  }, []);

  function clearErrors() {
    setFieldErrors({});
    setGeneralErrors([]);
  }

  async function selectTemplate(code: string) {
    if (!code) {
      setTemplate(null);
      return;
    }
    setPending(true);
    try {
      setTemplate(await getNoticeTemplate(code));
      setData({});
      setPreviewMessage(null);
      clearErrors();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "템플릿을 불러오지 못했습니다");
    } finally {
      setPending(false);
    }
  }

  function handleError(err: unknown) {
    if (err instanceof ApiError && err.status === 400) {
      const split = splitFieldErrors(err.messages, err.message, template?.fields.map((f) => f.name) ?? []);
      setFieldErrors(split.fieldErrors);
      setGeneralErrors(split.generalErrors);
      return;
    }
    setToast(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다");
  }

  async function handlePreview() {
    if (!template) return;
    setPending(true);
    clearErrors();
    try {
      setPreviewMessage(await previewNotice({ templateCode: template.code, data: buildData(template, data) }));
    } catch (err) {
      handleError(err);
    } finally {
      setPending(false);
    }
  }

  async function handleSave() {
    if (!template) return;
    clearErrors();
    if (!date || !time) {
      setFieldErrors({ scheduledAt: "필수 항목입니다" });
      return;
    }
    setPending(true);
    try {
      const notice = await createNotice({
        templateCode: template.code,
        scheduledAt: toScheduledAt(date, time),
        data: buildData(template, data),
      });
      navigate(`/notices/${notice.id}`);
    } catch (err) {
      handleError(err);
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-ink">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Grouply</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">새 공지</h1>
          </div>
          <Link
            to="/notices"
            className="inline-flex h-10 items-center gap-2 self-start rounded-md border border-black/10 px-4 text-sm font-semibold hover:bg-black/[0.03]"
          >
            <ArrowLeft size={15} />
            목록
          </Link>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-md border border-black/10 bg-white p-4 shadow-sm">
            {generalErrors.length > 0 && (
              <ul className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {generalErrors.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            )}
            <label className="flex flex-col gap-1 text-sm font-semibold">
              템플릿
              <select
                className="h-10 rounded-md border border-black/10 px-3 text-sm font-normal outline-none focus:border-brand"
                value={template?.code ?? ""}
                disabled={pending}
                onChange={(e) => selectTemplate(e.target.value)}
              >
                <option value="">템플릿을 선택하세요</option>
                {templates.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            {template && (
              <>
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
                  disabled={pending}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={handlePreview}
                    className="h-10 rounded-md border border-black/10 px-4 text-sm font-semibold hover:bg-black/[0.03] disabled:opacity-50"
                  >
                    미리보기
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={handleSave}
                    className="h-10 rounded-md bg-brand px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    저장
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-bold">미리보기</h2>
            {previewMessage !== null ? (
              <NoticePreview message={previewMessage} data={template ? buildData(template, data) : {}} />
            ) : (
              <p className="text-sm text-black/50">[미리보기] 버튼을 눌러 확인하세요.</p>
            )}
          </div>
        </div>
      </section>
      {toast && <Toast message={toast} onClose={closeToast} />}
    </main>
  );
}
