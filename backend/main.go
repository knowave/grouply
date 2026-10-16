package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"

	teamController "grouply/backend/domains/team/controller"
	teamService "grouply/backend/domains/team/service"

	userController "grouply/backend/domains/user/controller"
	userRepository "grouply/backend/domains/user/repository"
	userService "grouply/backend/domains/user/service"

	configRepository "grouply/backend/domains/config/repository"
	configService "grouply/backend/domains/config/service"
	scheduler "grouply/backend/domains/scheduler"

	restaurantController "grouply/backend/domains/restaurant/controller"
	restaurantRepository "grouply/backend/domains/restaurant/repository"
	restaurantService "grouply/backend/domains/restaurant/service"

	departmentController "grouply/backend/domains/department/controller"
	departmentRepository "grouply/backend/domains/department/repository"
	departmentService "grouply/backend/domains/department/service"

	noticeController "grouply/backend/domains/notice/controller"
	noticeRepository "grouply/backend/domains/notice/repository"
	noticeService "grouply/backend/domains/notice/service"

	"grouply/backend/infrastructure"
	"grouply/backend/router"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️ .env 파일 없음, 환경변수에서 설정을 읽습니다")
	}

	db, err := infrastructure.NewDatabase(
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
	)

	if err != nil {
		log.Fatalf("DB 연결 실패: %v", err)
	}

	log.Println("✅ DB 연결 성공")

	// migration
	if err := db.AutoMigrate(); err != nil {
		log.Fatalf("migration 실패: %v", err)
	}

	log.Println("✅ migration 완료")

	teamService := teamService.NewTeamService()
	teamController := teamController.NewTeamController(teamService)

	departmentRepo := departmentRepository.NewDepartmentRepository(db.GetDB())
	departmentSvc := departmentService.NewDepartmentService(departmentRepo)
	departmentCtrl := departmentController.NewDepartmentController(departmentSvc)

	userRepository := userRepository.NewUserRepository(db.GetDB())
	userService := userService.NewUserService(userRepository, departmentSvc)
	userController := userController.NewUserController(userService)

	configRepository := configRepository.NewConfigRepository(db.GetDB())
	configService := configService.NewConfigService(configRepository)

	slackToken, err := configService.GetSlackBotToken()

	if err != nil {
		log.Println("⚠️ Slack 토큰이 없습니다. /api/configs로 등록해주세요")
		slackToken = ""
	}

	slackClient := infrastructure.NewClient(slackToken)

	// Scheduler
	birthdayScheduler := scheduler.NewBirthdayScheduler(
		userService,
		configService,
		slackClient,
	)

	if err := birthdayScheduler.Start(); err != nil {
		log.Fatalf("스케줄러 시작 실패: %v", err)
	}

	defer birthdayScheduler.Stop()

	notiToken, err := configService.GetSlackNotiBotToken()

	if err != nil {
		log.Println("⚠️ 공지용 Slack 토큰(SLACK_NOTI_BOT_TOKEN)이 없습니다. /api/configs로 등록해주세요")
		notiToken = ""
	}

	noticeSlack := infrastructure.NewClient(notiToken)
	noticeRepo := noticeRepository.NewNoticeRepository(db.GetDB())
	noticeSvc := noticeService.NewNoticeService(noticeRepo, configService, noticeSlack)
	noticeCtrl := noticeController.NewNoticeController(noticeSvc)

	noticeScheduler := scheduler.NewNoticeScheduler(noticeSvc)

	if err := noticeScheduler.Start(); err != nil {
		log.Fatalf("공지 스케줄러 시작 실패: %v", err)
	}

	defer noticeScheduler.Stop()

	restaurantRepo := restaurantRepository.NewRestaurantRepository(db.GetDB())
	restaurantSvc := restaurantService.NewRestaurantService(restaurantRepo)
	restaurantCtrl := restaurantController.NewRestaurantController(restaurantSvc)

	r := router.NewRouter(teamController, userController, restaurantCtrl, departmentCtrl, noticeCtrl)

	if err := r.Run(":8080"); err != nil {
		panic(err)
	}
}
