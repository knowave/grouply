package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	configService "grouply/backend/domains/config/service"
	"grouply/backend/domains/notice/dto"
	"grouply/backend/domains/notice/entity"
	"grouply/backend/domains/notice/repository"
	"grouply/backend/domains/notice/template"
	"grouply/backend/infrastructure"
)

var (
	ErrNotFound   = errors.New("공지를 찾을 수 없습니다")
	ErrNotPending = errors.New("대기 중(PENDING)인 공지만 처리할 수 있습니다")
)

type NoticeService struct {
	repo          *repository.NoticeRepository
	configService *configService.ConfigService
}

func NewNoticeService(repo *repository.NoticeRepository, configService *configService.ConfigService) *NoticeService {
	return &NoticeService{repo: repo, configService: configService}
}

func (s *NoticeService) Preview(req dto.NoticeRequest) (string, error) {
	return template.Render(req.TemplateCode, req.Data)
}

// render builds the plain (preview) and Slack versions together so the stored pair always matches.
func render(req dto.NoticeRequest) (string, string, error) {
	message, err := template.Render(req.TemplateCode, req.Data)
	if err != nil {
		return "", "", err
	}
	slackMessage, err := template.RenderSlack(req.TemplateCode, req.Data)
	return message, slackMessage, err
}

func parseScheduledAt(v string) (time.Time, error) {
	if v == "" {
		return time.Time{}, &template.ValidationError{Messages: []string{"scheduledAt: 필수 항목입니다"}}
	}
	// client sends KST wall-clock minutes; seconds are always 0
	t, err := time.ParseInLocation(scheduledAtLayout, v, kst)
	if err != nil || len(v) != len(scheduledAtLayout) { // Go accepts "9:05" for "15:04"; require zero-padding
		return time.Time{}, &template.ValidationError{Messages: []string{"scheduledAt: YYYY-MM-DD HH:mm 형식이어야 합니다"}}
	}
	return t, nil
}

const scheduledAtLayout = "2006-01-02 15:04"

var kst = time.FixedZone("KST", 9*60*60)

func (s *NoticeService) Create(req dto.NoticeRequest) (*entity.Notice, error) {
	scheduledAt, err := parseScheduledAt(req.ScheduledAt)
	if err != nil {
		return nil, err
	}

	message, slackMessage, err := render(req)
	if err != nil {
		return nil, err
	}

	notice := entity.NewNotice(req.TemplateCode, string(req.Data), message, scheduledAt)
	notice.SlackMessage = slackMessage

	if err := s.repo.Save(notice); err != nil {
		return nil, err
	}

	return notice, nil
}

func (s *NoticeService) GetAll(page, size int, status string) ([]entity.Notice, int64, error) {
	return s.repo.FindAll(page, size, status)
}

func (s *NoticeService) GetByID(id uint) (*entity.Notice, error) {
	return s.repo.FindByID(id)
}

func (s *NoticeService) Update(id uint, req dto.NoticeRequest) (*entity.Notice, error) {
	notice, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if !notice.IsPending() {
		return nil, ErrNotPending
	}

	scheduledAt, err := parseScheduledAt(req.ScheduledAt)
	if err != nil {
		return nil, err
	}
	message, slackMessage, err := render(req)
	if err != nil {
		return nil, err
	}

	notice.TemplateCode = req.TemplateCode
	notice.Data = string(req.Data)
	notice.Message = message
	notice.SlackMessage = slackMessage
	notice.ScheduledAt = scheduledAt
	if err := s.repo.Save(notice); err != nil {
		return nil, err
	}
	return notice, nil
}

func (s *NoticeService) Cancel(id uint) (*entity.Notice, error) {
	notice, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if !notice.IsPending() {
		return nil, ErrNotPending
	}
	notice.Status = entity.StatusCanceled
	if err := s.repo.Save(notice); err != nil {
		return nil, err
	}
	return notice, nil
}

// Send posts the notice to Slack. FAILED notices are retried by moving them back to PENDING first.
func (s *NoticeService) Send(id uint) (*entity.Notice, error) {
	notice, err := s.repo.FindByID(id)
	if err != nil {
		return nil, err
	}
	switch notice.Status {
	case entity.StatusPending:
	case entity.StatusFailed:
		notice.Status = entity.StatusPending
		if err := s.repo.Save(notice); err != nil {
			return nil, err
		}
	default:
		return nil, ErrNotPending
	}

	claimed, err := s.repo.ClaimForSend(id)
	if err != nil {
		return nil, err
	}
	if !claimed {
		return nil, ErrNotPending
	}
	notice.Status = entity.StatusProcessing

	text := notice.SlackMessage
	if text == "" { // notices saved before SlackMessage existed
		text, err = template.RenderSlack(notice.TemplateCode, json.RawMessage(notice.Data))
	}
	var ts string
	if err == nil {
		ts, err = s.post(text)
	}
	if err != nil {
		notice.Status = entity.StatusFailed
		notice.ErrorMessage = err.Error()
		if saveErr := s.repo.Save(notice); saveErr != nil {
			log.Printf("❌ 공지 %d 실패 상태 저장 실패: %v", id, saveErr)
		}
		return notice, err
	}

	now := time.Now()
	notice.Status = entity.StatusSent
	notice.SentAt = &now
	notice.SlackTs = ts
	notice.ErrorMessage = ""
	if err := s.repo.Save(notice); err != nil {
		return notice, err
	}
	return notice, nil
}

func (s *NoticeService) post(message string) (string, error) {
	// token and channel are read per send, so config changes apply without a restart
	token, err := s.configService.GetSlackNotiBotToken()
	if err != nil || token == "" {
		return "", fmt.Errorf("SLACK_NOTI_BOT_TOKEN 설정을 읽을 수 없습니다: %v", err)
	}
	channel, err := s.configService.GetSlackChannel()
	if err != nil {
		return "", fmt.Errorf("SLACK_CHANNEL 설정을 읽을 수 없습니다: %w", err)
	}
	return infrastructure.NewClient(token).PostMessage(channel, message)
}

// SendDue sends every PENDING notice whose scheduled time has passed (scheduler entry point).
func (s *NoticeService) SendDue() {
	notices, err := s.repo.FindDue(time.Now())
	if err != nil {
		log.Printf("❌ 예약 공지 조회 실패: %v", err)
		return
	}
	for _, n := range notices {
		if _, err := s.Send(n.ID); err != nil {
			log.Printf("❌ 공지 %d 발송 실패: %v", n.ID, err)
			continue
		}
		log.Printf("✅ 공지 %d 발송 완료", n.ID)
	}
}
