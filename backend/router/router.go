package router

import (
	"net/http"

	"github.com/gin-gonic/gin"

	departmentController "grouply/backend/domains/department/controller"
	noticeController "grouply/backend/domains/notice/controller"
	restaurantController "grouply/backend/domains/restaurant/controller"
	teamController "grouply/backend/domains/team/controller"
	userController "grouply/backend/domains/user/controller"
)

func NewRouter(
	teamController *teamController.TeamController,
	userController *userController.UserController,
	restaurantController *restaurantController.RestaurantController,
	departmentController *departmentController.DepartmentController,
	noticeController *noticeController.NoticeController,
) *gin.Engine {
	r := gin.Default()
	r.Use(corsMiddleware())

	v1 := r.Group("/api/v1")

	v1.POST("/groups/generate", teamController.GenerateTeams)

	v1.GET("/users", userController.GetAll)
	v1.GET("/users/:id", userController.GetByID)
	v1.GET("/users/today-birthdays", userController.GetTodayBirthdays)
	v1.POST("/users", userController.Create)
	v1.POST("/users/batch", userController.CreateBatch)
	v1.PATCH("/users/:id", userController.Update)
	v1.DELETE("/users/:id", userController.Delete)

	v1.GET("/restaurants", restaurantController.GetAll)
	v1.POST("/restaurants", restaurantController.Create)
	v1.PATCH("/restaurants/:id", restaurantController.Update)
	v1.DELETE("/restaurants", restaurantController.Delete)

	v1.GET("/departments", departmentController.GetAll)
	v1.POST("/departments", departmentController.Create)
	v1.PATCH("/departments/:id", departmentController.Update)
	v1.DELETE("/departments", departmentController.Delete)

	v1.GET("/notice-templates", noticeController.GetTemplates)
	v1.GET("/notice-templates/:code", noticeController.GetTemplate)

	v1.POST("/notices/preview", noticeController.Preview)
	v1.POST("/notices", noticeController.Create)
	v1.GET("/notices", noticeController.GetAll)
	v1.GET("/notices/:id", noticeController.GetByID)
	v1.PATCH("/notices/:id", noticeController.Update)
	v1.POST("/notices/:id/cancel", noticeController.Cancel)
	v1.POST("/notices/:id/send", noticeController.Send)

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	return r
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PATCH, DELETE")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
