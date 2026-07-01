package repository

import (
	"grouply/backend/domains/restaurant/entity"

	"gorm.io/gorm"
)

type RestaurantRepository struct {
	db *gorm.DB
}

func NewRestaurantRepository(db *gorm.DB) *RestaurantRepository {
	return &RestaurantRepository{db: db}
}

func (r *RestaurantRepository) FindAll(page, size int, menuName string) ([]entity.Restaurant, int64, error) {
	var restaurants []entity.Restaurant
	var total int64

	query := r.db.Model(&entity.Restaurant{})
	if menuName != "" {
		query = query.Where("recommended_menu LIKE ?", "%"+menuName+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * size
	err := query.Order("created_at ASC").Offset(offset).Limit(size).Find(&restaurants).Error
	if err != nil {
		return nil, 0, err
	}

	return restaurants, total, nil
}

func (r *RestaurantRepository) FindByID(id uint) (*entity.Restaurant, error) {
	var restaurant entity.Restaurant
	err := r.db.First(&restaurant, id).Error
	if err != nil {
		return nil, err
	}
	return &restaurant, nil
}

func (r *RestaurantRepository) SaveAllInBatches(restaurants []*entity.Restaurant, batchSize int) error {
	if len(restaurants) == 0 {
		return nil
	}
	if batchSize <= 0 {
		batchSize = 100
	}
	return r.db.CreateInBatches(restaurants, batchSize).Error
}

func (r *RestaurantRepository) Save(restaurant *entity.Restaurant) error {
	return r.db.Save(restaurant).Error
}

func (r *RestaurantRepository) DeleteByIDs(ids []uint) error {
	return r.db.Delete(&entity.Restaurant{}, ids).Error
}
