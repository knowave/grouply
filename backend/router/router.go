package router

import (
	"net/http"

	"github.com/gin-gonic/gin"

	teamController "grouply/backend/domains/team/controller"
	userController "grouply/backend/domains/user/controller"
)

func NewRouter(teamController *teamController.TeamController, userController *userController.UserController) *gin.Engine {
	r := gin.Default()
	r.Use(corsMiddleware())

	v1 := r.Group("/api/v1")
	v1.POST("/groups/generate", teamController.GenerateTeams)
	v1.GET("/users", userController.GetAll)
	v1.GET("/users/:id", userController.GetByID)
	v1.GET("/users/today-birthdays", userController.GetTodayBirthdays)
	v1.POST("/users", userController.Create)
	v1.POST("/users/batch", userController.CreateBatch)
	v1.PUT("/users/:id", userController.Update)
	v1.DELETE("/users/:id", userController.Delete)

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	return r
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
