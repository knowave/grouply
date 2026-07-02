// 백엔드 restaurant 엔티티는 응답 DTO 없이 그대로 반환되어 PascalCase 필드를 사용한다.
// (user 응답은 snake_case DTO를 거치므로 다름 — types/user.ts 참고)
export type Restaurant = {
  ID: number;
  Name: string;
  Address: string;
  RecommendedMenu: string;
  Remark: string;
  CreatedAt: string;
  UpdatedAt: string;
};

export type CreateRestaurantPayload = {
  name: string;
  address: string;
  recommended_menu: string;
  remark?: string;
};

export type UpdateRestaurantPayload = CreateRestaurantPayload;
