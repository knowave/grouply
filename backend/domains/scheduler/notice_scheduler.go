package scheduler

import (
	"log"
	"time"

	noticeService "grouply/backend/domains/notice/service"

	"github.com/robfig/cron/v3"
)

type NoticeScheduler struct {
	cron          *cron.Cron
	noticeService *noticeService.NoticeService
}

func NewNoticeScheduler(noticeService *noticeService.NoticeService) *NoticeScheduler {
	loc, _ := time.LoadLocation("Asia/Seoul")
	return &NoticeScheduler{
		cron:          cron.New(cron.WithLocation(loc)),
		noticeService: noticeService,
	}
}

func (s *NoticeScheduler) Start() error {
	// 평일(월~금) 08:00 ~ 19:00(포함), 매분. 19:00 정각은 별도 스펙으로 포함한다.
	for _, spec := range []string{"* 8-18 * * 1-5", "0 19 * * 1-5"} {
		if _, err := s.cron.AddFunc(spec, s.noticeService.SendDue); err != nil {
			return err
		}
	}
	s.cron.Start()
	log.Println("⏰ 공지 스케줄러 시작: 평일 08:00~19:00 매분, 예약 시각이 지난 공지 발송")
	return nil
}

func (s *NoticeScheduler) Stop() {
	s.cron.Stop()
}
