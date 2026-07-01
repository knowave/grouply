package service

import (
	"grouply/backend/domains/restaurant/dto"
	"grouply/backend/domains/restaurant/entity"
	"grouply/backend/domains/restaurant/repository"
)

type RestaurantService struct {
	repository *repository.RestaurantRepository
}

func NewRestaurantService(repository *repository.RestaurantRepository) *RestaurantService {
	return &RestaurantService{repository: repository}
}

func (s *RestaurantService) GetAll(page, size int, menuName string) ([]entity.Restaurant, int64, error) {
	return s.repository.FindAll(page, size, menuName)
}

func (s *RestaurantService) CreateAll(requests []dto.CreateRestaurantRequest) error {
	restaurants := make([]*entity.Restaurant, len(requests))
	for i, req := range requests {
		restaurants[i] = entity.NewRestaurant(req.Name, req.Address, req.RecommendedMenu, req.Remark)
	}
	return s.repository.SaveAllInBatches(restaurants, 100)
}

func (s *RestaurantService) Update(id uint, name, address, recommendedMenu, remark string) (*entity.Restaurant, error) {
	restaurant, err := s.repository.FindByID(id)
	if err != nil {
		return nil, err
	}
	restaurant.Update(name, address, recommendedMenu, remark)
	if err := s.repository.Save(restaurant); err != nil {
		return nil, err
	}
	return restaurant, nil
}

func (s *RestaurantService) DeleteBatch(ids []uint) error {
	return s.repository.DeleteByIDs(ids)
}
