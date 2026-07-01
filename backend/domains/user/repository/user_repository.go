package repository

import (
	"grouply/backend/domains/user/entity"
	"time"

	"gorm.io/gorm"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) FindByID(id uint) (*entity.SlackUser, error) {
	var slackUser entity.SlackUser
	err := r.db.First(&slackUser, id).Error

	if err != nil {
		return nil, err
	}

	return &slackUser, err
}

func (r *UserRepository) FindByEmail(email string) (*entity.SlackUser, error) {
	var slackUser entity.SlackUser
	err := r.db.Where("email = ?", email).First(&slackUser).Error

	if err != nil {
		return nil, err
	}

	return &slackUser, err
}

func (r *UserRepository) FindByBirthday(month time.Month, day int) ([]entity.SlackUser, error) {
	var slackUsers []entity.SlackUser
	err := r.db.Where("MONTH(birthday) = ? AND DAY(birthday) = ?", month, day).Find(&slackUsers).Error

	if err != nil {
		return nil, err
	}

	return slackUsers, nil
}

func (r *UserRepository) FindAll(sort, order string) ([]entity.SlackUser, error) {
	var users []entity.SlackUser
	err := r.db.Order(slackUserOrderClause(sort, order)).Find(&users).Error

	if err != nil {
		return nil, err
	}

	return users, nil
}

func slackUserOrderClause(sort, order string) string {
	direction := "ASC"
	if order == "desc" {
		direction = "DESC"
	}

	switch sort {
	case "name":
		return "name " + direction
	default:
		return "MONTH(birthday) " + direction + ", DAY(birthday) " + direction + ", birthday " + direction
	}
}

func (r *UserRepository) Save(user *entity.SlackUser) error {
	return r.db.Save(user).Error
}

func (r *UserRepository) SaveAllInBatches(slackUsers []*entity.SlackUser, batchSize int) error {
	if len(slackUsers) == 0 {
		return nil
	}

	if batchSize <= 0 {
		batchSize = 100
	}

	return r.db.CreateInBatches(slackUsers, batchSize).Error
}

func (r *UserRepository) Delete(id uint) error {
	return r.db.Delete(&entity.SlackUser{}, id).Error
}
