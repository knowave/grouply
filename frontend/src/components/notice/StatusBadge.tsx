import type { NoticeStatus } from "../../types/notice";

export const STATUS_LABELS: Record<NoticeStatus, string> = {
  PENDING: "대기",
  PROCESSING: "발송 중",
  SENT: "발송 완료",
  FAILED: "실패",
  CANCELED: "취소됨",
};

const STATUS_STYLES: Record<NoticeStatus, string> = {
  PENDING: "bg-blue-50 text-blue-700",
  PROCESSING: "bg-amber-50 text-amber-700",
  SENT: "bg-green-50 text-green-700",
  FAILED: "bg-red-50 text-red-700",
  CANCELED: "bg-gray-100 text-gray-600",
};

export function StatusBadge({ status }: { status: NoticeStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
