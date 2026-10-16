import type {
  Notice,
  NoticeListResponse,
  NoticePayload,
  NoticeStatus,
  TemplateDetail,
  TemplateSummary,
} from "../types/notice";

const API_BASE_URL = ""; // same-origin, /api는 nginx(배포) / vite proxy(개발)가 라우팅

export class ApiError extends Error {
  status: number;
  messages?: string[];
  notice?: Notice;

  constructor(message: string, status: number, messages?: string[], notice?: Notice) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.messages = messages;
    this.notice = notice;
  }
}

type ErrorBody = {
  error?: string;
  messages?: string[];
  notice?: Notice;
};

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    let message = `요청 실패 (${response.status})`;
    let messages: string[] | undefined;
    let notice: Notice | undefined;
    try {
      const body = (await response.json()) as ErrorBody;
      if (body.error) message = body.error;
      messages = body.messages;
      notice = body.notice;
    } catch {
      // use status-based message
    }
    throw new ApiError(message, response.status, messages, notice);
  }

  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}

export async function getNoticeTemplates(): Promise<TemplateSummary[]> {
  const body = await request<{ templates: TemplateSummary[] }>(`${API_BASE_URL}/api/v1/notice-templates`);
  return body.templates;
}

export function getNoticeTemplate(code: string): Promise<TemplateDetail> {
  return request<TemplateDetail>(`${API_BASE_URL}/api/v1/notice-templates/${encodeURIComponent(code)}`);
}

export async function previewNotice(payload: { templateCode: string; data: Record<string, string> }): Promise<string> {
  const body = await request<{ message: string }>(`${API_BASE_URL}/api/v1/notices/preview`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return body.message;
}

export function createNotice(payload: NoticePayload): Promise<Notice> {
  return request<Notice>(`${API_BASE_URL}/api/v1/notices`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getNotices(params: { page: number; size: number; status?: NoticeStatus }): Promise<NoticeListResponse> {
  const query = new URLSearchParams({ page: String(params.page), size: String(params.size) });
  if (params.status) query.set("status", params.status);
  return request<NoticeListResponse>(`${API_BASE_URL}/api/v1/notices?${query.toString()}`);
}

export function getNotice(id: number): Promise<Notice> {
  return request<Notice>(`${API_BASE_URL}/api/v1/notices/${id}`);
}

export function updateNotice(id: number, payload: NoticePayload): Promise<Notice> {
  return request<Notice>(`${API_BASE_URL}/api/v1/notices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function cancelNotice(id: number): Promise<Notice> {
  return request<Notice>(`${API_BASE_URL}/api/v1/notices/${id}/cancel`, { method: "POST" });
}

export function sendNotice(id: number): Promise<Notice> {
  return request<Notice>(`${API_BASE_URL}/api/v1/notices/${id}/send`, { method: "POST" });
}
