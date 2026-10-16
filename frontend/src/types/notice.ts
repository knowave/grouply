import type { Paginated } from "./pagination";

export type NoticeStatus = "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "CANCELED";

export const NOTICE_STATUSES: NoticeStatus[] = ["PENDING", "PROCESSING", "SENT", "FAILED", "CANCELED"];

export type FieldType = "text" | "markdown" | "date" | "time" | "url";

export type TemplateSummary = { code: string; name: string };

export type TemplateField = { name: string; label: string; type: FieldType; required: boolean };

export type TemplateDetail = TemplateSummary & { fields: TemplateField[] };

export type Notice = {
  id: number;
  templateCode: string;
  data: Record<string, string>;
  message: string;
  scheduledAt: string;
  status: NoticeStatus;
  sentAt: string | null;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type NoticePayload = {
  templateCode: string;
  scheduledAt: string;
  data: Record<string, string>;
};

export type NoticeListResponse = Paginated<Notice>;
