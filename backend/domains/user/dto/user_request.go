package dto

import "time"

type CreateSlackUserRequest struct {
	Name        string    `json:"name" binding:"required"`
	Email       string    `json:"email" binding:"required"`
	SlackUserID string    `json:"slack_user_id" binding:"required"`
	Birthday    time.Time `json:"birthday" binding:"required"`
}