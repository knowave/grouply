package controller

import (
	userService "grouply/backend/domains/user/service"
	"grouply/backend/domains/user/dto"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type UserController struct {
	userService *userService.UserService
}

func NewUserController(userService *userService.UserService) *UserController {
	return &UserController{userService: userService}
}

func (c *UserController) RegisterRoutes(r *gin.RouterGroup) {
	users := r.Group("/slack-users")
	{
		users.GET("", c.GetAll)
		users.GET("/:id", c.GetByID)
		users.GET("/today-birthdays", c.GetTodayBirthdays)
		users.POST("", c.Create)
		users.POST("/batch", c.CreateBatch)
		users.PUT("/:id", c.Update)
		users.DELETE("/:id", c.Delete)
	}
}

func (c *UserController) GetAll(ctx *gin.Context) {
	sort := ctx.DefaultQuery("sort", "birthday")
	order := ctx.DefaultQuery("order", "asc")

	users, err := c.userService.GetAll(sort, order)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "조회 실패"})
		return
	}

	ctx.JSON(http.StatusOK, users)
}

func (c *UserController) GetByID(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "잘못된 ID"})
		return
	}

	user, err := c.userService.GetByID(uint(id))
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "사용자를 찾을 수 없습니다"})
		return
	}

	ctx.JSON(http.StatusOK, user)
}

func (c *UserController) GetTodayBirthdays(ctx *gin.Context) {
	users, err := c.userService.GetTodayBirthdays()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "조회 실패"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"date":  time.Now().Format("2006-01-02"),
		"count": len(users),
		"users": users,
	})
}

func (c *UserController) Create(ctx *gin.Context) {
	var req dto.CreateSlackUserRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := c.userService.Create(req.Name, req.Email, req.SlackUserID, req.Birthday)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "생성 실패"})
		return
	}

	ctx.JSON(http.StatusCreated, user)
}

func (c *UserController) CreateBatch(ctx *gin.Context) {
	var requests []dto.CreateSlackUserRequest
	if err := ctx.ShouldBindJSON(&requests); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := c.userService.CreateAll(requests)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "일괄 생성 실패"})
		return
	}

	ctx.JSON(http.StatusCreated, gin.H{
		"message": "생성 완료",
		"count":   len(requests),
	})
}

type UpdateSlackUserRequest struct {
	Name     string    `json:"name" binding:"required"`
	Email    string    `json:"email" binding:"required"`
	Birthday time.Time `json:"birthday" binding:"required"`
}

func (c *UserController) Update(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "잘못된 ID"})
		return
	}

	var req UpdateSlackUserRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := c.userService.Update(uint(id), req.Name, req.Email, req.Birthday)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "수정 실패"})
		return
	}

	ctx.JSON(http.StatusOK, user)
}

func (c *UserController) Delete(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "잘못된 ID"})
		return
	}

	err = c.userService.Delete(uint(id))
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "삭제 실패"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "삭제 완료"})
}
