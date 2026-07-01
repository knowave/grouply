package controller

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"grouply/backend/domains/restaurant/dto"
	restaurantService "grouply/backend/domains/restaurant/service"
)

type RestaurantController struct {
	restaurantService *restaurantService.RestaurantService
}

func NewRestaurantController(restaurantService *restaurantService.RestaurantService) *RestaurantController {
	return &RestaurantController{restaurantService: restaurantService}
}

func (c *RestaurantController) GetAll(ctx *gin.Context) {
	page, err := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "잘못된 page 값"})
		return
	}

	size, err := strconv.Atoi(ctx.DefaultQuery("size", "10"))
	if err != nil || size < 1 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "잘못된 size 값"})
		return
	}

	menuName := ctx.Query("menuName")

	restaurants, total, err := c.restaurantService.GetAll(page, size, menuName)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "조회 실패"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"items": restaurants,
		"total": total,
		"page":  page,
		"size":  size,
	})
}

func (c *RestaurantController) Create(ctx *gin.Context) {
	var requests []dto.CreateRestaurantRequest
	if err := ctx.ShouldBindJSON(&requests); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := c.restaurantService.CreateAll(requests); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "생성 실패"})
		return
	}

	ctx.JSON(http.StatusCreated, gin.H{
		"message": "생성 완료",
		"count":   len(requests),
	})
}

func (c *RestaurantController) Update(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "잘못된 ID"})
		return
	}

	var req dto.UpdateRestaurantRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	restaurant, err := c.restaurantService.Update(uint(id), req.Name, req.Address, req.RecommendedMenu, req.Remark)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "수정 실패"})
		return
	}

	ctx.JSON(http.StatusOK, restaurant)
}

func (c *RestaurantController) Delete(ctx *gin.Context) {
	var req dto.DeleteRestaurantsRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := c.restaurantService.DeleteBatch(req.IDs); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "삭제 실패"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "삭제 완료",
		"count":   len(req.IDs),
	})
}
