package dto

type CreateRestaurantRequest struct {
	Name            string `json:"name" binding:"required"`
	Address         string `json:"address" binding:"required"`
	RecommendedMenu string `json:"recommended_menu" binding:"required"`
	Remark          string `json:"remark"`
}

type UpdateRestaurantRequest struct {
	Name            string `json:"name" binding:"required"`
	Address         string `json:"address" binding:"required"`
	RecommendedMenu string `json:"recommended_menu" binding:"required"`
	Remark          string `json:"remark"`
}

type DeleteRestaurantsRequest struct {
	IDs []uint `json:"ids" binding:"required"`
}
