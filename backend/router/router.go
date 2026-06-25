package router

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"

	"grouply/backend/domains/team/controller"
)

func NewRouter(teamController *controller.TeamController) *gin.Engine {
	r := gin.Default()
	r.Use(corsMiddleware())

	v1 := r.Group("/api/v1")
	v1.POST("/groups/generate", teamController.GenerateTeams)

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	return r
}

func corsMiddleware() gin.HandlerFunc {
	allowedOrigins := allowedCORSOrigins()

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if allowedOrigins[origin] {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func allowedCORSOrigins() map[string]bool {
	origins := os.Getenv("CORS_ALLOWED_ORIGINS")
	if origins == "" {
		origins = "http://localhost:5173,http://localhost:1212"
	}

	allowed := map[string]bool{}
	for _, origin := range strings.Split(origins, ",") {
		trimmed := strings.TrimSpace(origin)
		if trimmed != "" {
			allowed[trimmed] = true
		}
	}
	return allowed
}
