package controller

import (
	"errors"
	"net/http"
	"strconv"

	"grouply/backend/domains/notice/dto"
	noticeService "grouply/backend/domains/notice/service"
	"grouply/backend/domains/notice/template"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type NoticeController struct {
	noticeService *noticeService.NoticeService
}

func NewNoticeController(noticeService *noticeService.NoticeService) *NoticeController {
	return &NoticeController{noticeService: noticeService}
}

// fail maps service errors to HTTP responses.
func fail(ctx *gin.Context, err error) {
	var ve *template.ValidationError

	switch {
	case errors.As(err, &ve):
		ctx.JSON(http.StatusBadRequest, gin.H{"error": ve.Error(), "messages": ve.Messages})
	case errors.Is(err, template.ErrUnknownTemplate):
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "messages": []string{err.Error()}})
	case errors.Is(err, noticeService.ErrNotFound), errors.Is(err, gorm.ErrRecordNotFound):
		ctx.JSON(http.StatusNotFound, gin.H{"error": noticeService.ErrNotFound.Error()})
	case errors.Is(err, noticeService.ErrNotPending):
		ctx.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	default:
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "처리 실패"})
	}
}

func parseID(ctx *gin.Context) (uint, bool) {
	id, err := strconv.ParseUint(ctx.Param("id"), 10, 32)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "잘못된 ID"})
		return 0, false
	}
	return uint(id), true
}

func (c *NoticeController) GetTemplates(ctx *gin.Context) {
	type item struct {
		Code template.Code `json:"code"`
		Name string        `json:"name"`
	}
	items := []item{}
	for _, t := range template.All() {
		items = append(items, item{t.Code, t.Name})
	}
	ctx.JSON(http.StatusOK, gin.H{"templates": items})
}

func (c *NoticeController) GetTemplate(ctx *gin.Context) {
	t, ok := template.Get(template.Code(ctx.Param("code")))
	if !ok {
		ctx.JSON(http.StatusNotFound, gin.H{"error": template.ErrUnknownTemplate.Error()})
		return
	}
	ctx.JSON(http.StatusOK, t)
}

func (c *NoticeController) Preview(ctx *gin.Context) {
	var req dto.NoticeRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	msg, err := c.noticeService.Preview(req)
	if err != nil {
		fail(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"message": msg})
}

func (c *NoticeController) Create(ctx *gin.Context) {
	var req dto.NoticeRequest

	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	n, err := c.noticeService.Create(req)

	if err != nil {
		fail(ctx, err)
		return
	}

	ctx.JSON(http.StatusCreated, dto.ToNoticeResponse(n))
}

func (c *NoticeController) GetAll(ctx *gin.Context) {
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

	notices, total, err := c.noticeService.GetAll(page, size, ctx.Query("status"))
	if err != nil {
		fail(ctx, err)
		return
	}
	items := make([]dto.NoticeResponse, len(notices))
	for i := range notices {
		items[i] = dto.ToNoticeResponse(&notices[i])
	}
	ctx.JSON(http.StatusOK, gin.H{"items": items, "total": total, "page": page, "size": size})
}

func (c *NoticeController) GetByID(ctx *gin.Context) {
	id, ok := parseID(ctx)
	if !ok {
		return
	}
	n, err := c.noticeService.GetByID(id)
	if err != nil {
		fail(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, dto.ToNoticeResponse(n))
}

func (c *NoticeController) Update(ctx *gin.Context) {
	id, ok := parseID(ctx)
	if !ok {
		return
	}
	var req dto.NoticeRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	n, err := c.noticeService.Update(id, req)
	if err != nil {
		fail(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, dto.ToNoticeResponse(n))
}

func (c *NoticeController) Cancel(ctx *gin.Context) {
	id, ok := parseID(ctx)
	if !ok {
		return
	}
	n, err := c.noticeService.Cancel(id)
	if err != nil {
		fail(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, dto.ToNoticeResponse(n))
}

func (c *NoticeController) Send(ctx *gin.Context) {
	id, ok := parseID(ctx)
	if !ok {
		return
	}
	n, err := c.noticeService.Send(id)
	if err != nil {
		// n != nil with an error means the notice was marked FAILED (Slack/config failure)
		if n != nil && n.Status == "FAILED" {
			ctx.JSON(http.StatusBadGateway, gin.H{"error": "Slack 발송 실패", "notice": dto.ToNoticeResponse(n)})
			return
		}
		fail(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, dto.ToNoticeResponse(n))
}
