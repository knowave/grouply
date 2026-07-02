package dto

import "time"

type CreateUserRequest struct {
	Name         string    `json:"name" binding:"required"`
	Email        string    `json:"email" binding:"required"`
	SlackUserID  string    `json:"slack_user_id" binding:"required"`
	Birthday     time.Time `json:"birthday" binding:"required"`
	DepartmentID *uint     `json:"department_id" binding:"required"`
}

type UserResponse struct {
	ID             uint      `json:"id"`
	Name           string    `json:"name"`
	Email          string    `json:"email"`
	SlackUserID    string    `json:"slack_user_id"`
	Birthday       time.Time `json:"birthday"`
	DepartmentID   *uint     `json:"department_id"`
	DepartmentName *string   `json:"department_name"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}
