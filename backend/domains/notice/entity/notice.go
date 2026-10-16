package entity

import (
	"time"

	"grouply/backend/domains/notice/template"
)

const (
	StatusPending    = "PENDING"
	StatusProcessing = "PROCESSING"
	StatusSent       = "SENT"
	StatusFailed     = "FAILED"
	StatusCanceled   = "CANCELED"
)

type Notice struct {
	ID           uint          `gorm:"primaryKey" json:"id"`
	TemplateCode template.Code `gorm:"size:30;not null" json:"template_code"`
	Data         string        `gorm:"type:json;not null" json:"-"`       // raw JSON object of input fields
	Message      string        `gorm:"type:text;not null" json:"message"` // rendered plain text (preview)
	ScheduledAt  time.Time     `gorm:"not null;index" json:"scheduled_at"`
	Status       string        `gorm:"size:20;not null;index" json:"status"`
	SentAt       *time.Time    `json:"sent_at"`
	SlackTs      string        `gorm:"size:50" json:"slack_ts"`
	SlackMessage string        `gorm:"type:text" json:"-"` // rendered Slack mrkdwn actually posted; snapshot at create/update
	ErrorMessage string        `gorm:"type:text" json:"error_message"`
	CreatedAt    time.Time     `json:"created_at"`
	UpdatedAt    time.Time     `json:"updated_at"`
}

func NewNotice(templateCode template.Code, data, message string, scheduledAt time.Time) *Notice {
	return &Notice{
		TemplateCode: templateCode,
		Data:         data,
		Message:      message,
		ScheduledAt:  scheduledAt,
		Status:       StatusPending,
	}
}

func (n *Notice) IsPending() bool {
	return n.Status == StatusPending
}
