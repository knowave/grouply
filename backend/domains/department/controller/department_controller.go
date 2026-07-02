package controller

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"grouply/backend/domains/department/dto"
	departmentService "grouply/backend/domains/department/service"
)

type DepartmentController struct {
	departmentService *departmentService.DepartmentService
}

func NewDepartmentController(departmentService *departmentService.DepartmentService) *DepartmentController {
	return &DepartmentController{departmentService: departmentService}
}

func (c *DepartmentController) GetAll(ctx *gin.Context) {
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

	name := ctx.Query("name")

	departments, total, err := c.departmentService.GetAll(page, size, name)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "조회 실패"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"items": departments,
		"total": total,
		"page":  page,
		"size":  size,
	})
}

func (c *DepartmentController) Create(ctx *gin.Context) {
	var requests []dto.CreateDepartmentRequest
	if err := ctx.ShouldBindJSON(&requests); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := c.departmentService.CreateAll(requests); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "생성 실패"})
		return
	}

	ctx.JSON(http.StatusCreated, gin.H{
		"message": "생성 완료",
		"count":   len(requests),
	})
}

func (c *DepartmentController) Update(ctx *gin.Context) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "잘못된 ID"})
		return
	}

	var req dto.UpdateDepartmentRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	department, err := c.departmentService.Update(uint(id), req.Name, req.Description)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "수정 실패"})
		return
	}

	ctx.JSON(http.StatusOK, department)
}

func (c *DepartmentController) Delete(ctx *gin.Context) {
	var req dto.DeleteDepartmentsRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := c.departmentService.DeleteBatch(req.IDs); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "삭제 실패"})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "삭제 완료",
		"count":   len(req.IDs),
	})
}
