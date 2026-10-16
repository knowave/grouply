package dto

import (
	"encoding/json"
	"time"

	"grouply/backend/domains/notice/entity"
	"grouply/backend/domains/notice/template"
)

// preview, create and update share this request; scheduledAt is ignored by preview
type NoticeRequest struct {
	TemplateCode template.Code   `json:"templateCode" binding:"required"`
	ScheduledAt  string          `json:"scheduledAt"`
	Data         json.RawMessage `json:"data"` // shape per templateCode: template.TownHallData, CompanyEventData, TrainingData, GeneralData
}

type NoticeResponse struct {
	ID           uint            `json:"id"`
	TemplateCode template.Code   `json:"templateCode"`
	Data         json.RawMessage `json:"data"`
	Message      string          `json:"message"`
	ScheduledAt  time.Time       `json:"scheduledAt"`
	Status       string          `json:"status"`
	SentAt       *time.Time      `json:"sentAt"`
	ErrorMessage string          `json:"errorMessage,omitempty"`
	CreatedAt    time.Time       `json:"createdAt"`
	UpdatedAt    time.Time       `json:"updatedAt"`
}

func ToNoticeResponse(n *entity.Notice) NoticeResponse {
	return NoticeResponse{
		ID:           n.ID,
		TemplateCode: n.TemplateCode,
		Data:         json.RawMessage(n.Data),
		Message:      n.Message,
		ScheduledAt:  n.ScheduledAt,
		Status:       n.Status,
		SentAt:       n.SentAt,
		ErrorMessage: n.ErrorMessage,
		CreatedAt:    n.CreatedAt,
		UpdatedAt:    n.UpdatedAt,
	}
}
