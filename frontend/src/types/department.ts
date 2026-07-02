// 백엔드 department 엔티티는 응답 DTO 없이 그대로 반환되어 PascalCase 필드를 사용한다.
// (user 응답은 snake_case DTO를 거치므로 다름 — types/user.ts 참고)
export type Department = {
  ID: number;
  Name: string;
  Description: string;
  CreatedAt: string;
  UpdatedAt: string;
};

export type CreateDepartmentPayload = {
  name: string;
  description?: string;
};

export type UpdateDepartmentPayload = {
  name: string;
  description?: string;
};
