package dto

type CreateDepartmentRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

type UpdateDepartmentRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

type DeleteDepartmentsRequest struct {
	IDs []uint `json:"ids" binding:"required"`
}
