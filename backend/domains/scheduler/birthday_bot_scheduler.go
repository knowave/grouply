package scheduler

import (
	"log"
	"time"

	configService "grouply/backend/domains/config/service"
	userService "grouply/backend/domains/user/service"
	"grouply/backend/infrastructure"

	"github.com/robfig/cron/v3"
)

type BirthdayBotScheduler struct {
	cron             *cron.Cron
	slackUserService *userService.UserService
	configService    *configService.ConfigService
	slackClient      *infrastructure.Client
}

func NewBirthdayScheduler(
	slackUserService *userService.UserService,
	configService *configService.ConfigService,
	slackClient *infrastructure.Client,
) *BirthdayBotScheduler {
	// 한국 시간대 설정
	loc, _ := time.LoadLocation("Asia/Seoul")
	c := cron.New(cron.WithLocation(loc))

	return &BirthdayBotScheduler{
		cron:             c,
		slackUserService: slackUserService,
		configService:    configService,
		slackClient:      slackClient,
	}
}

func (s *BirthdayBotScheduler) Start() error {
	// 매일 오전 10시
	_, err := s.cron.AddFunc("0 10 * * *", s.sendBirthdayNotification)
	if err != nil {
		return err
	}

	s.cron.Start()
	log.Println("⏰ 스케줄러 시작: 매일 오전 10시에 생일 알림")
	return nil
}

func (s *BirthdayBotScheduler) Stop() {
	s.cron.Stop()
	log.Println("⏰ 스케줄러 중지")
}

func (s *BirthdayBotScheduler) sendBirthdayNotification() {
	log.Println("🔍 오늘의 생일자 조회 중...")

	users, err := s.slackUserService.GetTodayBirthdays()
	if err != nil {
		log.Printf("❌ 생일자 조회 실패: %v", err)
		return
	}

	if len(users) == 0 {
		log.Println("📅 오늘 생일자가 없습니다")
		return
	}

	channel, err := s.configService.GetSlackChannel()
	if err != nil {
		log.Printf("❌ 채널 조회 실패: %v", err)
		return
	}

	birthdayUsers := make([]infrastructure.BirthdayUser, len(users))
	for i, u := range users {
		birthdayUsers[i] = infrastructure.BirthdayUser{
			Name:        u.Name,
			SlackUserID: u.SlackUserID,
		}
	}

	// 알림 전송
	err = s.slackClient.SendMultipleBirthdayNotification(channel, birthdayUsers)
	if err != nil {
		log.Printf("❌ 알림 전송 실패: %v", err)
		return
	}

	log.Printf("✅ %d명의 생일 알림 전송 완료!", len(users))
}
