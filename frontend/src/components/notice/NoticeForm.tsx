import type { TemplateField } from "../../types/notice";
import { effectiveSendLabel } from "../../utils/noticeSchedule";
import { MarkdownEditor } from "./MarkdownEditor";

type Props = {
  fields: TemplateField[];
  data: Record<string, string>;
  onDataChange: (data: Record<string, string>) => void;
  scheduledDate: string;
  scheduledTime: string;
  onScheduleChange: (date: string, time: string) => void;
  fieldErrors: Record<string, string>;
  disabled?: boolean;
};

const SCHEDULE_LABEL = "발송 예약 일시";
const inputClass =
  "w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-brand disabled:bg-black/5";

function ErrorText({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs text-red-600">
      {message}
    </p>
  );
}

export function NoticeForm({
  fields,
  data,
  onDataChange,
  scheduledDate,
  scheduledTime,
  onScheduleChange,
  fieldErrors,
  disabled,
}: Props) {
  const set = (name: string, value: string) =>
    onDataChange({ ...data, [name]: value });
  const sendLabel =
    scheduledDate && scheduledTime
      ? effectiveSendLabel(scheduledDate, scheduledTime)
      : null;

  return (
    <div className="space-y-4">
      {fields.map((f) => {
        const id = `notice-field-${f.name}`;
        const common = {
          id,
          value: data[f.name] ?? "",
          disabled,
          required: f.required,
          className: inputClass,
          "aria-invalid": !!fieldErrors[f.name],
          "aria-describedby": fieldErrors[f.name] ? `${id}-error` : undefined,
          onChange: (
            e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
          ) => set(f.name, e.target.value),
        };
        return (
          <div key={f.name}>
            <label htmlFor={id} className="mb-1 block text-sm font-medium">
              {f.label}
              {f.required && <span className="ml-0.5 text-red-600">*</span>}
            </label>
            {f.type === "markdown" ? (
              <MarkdownEditor
                id={id}
                value={data[f.name] ?? ""}
                onChange={(v) => set(f.name, v)}
                disabled={disabled}
                invalid={!!fieldErrors[f.name]}
                describedBy={fieldErrors[f.name] ? `${id}-error` : undefined}
              />
            ) : (
              <input
                {...common}
                type={f.type === "text" ? "text" : f.type}
                placeholder={f.type === "url" ? "https://" : undefined}
                step={f.type === "time" ? 60 : undefined}
              />
            )}
            <ErrorText id={`${id}-error`} message={fieldErrors[f.name]} />
          </div>
        );
      })}

      <div>
        <span className="mb-1 block text-sm font-medium">
          {SCHEDULE_LABEL}
          <span className="ml-0.5 text-red-600">*</span>
        </span>
        <div className="flex gap-2">
          <input
            id="notice-scheduled-date"
            type="date"
            aria-label="예약 날짜"
            value={scheduledDate}
            disabled={disabled}
            required
            className={inputClass}
            onChange={(e) => onScheduleChange(e.target.value, scheduledTime)}
          />
          <input
            id="notice-scheduled-time"
            type="time"
            step={60}
            aria-label="예약 시간"
            value={scheduledTime}
            disabled={disabled}
            required
            className={inputClass}
            onChange={(e) => onScheduleChange(scheduledDate, e.target.value)}
          />
        </div>
        <ErrorText id="notice-scheduled-error" message={fieldErrors.scheduledAt} />
        {sendLabel && !disabled && (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            예약 발송은 평일 08:00~19:00에만 동작합니다. 실제 발송 예정: {sendLabel}
          </div>
        )}
      </div>
    </div>
  );
}
