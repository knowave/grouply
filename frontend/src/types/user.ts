export type SlackUser = {
  id: number;
  name: string;
  email: string;
  slack_user_id: string;
  birthday: string;
  department_id: number | null;
  department_name: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  slack_user_id: string;
  birthday: string;
  department_id?: number | null;
};

export type UpdateUserPayload = {
  name: string;
  email: string;
  birthday: string;
  department_id?: number | null;
};
