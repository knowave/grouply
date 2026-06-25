package main

import (
	"grouply/backend/domains/team/controller"
	"grouply/backend/domains/team/service"
	"grouply/backend/router"
)

func main() {
	teamService := service.NewTeamService()
	teamController := controller.NewTeamController(teamService)
	r := router.NewRouter(teamController)

	if err := r.Run(":8080"); err != nil {
		panic(err)
	}
}
