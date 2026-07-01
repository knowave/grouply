export type SlackUser = {
  ID: number;
  Name: string;
  Email: string;
  SlackUserID: string;
  Birthday: string;
  CreatedAt: string;
  UpdatedAt: string;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  slack_user_id: string;
  birthday: string;
};

export type UpdateUserPayload = {
  name: string;
  email: string;
  birthday: string;
};
