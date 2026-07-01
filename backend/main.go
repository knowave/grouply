package main

import (
	teamController "grouply/backend/domains/team/controller"
	teamService "grouply/backend/domains/team/service"
	"log"

	userController "grouply/backend/domains/user/controller"
	userRepository "grouply/backend/domains/user/repository"
	userService "grouply/backend/domains/user/service"

	ConfigRepository "grouply/backend/domains/config/repository"
	configService "grouply/backend/domains/config/service"
	scheduler "grouply/backend/domains/scheduler"

	"grouply/backend/infrastructure"
	"grouply/backend/router"
)

func main() {
	db, err := infrastructure.NewDatabase(
		"localhost",
		"3306",
		"root",
		"root",
		"birthday_bot",
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

	userRepository := userRepository.NewUserRepository(db.GetDB())
	userService := userService.NewUserService(userRepository)
	userController := userController.NewUserController(userService)

	configRepository := ConfigRepository.NewConfigRepository(db.GetDB())
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

	r := router.NewRouter(teamController, userController)

	if err := r.Run(":8080"); err != nil {
		panic(err)
	}
}
