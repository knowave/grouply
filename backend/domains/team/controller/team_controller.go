package controller

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"grouply/backend/domains/team/dto"
	"grouply/backend/domains/team/service"
)

type TeamController struct {
	teamService *service.TeamService
}

type errorResponse struct {
	Message string `json:"message"`
	Error   string `json:"error"`
}

func NewTeamController(teamService *service.TeamService) *TeamController {
	return &TeamController{teamService: teamService}
}

func (c *TeamController) GenerateTeams(ctx *gin.Context) {
	var req dto.GenerateTeamRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, newErrorResponse("요청 형식이 올바르지 않습니다."))
		return
	}

	result, err := c.teamService.GenerateTeams(req)
	if err != nil {
		ctx.JSON(statusFromError(err), newErrorResponse(err.Error()))
		return
	}

	ctx.JSON(http.StatusOK, result)
}

func newErrorResponse(message string) errorResponse {
	return errorResponse{Message: message, Error: message}
}

func statusFromError(err error) int {
	var appErr *service.AppError
	if !errors.As(err, &appErr) {
		return http.StatusInternalServerError
	}
	switch appErr.Kind {
	case service.ErrorKindValidation:
		return http.StatusBadRequest
	case service.ErrorKindUnprocessable:
		return http.StatusUnprocessableEntity
	default:
		return http.StatusInternalServerError
	}
}
