import type { GenerateGroupRequest, GenerateGroupResponse } from "../types/group";
import { MESSAGES } from "../constants/messages";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
const GROUP_GENERATE_ENDPOINT = `${API_BASE_URL}/api/v1/groups/generate`;

type ErrorBody = {
  message?: string;
  error?: string;
};

export async function generateGroups(request: GenerateGroupRequest): Promise<GenerateGroupResponse> {
  const response = await fetch(GROUP_GENERATE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const data = await response.json();

  if (!response.ok) {
    const errorBody = data as ErrorBody;
    throw new Error(errorBody.message ?? errorBody.error ?? MESSAGES.requestError);
  }

  return data as GenerateGroupResponse;
}
