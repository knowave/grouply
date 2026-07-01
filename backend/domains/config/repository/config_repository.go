package repository

import (
	"grouply/backend/domains/config/entity"

	"gorm.io/gorm"
)

type ConfigRepository struct {
	db *gorm.DB
}

func NewConfigRepository(db *gorm.DB) *ConfigRepository {
	return &ConfigRepository{db: db}
}

func (r *ConfigRepository) FindByKey(key string) (*entity.Config, error) {
	var config entity.Config
	err := r.db.Where("`key` = ?", key).First(&config).Error

	if err != nil {
		return nil, err
	}

	return &config, nil
}

func (r *ConfigRepository) Save(config *entity.Config) error {
	return r.db.Save(config).Error
}
